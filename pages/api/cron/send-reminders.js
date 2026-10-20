import { createSupabaseAdminClient } from "../../../lib/supabase/admin";
import { computeStatus } from "../../../lib/breedIntervals";
import { buildReminderEmail, groupByOwner } from "../../../lib/reminderEmail";
import { sendReminderMessage, sendEmail } from "../../../lib/messaging";
import { localHour } from "../../../lib/localTime";

// How many days must pass before we re-send a reminder for the same dog,
// so people aren't texted every single day while overdue.
const REMINDER_COOLDOWN_DAYS = 5;

// Reminders go out any time in the first N local hours after REMINDER_SEND_HOUR.
const SEND_WINDOW_HOURS = 6;

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
  // ?dryRun=1 sends nothing and writes nothing. It shows, per groomer, what
  // timezone the job sees, what local hour it is for them right now, and which
  // dogs would be emailed. Use it to answer "why did nobody get an email?".
  const dryRun = req.query.dryRun === "1";

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
    let { data: settingsRows, error: settingsError } = await supabase
      .from("business_settings")
      .select("user_id, timezone, business_name, business_phone, reply_to_email");
    if (settingsError) {
      // Migration not run yet: still honor each groomer's timezone.
      ({ data: settingsRows } = await supabase.from("business_settings").select("user_id, timezone"));
    }
    const timezoneByUser = new Map((settingsRows || []).map((s) => [s.user_id, s.timezone]));
    const profileByUser = new Map((settingsRows || []).map((s) => [s.user_id, s]));

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
      skipReasons: { optedOut: 0, alreadyBooked: 0, notDueYet: 0, cooldown: 0 },
      serverTimeUtc: now.toISOString(),
      sendHour: sendHourValid ? parsedSendHour : null,
      sendWindowHours: SEND_WINDOW_HOURS,
      dryRun,
      groomers: {},
      mode: gateByHour ? `hourly (sending at ${parsedSendHour}:00 local time)` : "send to all due dogs",
      details: [],
    };
    if (rawSendHour && !sendHourValid) {
      results.warning = `REMINDER_SEND_HOUR="${rawSendHour}" is not a whole number from 0 to 23 - ignoring it.`;
    }

    const dueEntries = [];
    for (const dog of dogs) {
      if (dog.opted_out) {
        results.skipReasons.optedOut++;
        results.skipped++;
        continue;
      }

      if (dogIdsWithUpcomingBooking.has(dog.id)) {
        results.skipReasons.alreadyBooked++;
        results.skipped++;
        continue;
      }

      const timezone = timezoneByUser.get(dog.user_id) || "UTC";
      if (!results.groomers[dog.user_id]) {
        const lh = localHour(now, timezone);
        results.groomers[dog.user_id] = {
          timezone,
          timezoneSaved: timezoneByUser.has(dog.user_id),
          localHourNow: lh,
          inSendWindow: sendHourValid ? (lh - parsedSendHour + 24) % 24 < SEND_WINDOW_HOURS : true,
        };
      }

      // Send during a window that starts at the send hour (not only inside that
      // exact hour), because GitHub's scheduler can run late. The 5-day cooldown
      // below stops a dog from being emailed twice.
      const hoursPastSendHour = (localHour(now, timezone) - parsedSendHour + 24) % 24;
      if (gateByHour && hoursPastSendHour >= SEND_WINDOW_HOURS) {
        results.notSendHour++;
        continue;
      }

      const comp = computeStatus(dog, now, timezone);

      if (comp.status === "ok") {
        results.skipReasons.notDueYet++;
        results.skipped++;
        continue;
      }

      if (dog.last_reminder_sent_at) {
        const daysSinceLastReminder = (now - new Date(dog.last_reminder_sent_at)) / (1000 * 60 * 60 * 24);
        if (daysSinceLastReminder < REMINDER_COOLDOWN_DAYS) {
          results.skipReasons.cooldown++;
          results.skipped++;
          continue;
        }
      }

      dueEntries.push({ dog, comp });
    }

    if (dryRun) {
      results.wouldSend = groupByOwner(dueEntries).map((g) => ({
        dogs: g.map((x) => x.dog.dog_name),
        status: g.map((x) => x.comp.status),
        hasEmail: !!g[0].dog.owner_email,
        timezone: timezoneByUser.get(g[0].dog.user_id) || "UTC",
      }));
      return res.status(200).json(results);
    }

    // One message per owner: a client with three dogs gets one email listing
    // all three, not three emails in a row.
    for (const group of groupByOwner(dueEntries)) {
      const first = group[0].dog;
      const profile = profileByUser.get(first.user_id) || {};
      const business = { name: profile.business_name, phone: profile.business_phone };
      const email = buildReminderEmail({ items: group, business });
      const names = group.map((g) => g.dog.dog_name).join(" and ");
      const whatsappParams = [first.owner_name, names, business.name || "your groomer", group[0].dog.booking_token
        ? `${process.env.NEXT_PUBLIC_APP_URL || ""}/book/${group[0].dog.booking_token}`
        : process.env.NEXT_PUBLIC_APP_URL || ""];

      try {
        const channel = await sendReminderMessage(first, email.text, email.subject, {
          email: { html: email.html, replyTo: profile.reply_to_email || undefined, fromName: business.name },
          whatsappParams,
        });
        for (const { dog, comp } of group) {
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
          results.details.push({ dogId: dog.id, dogName: dog.dog_name, channel, status: comp.status, groupedWith: group.length - 1 });
        }
      } catch (err) {
        for (const { dog } of group) {
          await supabase
            .from("dogs")
            .update({ last_reminder_sent_at: now.toISOString(), last_reminder_result: "failed" })
            .eq("id", dog.id);
          results.failed++;
          results.details.push({ dogId: dog.id, dogName: dog.dog_name, error: err.message });
        }
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
