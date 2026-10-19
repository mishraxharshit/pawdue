// Builds the reminder email a dog owner receives. One email per owner, even
// when they have several dogs due, so nobody gets three emails in one morning.
// Salon name and phone come from the groomer's business profile, so the email
// reads like it came from the salon, not from a software tool.

const BREAK = "\n";

export function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function dueLabel(comp) {
  return comp.due.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function joinNames(names) {
  if (names.length <= 1) return names[0] || "";
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

function bookingLink(dog, appUrl) {
  return dog.booking_token ? `${appUrl}/book/${dog.booking_token}` : appUrl;
}

/**
 * items: [{ dog, comp }] for ONE owner (all with the same owner_email).
 * business: { name, phone } (both optional)
 * Returns { subject, text, html }.
 */
export function buildReminderEmail({ items, business = {}, appUrl }) {
  const base = appUrl || process.env.NEXT_PUBLIC_APP_URL || "https://your-app.vercel.app";
  const salon = (business.name || "").trim();
  const phone = (business.phone || "").trim();
  const owner = items[0].dog.owner_name;
  const names = items.map((i) => i.dog.dog_name);
  const anyOverdue = items.some((i) => i.comp.status === "overdue");
  const many = items.length > 1;

  let subject;
  if (many) {
    subject = anyOverdue ? `${joinNames(names)} are due for a groom` : `${joinNames(names)} are due for a groom soon`;
  } else {
    subject = anyOverdue ? `${names[0]} is overdue for a groom` : `${names[0]} is due for a groom soon`;
  }
  if (salon) subject += ` | ${salon}`;

  const intro = salon
    ? many
      ? `Hi ${owner}, it is ${salon}. ${joinNames(names)} are coming up for their next groom.`
      : `Hi ${owner}, it is ${salon}. ${names[0]} is coming up for their next groom.`
    : many
      ? `Hi ${owner}, ${joinNames(names)} are coming up for their next groom.`
      : `Hi ${owner}, ${names[0]} is coming up for their next groom.`;

  const lines = items.map(({ dog, comp }) => {
    const verb = comp.status === "overdue" ? "was due" : "is due around";
    return {
      dog,
      text: `${dog.dog_name} (${dog.breed}) ${verb} ${dueLabel(comp)}`,
      link: bookingLink(dog, base),
    };
  });

  const textParts = [intro, ""];
  if (many) {
    for (const l of lines) textParts.push(`${l.text}. Book: ${l.link}`);
  } else {
    textParts.push(`${lines[0].text}. Book a slot here: ${lines[0].link}`);
  }
  textParts.push("");
  textParts.push(phone ? `Questions? Reply to this email or call ${phone}.` : "Questions? Just reply to this email.");
  textParts.push("");
  textParts.push(salon ? `See you soon,${BREAK}${salon}` : "See you soon!");
  const text = textParts.join(BREAK);

  const rows = lines
    .map(
      (l) => `
      <tr><td style="padding:14px 0;border-top:1px solid #E7DED2">
        <div style="font-size:16px;font-weight:700;color:#211D19">${escapeHtml(l.dog.dog_name)}</div>
        <div style="font-size:14px;color:#6B6259;margin:2px 0 10px">${escapeHtml(l.text.replace(`${l.dog.dog_name} `, ""))}</div>
        <a href="${escapeHtml(l.link)}" style="background:#B8461F;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;padding:10px 20px;border-radius:100px;display:inline-block">Book ${escapeHtml(l.dog.dog_name)}'s slot</a>
      </td></tr>`
    )
    .join("");

  const html = `<!doctype html><html><body style="margin:0;background:#FBF7F1;font-family:Arial,Helvetica,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
    <table role="presentation" width="100%" style="max-width:520px;background:#ffffff;border:1px solid #E7DED2;border-radius:16px" cellpadding="0" cellspacing="0">
      <tr><td style="padding:28px 28px 8px">
        ${salon ? `<div style="font-size:13px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#1F5C4F">${escapeHtml(salon)}</div>` : ""}
        <p style="font-size:16px;line-height:1.5;color:#211D19;margin:10px 0 6px">${escapeHtml(intro)}</p>
      </td></tr>
      <tr><td style="padding:0 28px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table></td></tr>
      <tr><td style="padding:14px 28px 28px;font-size:14px;line-height:1.5;color:#6B6259">
        ${escapeHtml(phone ? `Questions? Reply to this email or call ${phone}.` : "Questions? Just reply to this email.")}
      </td></tr>
    </table>
  </td></tr></table></body></html>`;

  return { subject, text, html };
}

/** Group due dogs by owner so each owner gets one email. */
export function groupByOwner(entries) {
  const map = new Map();
  for (const e of entries) {
    const key = `${e.dog.user_id}|${(e.dog.owner_email || "").trim().toLowerCase() || `phone:${e.dog.phone}`}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(e);
  }
  return [...map.values()];
}
