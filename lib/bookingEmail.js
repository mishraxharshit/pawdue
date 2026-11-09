// Emails sent when a booking is made or cancelled: one for the groomer
// ("new booking"), one for the dog owner ("you are booked"). Times are shown
// in the groomer's own time zone, because that is where the appointment is.

import { escapeHtml } from "./reminderEmail";
import { methodsText, receiptNumber, methodLabel } from "./payments";
import { currencySymbol } from "./services";

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

// Service rows shared by both emails. `details` comes from describeBooking().
function serviceRows(details) {
  if (!details) return "";
  const priceNote = details.isStarting ? `${details.total} (starting price, the final price is confirmed by your groomer)` : details.total;
  return (
    row("Service", details.size ? `${details.name} (${details.size} dog)` : details.name) +
    row("Add-ons", details.addons.map((a) => `${a.name} ${a.price}`.trim()).join(", ")) +
    row("Price", priceNote)
  );
}
function serviceLines(details) {
  if (!details) return [];
  return [
    `Service: ${details.size ? `${details.name} (${details.size} dog)` : details.name}`,
    details.addons.length ? `Add-ons: ${details.addons.map((a) => `${a.name} ${a.price}`.trim()).join(", ")}` : null,
    details.total ? `Price: ${details.total}${details.isStarting ? " (starting price)" : ""}` : null,
  ].filter(Boolean);
}

// "Pay Happy Paws directly. Accepted: Cash, Venmo (@maya)." PawDue itself never
// takes payment, and the email says so, so there is no doubt who gets the money.
function paymentText(payment, salon) {
  if (!payment || !payment.methods || !payment.methods.length) return "";
  return `Pay ${salon || "your groomer"} directly. Accepted: ${methodsText(payment.methods)}.`;
}

function row(label, value) {
  if (!value) return "";
  return `<tr><td style="padding:10px 0;border-top:1px solid #E7DED2;font-size:13px;color:#6B6259;width:34%">${escapeHtml(label)}</td><td style="padding:10px 0;border-top:1px solid #E7DED2;font-size:15px;color:#211D19;font-weight:600">${escapeHtml(value)}</td></tr>`;
}

/** Email to the groomer when a customer books a slot. */
export function buildGroomerBookingEmail({ dog, slotIso, timeZone, salon, dashboardUrl, details = null }) {
  const when = formatSlot(slotIso, timeZone);
  const subject = `New booking: ${dog.dog_name}, ${when.date} ${when.time}`;
  const lines = [
    `${dog.owner_name || "A customer"} just booked ${dog.dog_name}.`,
    "",
    `When: ${when.full}`,
    `Dog: ${dog.dog_name}${dog.breed ? ` (${dog.breed})` : ""}`,
    ...serviceLines(details),
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
      serviceRows(details) +
      row("Owner", dog.owner_name) +
      row("Phone", dog.phone) +
      row("Email", dog.owner_email),
    footer: `It is already in your dashboard: ${dashboardUrl}`,
  });
  return { subject, text: lines.join("\n"), html };
}

/** Confirmation email to the dog owner. */
export function buildCustomerBookingEmail({ dog, slotIso, timeZone, salon, phone, details = null, note = "", payment = null }) {
  const when = formatSlot(slotIso, timeZone);
  const place = salon ? ` at ${salon}` : "";
  const subject = `Booked: ${dog.dog_name}, ${when.date} ${when.time}${salon ? ` | ${salon}` : ""}`;
  const contact = phone ? `Need to change it? Reply to this email or call ${phone}.` : "Need to change it? Just reply to this email.";
  const pay = paymentText(payment, salon);
  const payNote = payment?.note || "";
  const text = [
    `Hi ${dog.owner_name || "there"}, ${dog.dog_name}'s groom${place} is confirmed.`,
    "",
    `When: ${when.full}`,
    ...serviceLines(details),
    note ? "" : null,
    note ? `A note from ${salon || "your groomer"}: ${note}` : null,
    pay ? "" : null,
    pay ? `Payment: ${pay}` : null,
    payNote ? payNote : null,
    "",
    "A calendar file is attached, open it to add the booking to your calendar.",
    contact,
  ].filter((l) => l !== null).join("\n");
  const html = shell({
    salon,
    heading: `${dog.dog_name} is booked`,
    body: `Hi ${dog.owner_name || "there"}, your appointment is confirmed.`,
    rowsHtml: row("When", when.full) + row("Dog", dog.dog_name) + serviceRows(details) + row("Where", salon) + row("Phone", phone) + row("Note", note) + row("Payment", [pay, payNote].filter(Boolean).join(" ")),
    footer: `${contact} A calendar file is attached to add this to your calendar.`,
  });
  return { subject, text, html };
}

/** Email to the dog owner when the groomer cancels. */
export function buildCancelEmail({ dog, slotIso, timeZone, salon, phone, bookUrl, details = null }) {
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
    rowsHtml: row("Service", details?.withSize) + (bookUrl ? `<tr><td style="padding:14px 0;border-top:1px solid #E7DED2"><a href="${escapeHtml(bookUrl)}" style="background:#B8461F;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;padding:10px 20px;border-radius:100px;display:inline-block">Pick a new time</a></td></tr>` : ""),
    footer: contact,
  });
  return { subject, text, html };
}

/**
 * Receipt to the dog owner after the groomer records a payment. It states what
 * was agreed and what was paid, and that the money went to the groomer directly.
 */
export function buildReceiptEmail({ dog, slotIso, timeZone, salon, phone, details = null, booking }) {
  const when = formatSlot(slotIso, timeZone);
  const symbol = currencySymbol(booking.currency);
  const money = (n) => `${symbol}${Number.isInteger(Number(n)) ? Number(n) : Number(n).toFixed(2)}`;
  const paid = money(booking.paid_amount);
  const method = methodLabel(booking.paid_method);
  const paidOn = formatSlot(booking.paid_at, timeZone).date;
  const no = receiptNumber(booking.id);
  const to = salon || "your groomer";
  const agreed = details && details.total && !details.isStarting && Number(booking.price) !== Number(booking.paid_amount) ? details.total : "";
  const subject = `Receipt ${no}: ${dog.dog_name}, ${when.date}${salon ? ` | ${salon}` : ""}`;
  const footer = `This payment was made directly to ${to}. PawDue does not process or hold payments, so for any question about it, contact ${to}${phone ? ` on ${phone}` : ""}.`;
  const text = [
    `Hi ${dog.owner_name || "there"}, ${to} has recorded your payment for ${dog.dog_name}'s groom.`,
    "",
    `Receipt: ${no}`,
    `Appointment: ${when.full}`,
    ...serviceLines(details),
    agreed ? `Price agreed: ${agreed}` : null,
    `Paid: ${paid}${method ? ` by ${method}` : ""} on ${paidOn}`,
    `Paid to: ${to}`,
    "",
    footer,
  ].filter((l) => l !== null).join("\n");
  const html = shell({
    salon,
    heading: "Payment received",
    body: `Hi ${dog.owner_name || "there"}, here is your receipt for ${dog.dog_name}'s groom.`,
    rowsHtml:
      row("Receipt", no) +
      row("Appointment", when.full) +
      serviceRows(details) +
      row("Price agreed", agreed) +
      row("Paid", `${paid}${method ? ` by ${method}` : ""} on ${paidOn}`) +
      row("Paid to", to),
    footer,
  });
  return { subject, text, html };
}
