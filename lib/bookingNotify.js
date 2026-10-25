// Sends the emails around a booking. Never throws: a failed email must not
// undo or block a booking that is already saved.

import { sendEmail } from "./messaging";
import {
  buildGroomerBookingEmail,
  buildCustomerBookingEmail,
  buildCancelEmail,
  buildEventIcs,
} from "./bookingEmail";

function appUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || "https://pawdue.pet").replace(/\/$/, "");
}

async function loadContext(admin, userId) {
  const [{ data: profile }, { data: avail }, userRes] = await Promise.all([
    admin
      .from("business_settings")
      .select("business_name, business_phone, reply_to_email, timezone, calendar_token")
      .eq("user_id", userId)
      .maybeSingle(),
    admin.from("availability_settings").select("slot_minutes").eq("user_id", userId).maybeSingle(),
    admin.auth.admin.getUserById(userId).catch(() => ({ data: null })),
  ]);
  return {
    salon: (profile?.business_name || "").trim(),
    phone: (profile?.business_phone || "").trim(),
    replyTo: profile?.reply_to_email || undefined,
    timeZone: profile?.timezone || "UTC",
    hasFeed: !!profile?.calendar_token,
    minutes: avail?.slot_minutes || 60,
    groomerEmail: userRes?.data?.user?.email || null,
  };
}

/** dog: { dog_name, owner_name, owner_email, phone, breed }; booking: { id, slot_at } */
export async function notifyBookingCreated(admin, { userId, dog, booking }) {
  const results = { groomer: "skipped", customer: "skipped" };
  try {
    const ctx = await loadContext(admin, userId);
    const summary = `Groom: ${dog.dog_name}`;
    const ics = buildEventIcs({
      id: booking.id,
      slotIso: booking.slot_at,
      minutes: ctx.minutes,
      summary: ctx.salon ? `${dog.dog_name}'s groom at ${ctx.salon}` : `${dog.dog_name}'s groom`,
      description: ctx.phone ? `Questions? Call ${ctx.phone}` : "",
    });
    const groomerIcs = buildEventIcs({
      id: booking.id,
      slotIso: booking.slot_at,
      minutes: ctx.minutes,
      summary,
      description: [dog.owner_name && `Owner: ${dog.owner_name}`, dog.phone && `Phone: ${dog.phone}`, dog.breed && `Breed: ${dog.breed}`]
        .filter(Boolean)
        .join("\n"),
    });

    const jobs = [];
    if (ctx.groomerEmail) {
      const m = buildGroomerBookingEmail({
        dog,
        slotIso: booking.slot_at,
        timeZone: ctx.timeZone,
        dashboardUrl: `${appUrl()}/dashboard`,
      });
      jobs.push(
        sendEmail(ctx.groomerEmail, m.subject, m.text, {
          html: m.html,
          fromName: "PawDue",
          // Skip the file if they already get bookings through the calendar
          // feed, so the same appointment does not show up twice.
          attachments: ctx.hasFeed ? [] : [{ filename: "booking.ics", content: groomerIcs, contentType: "text/calendar" }],
        })
          .then(() => (results.groomer = "sent"))
          .catch((e) => {
            results.groomer = "failed";
            console.error("booking email to groomer failed:", e.message);
          })
      );
    }
    if (dog.owner_email) {
      const m = buildCustomerBookingEmail({ dog, slotIso: booking.slot_at, timeZone: ctx.timeZone, salon: ctx.salon, phone: ctx.phone });
      jobs.push(
        sendEmail(dog.owner_email, m.subject, m.text, {
          html: m.html,
          fromName: ctx.salon || undefined,
          replyTo: ctx.replyTo || ctx.groomerEmail || undefined,
          attachments: [{ filename: "booking.ics", content: ics, contentType: "text/calendar" }],
        })
          .then(() => (results.customer = "sent"))
          .catch((e) => {
            results.customer = "failed";
            console.error("booking email to customer failed:", e.message);
          })
      );
    }
    await Promise.all(jobs);
  } catch (e) {
    console.error("notifyBookingCreated failed:", e.message);
  }
  return results;
}

export async function notifyBookingCancelled(admin, { userId, dog, booking }) {
  try {
    if (!dog.owner_email) return "no-email";
    const ctx = await loadContext(admin, userId);
    const m = buildCancelEmail({
      dog,
      slotIso: booking.slot_at,
      timeZone: ctx.timeZone,
      salon: ctx.salon,
      phone: ctx.phone,
      bookUrl: dog.booking_token ? `${appUrl()}/book/${dog.booking_token}` : "",
    });
    await sendEmail(dog.owner_email, m.subject, m.text, {
      html: m.html,
      fromName: ctx.salon || undefined,
      replyTo: ctx.replyTo || ctx.groomerEmail || undefined,
    });
    return "sent";
  } catch (e) {
    console.error("notifyBookingCancelled failed:", e.message);
    return "failed";
  }
}
