import { createSupabaseAdminClient } from "../../../lib/supabase/admin";
import { computeStatus, reminderMessage, reminderSubject } from "../../../lib/breedIntervals";
import { sendReminderMessage, sendEmail } from "../../../lib/messaging";
import { localHour } from "../../../lib/localTime";

// How many days must pass before we re-send a reminder for the same dog,
// so people aren't texted every single day while overdue.
const REMINDER_COOLDOWN_DAYS = 5;

// If this whole job throws (bad query, provider outage, a bug), the entire
// reminder system silently stops with nobody noticing until a customer
// complains. This alert is the difference between "found out in 2 minutes
// from an email" and "found out in 2 weeks from a churned customer."
async function alertOps(subject, detail) {
  const to = process.env.OPS_ALERT_EMAIL || process.env.FEEDBACK_TO_EMAIL || process.env.REMINDER_FROM_EMAIL;
  if (!to) {
    console.error("[cron] no OPS_ALERT_EMAIL configured - alert not sent:", subject, detail);
    return;
  }
  try {
    await sendEmail(to, `[PawDue alert] ${subject}`, detail);
  } catch (err) {
    console.error("[cron] failed to send ops alert email:", err.message);
  }
}

export default async function handler(req, res) {
  // Vercel Cron calls this with an Authorization header matching CRON_SECRET.
  const auth = req.headers.authorization;
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const supabase = createSupabaseAdminClient();
  const now = new Date();

  // Optional per-timezone sending. When REMINDER_SEND_HOUR is set (0-23),
  // this job is meant to run HOURLY, and a dog's reminder only goes out
  // during the hour that is that local hour for its groomer's timezone -
  // so "9" means 9 AM for everyone, wherever they are. When it's not set,
  // every run sends to every due dog (the original once-a-day behavior).
  // ?force=1 skips the hour check, for manual testing with curl.
  const rawSendHour = process.env.REMINDER_SEND_HOUR;
  const parsedSendHour = rawSendHour ? Number(rawSendHour) : null;
  const sendHourValid = Number.isInteger(parsedSendHour) && parsedSendHour >= 0 && parsedSendHour <= 23;
  const gateByHour = sendHourValid && req.query.force !== "1";

  try {
    // Service-role client bypasses RLS on purpose here - this job needs to
    // see every groomer's dogs, not just one user's. Archived dogs are
    // excluded entirely - they're a soft-deleted record, not an active client.
    const { data: dogs, error } = await supabase.from("dogs").select("*").eq("is_archived", false);
    if (error) throw new Error(`Fetching dogs failed: ${error.message}`);

    // "Priority message delivery" (Starter/Pro) means paid customers' dogs
    // are actually sent first in this batch, not just a marketing phrase -
    // useful if a provider is rate-limiting or the batch runs long enough
    // that later sends land noticeably later in the day.
    const { data: subs } = await supabase.from("subscriptions").select("user_id, plan, status");
    const planByUser = new Map(
      (subs || []).filter((s) => s.status === "active").map((s) => [s.user_id, s.plan])
    );
    const isPriority = (dog) => {
      const plan = planByUser.get(dog.user_id) || "free";
      return plan === "starter" || plan === "pro";
    };
    dogs.sort((a, b) => Number(isPriority(b)) - Number(isPriority(a)));

    // Each groomer's own local day decides "is this dog due yet", not the
    // server's timezone - a groomer in Mumbai and one in Chicago shouldn't
    // have their dogs flip to "overdue" at the same UTC instant.
    const { data: settingsRows } = await supabase.from("business_settings").select("user_id, timezone");
    const timezoneByUser = new Map((settingsRows || []).map((s) => [s.user_id, s.timezone]));

    // Dogs with an already-confirmed, still-upcoming booking should NOT get a
    // "you're overdue!" reminder - they already booked. Fetch this once up
    // front rather than querying per-dog in the loop.
    const { data: upcomingBookings } = await supabase
      .from("bookings")
      .select("dog_id")
      .eq("status", "confirmed")
      .gte("slot_at", now.toISOString());
    const dogIdsWithUpcomingBooking = new Set((upcomingBookings || []).map((b) => b.dog_id));

    const results = {
      sent: 0,
      skipped: 0,
      failed: 0,
      notSendHour: 0,
      mode: gateByHour ? `hourly (sending at ${parsedSendHour}:00 local time)` : "send to all due dogs",
      details: [],
    };
    if (rawSendHour && !sendHourValid) {
      results.warning = `REMINDER_SEND_HOUR="${rawSendHour}" is not a whole number from 0 to 23 - ignoring it.`;
    }

    for (const dog of dogs) {
      if (dog.opted_out) {
        results.skipped++;
        continue;
      }

      if (dogIdsWithUpcomingBooking.has(dog.id)) {
        results.skipped++;
        continue;
      }

      const timezone = timezoneByUser.get(dog.user_id) || "UTC";

      if (gateByHour && localHour(now, timezone) !== parsedSendHour) {
        results.notSendHour++;
        continue;
      }

      const comp = computeStatus(dog, now, timezone);

      if (comp.status === "ok") {
        results.skipped++;
        continue;
      }

      if (dog.last_reminder_sent_at) {
        const daysSinceLastReminder = (now - new Date(dog.last_reminder_sent_at)) / (1000 * 60 * 60 * 24);
        if (daysSinceLastReminder < REMINDER_COOLDOWN_DAYS) {
          results.skipped++;
          continue;
        }
      }

      const body = reminderMessage(dog, comp);
      const subject = reminderSubject(dog, comp);

      try {
        const channel = await sendReminderMessage(dog, body, subject);
        await supabase
          .from("dogs")
          .update({
            last_reminder_sent_at: now.toISOString(),
            last_reminder_stage: comp.status,
            last_reminder_channel: channel,
            last_reminder_result: "sent",
          })
          .eq("id", dog.id);
        results.sent++;
        results.details.push({ dogId: dog.id, dogName: dog.dog_name, channel, status: comp.status });
      } catch (err) {
        await supabase
          .from("dogs")
          .update({ last_reminder_sent_at: now.toISOString(), last_reminder_result: "failed" })
          .eq("id", dog.id);
        results.failed++;
        results.details.push({ dogId: dog.id, dogName: dog.dog_name, error: err.message });
      }
    }

    // A batch that ran but failed for most/all dogs is just as much of a
    // problem as one that crashed outright (e.g. Resend key revoked) - flag
    // it the same way rather than only alerting on a hard crash.
    if (results.sent === 0 && results.failed > 0) {
      await alertOps(
        "Every reminder send failed",
        `${results.failed} dog(s) failed, 0 sent. Check RESEND_API_KEY / provider status.\n\n${JSON.stringify(results.details, null, 2)}`
      );
    }

    return res.status(200).json(results);
  } catch (err) {
    console.error("[cron] send-reminders crashed:", err);
    await alertOps("Reminder cron crashed", `${err.message}\n\n${err.stack || ""}`);
    return res.status(500).json({ error: err.message });
  }
}
