// The personal "we would love to see you again" email a groomer sends to a
// client who has gone quiet. One owner, one dog, sent only when the groomer
// presses send, so it is a one-to-one message, not an automatic reminder.

import { escapeHtml } from "./reminderEmail";

export const WINBACK_COOLDOWN_DAYS = 7;
export const WINBACK_MAX_MESSAGE = 1000;

/** Days since an ISO timestamp, or null if there is none. */
export function daysSince(iso, now = new Date()) {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  return Math.floor((new Date(now).getTime() - t) / 86400000);
}

/** True when a win-back email already went to this dog in the last few days. */
export function winbackTooSoon(lastWinbackAt, now = new Date()) {
  const d = daysSince(lastWinbackAt, now);
  return d !== null && d < WINBACK_COOLDOWN_DAYS;
}

/** Trim and bound what the groomer typed. Returns null when there is nothing to send. */
export function cleanMessage(message) {
  const m = String(message ?? "").replace(/\r\n/g, "\n").trim().slice(0, WINBACK_MAX_MESSAGE);
  return m || null;
}

export function buildWinbackEmail({ dog, message, salon = "", phone = "", bookUrl = "" }) {
  const name = String(salon || "").trim();
  const subject = `We would love to see ${dog.dog_name} again${name ? ` | ${name}` : ""}`;
  const contact = phone ? `Questions? Reply to this email or call ${phone}.` : "Questions? Just reply to this email.";
  const stop = bookUrl ? `Do not want these emails? Open ${bookUrl} and choose "Stop reminders".` : "Do not want these emails? Reply STOP and we will remove you.";
  const text = [message, bookUrl ? `Book a time: ${bookUrl}` : "", contact, stop].filter(Boolean).join("\n\n");

  const paragraphs = String(message)
    .split(/\n{2,}/)
    .map((p) => `<p style="font-size:16px;line-height:1.55;color:#211D19;margin:0 0 12px">${escapeHtml(p).replace(/\n/g, "<br>")}</p>`)
    .join("");
  const button = bookUrl
    ? `<a href="${escapeHtml(bookUrl)}" style="background:#B8461F;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;padding:11px 22px;border-radius:100px;display:inline-block;margin:6px 0 4px">Book ${escapeHtml(dog.dog_name)}'s slot</a>`
    : "";
  const html = `<!doctype html><html><body style="margin:0;background:#FBF7F1;font-family:Arial,Helvetica,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
    <table role="presentation" width="100%" style="max-width:520px;background:#ffffff;border:1px solid #E7DED2;border-radius:16px" cellpadding="0" cellspacing="0">
      <tr><td style="padding:28px 28px 8px">
        ${name ? `<div style="font-size:13px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#1F5C4F;margin-bottom:10px">${escapeHtml(name)}</div>` : ""}
        ${paragraphs}
        ${button}
      </td></tr>
      <tr><td style="padding:10px 28px 28px;font-size:14px;line-height:1.5;color:#6B6259">${escapeHtml(contact)}<br><span style="font-size:12px">${bookUrl ? `Do not want these emails? <a href="${escapeHtml(bookUrl)}" style="color:#6B6259">Open your booking page</a> and choose "Stop reminders".` : "Do not want these emails? Reply STOP and we will remove you."}</span></td></tr>
    </table>
  </td></tr></table></body></html>`;
  return { subject, text, html };
}
