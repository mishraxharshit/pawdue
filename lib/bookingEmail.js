// Emails sent when a booking is made or cancelled: one for the groomer
// ("new booking"), one for the dog owner ("you are booked"). Times are shown
// in the groomer's own time zone, because that is where the appointment is.

import { escapeHtml } from "./reminderEmail";

export function formatSlot(slotIso, timeZone = "UTC") {
  const d = new Date(slotIso);
  const tz = timeZone || "UTC";
  const date = d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: tz });
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: tz });
  return { date, time, full: `${date} at ${time}` };
}

function icsEscape(s) {
  return String(s ?? "").replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}
function icsStamp(d) {
  return new Date(d).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}
function fold(line) {
  const out = [];
  let rest = line;
  while (rest.length > 74) {
    out.push(rest.slice(0, 74));
    rest = " " + rest.slice(74);
  }
  out.push(rest);
  return out.join("\r\n");
}

/** A single-event calendar file people can open to add the booking. */
export function buildEventIcs({ id, slotIso, minutes = 60, summary, description, location }) {
  const start = new Date(slotIso);
  const end = new Date(start.getTime() + minutes * 60000);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//PawDue//Booking//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${id}@pawdue`,
    `DTSTAMP:${icsStamp(new Date())}`,
    `DTSTART:${icsStamp(start)}`,
    `DTEND:${icsStamp(end)}`,
    `SUMMARY:${icsEscape(summary)}`,
    description ? `DESCRIPTION:${icsEscape(description)}` : null,
    location ? `LOCATION:${icsEscape(location)}` : null,
    "BEGIN:VALARM",
    "TRIGGER:-PT60M",
    "ACTION:DISPLAY",
    `DESCRIPTION:${icsEscape(summary)}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean);
  return lines.map(fold).join("\r\n") + "\r\n";
}

function shell({ salon, heading, body, rowsHtml, footer }) {
  return `<!doctype html><html><body style="margin:0;background:#FBF7F1;font-family:Arial,Helvetica,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
    <table role="presentation" width="100%" style="max-width:520px;background:#ffffff;border:1px solid #E7DED2;border-radius:16px" cellpadding="0" cellspacing="0">
      <tr><td style="padding:28px 28px 8px">
        ${salon ? `<div style="font-size:13px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#1F5C4F">${escapeHtml(salon)}</div>` : ""}
        <h1 style="font-size:20px;line-height:1.3;color:#211D19;margin:10px 0 6px">${escapeHtml(heading)}</h1>
        <p style="font-size:15px;line-height:1.5;color:#211D19;margin:0 0 6px">${escapeHtml(body)}</p>
      </td></tr>
      <tr><td style="padding:6px 28px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rowsHtml}</table></td></tr>
      <tr><td style="padding:14px 28px 28px;font-size:14px;line-height:1.5;color:#6B6259">${escapeHtml(footer)}</td></tr>
    </table>
  </td></tr></table></body></html>`;
}

function row(label, value) {
  if (!value) return "";
  return `<tr><td style="padding:10px 0;border-top:1px solid #E7DED2;font-size:13px;color:#6B6259;width:34%">${escapeHtml(label)}</td><td style="padding:10px 0;border-top:1px solid #E7DED2;font-size:15px;color:#211D19;font-weight:600">${escapeHtml(value)}</td></tr>`;
}

/** Email to the groomer when a customer books a slot. */
export function buildGroomerBookingEmail({ dog, slotIso, timeZone, salon, dashboardUrl }) {
  const when = formatSlot(slotIso, timeZone);
  const subject = `New booking: ${dog.dog_name}, ${when.date} ${when.time}`;
  const lines = [
    `${dog.owner_name || "A customer"} just booked ${dog.dog_name}.`,
    "",
    `When: ${when.full}`,
    `Dog: ${dog.dog_name}${dog.breed ? ` (${dog.breed})` : ""}`,
    dog.owner_name ? `Owner: ${dog.owner_name}` : null,
    dog.phone ? `Phone: ${dog.phone}` : null,
    dog.owner_email ? `Email: ${dog.owner_email}` : null,
    "",
    `See all bookings: ${dashboardUrl}`,
  ].filter((l) => l !== null);
  const html = shell({
    salon: "PawDue",
    heading: "You have a new booking",
    body: `${dog.owner_name || "A customer"} just booked ${dog.dog_name}.`,
    rowsHtml:
      row("When", when.full) +
      row("Dog", `${dog.dog_name}${dog.breed ? ` (${dog.breed})` : ""}`) +
      row("Owner", dog.owner_name) +
      row("Phone", dog.phone) +
      row("Email", dog.owner_email),
    footer: `It is already in your dashboard: ${dashboardUrl}`,
  });
  return { subject, text: lines.join("\n"), html };
}

/** Confirmation email to the dog owner. */
export function buildCustomerBookingEmail({ dog, slotIso, timeZone, salon, phone }) {
  const when = formatSlot(slotIso, timeZone);
  const place = salon ? ` at ${salon}` : "";
  const subject = `Booked: ${dog.dog_name}, ${when.date} ${when.time}${salon ? ` | ${salon}` : ""}`;
  const contact = phone ? `Need to change it? Reply to this email or call ${phone}.` : "Need to change it? Just reply to this email.";
  const text = [
    `Hi ${dog.owner_name || "there"}, ${dog.dog_name}'s groom${place} is confirmed.`,
    "",
    `When: ${when.full}`,
    "",
    "A calendar file is attached, open it to add the booking to your calendar.",
    contact,
  ].join("\n");
  const html = shell({
    salon,
    heading: `${dog.dog_name} is booked`,
    body: `Hi ${dog.owner_name || "there"}, your appointment is confirmed.`,
    rowsHtml: row("When", when.full) + row("Dog", dog.dog_name) + row("Where", salon) + row("Phone", phone),
    footer: `${contact} A calendar file is attached to add this to your calendar.`,
  });
  return { subject, text, html };
}

/** Email to the dog owner when the groomer cancels. */
export function buildCancelEmail({ dog, slotIso, timeZone, salon, phone, bookUrl }) {
  const when = formatSlot(slotIso, timeZone);
  const subject = `Appointment cancelled: ${dog.dog_name}, ${when.date}${salon ? ` | ${salon}` : ""}`;
  const contact = phone ? `Questions? Reply to this email or call ${phone}.` : "Questions? Just reply to this email.";
  const text = [
    `Hi ${dog.owner_name || "there"}, ${salon || "your groomer"} had to cancel ${dog.dog_name}'s appointment on ${when.full}.`,
    "",
    bookUrl ? `You can pick a new time here: ${bookUrl}` : "",
    contact,
  ].filter(Boolean).join("\n");
  const html = shell({
    salon,
    heading: "Your appointment was cancelled",
    body: `Hi ${dog.owner_name || "there"}, ${dog.dog_name}'s appointment on ${when.full} was cancelled by the groomer.`,
    rowsHtml: bookUrl ? `<tr><td style="padding:14px 0;border-top:1px solid #E7DED2"><a href="${escapeHtml(bookUrl)}" style="background:#B8461F;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;padding:10px 20px;border-radius:100px;display:inline-block">Pick a new time</a></td></tr>` : "",
    footer: contact,
  });
  return { subject, text, html };
}
