// Messages a groomer sends by hand from the dashboard (WhatsApp click-to-chat).
// No WhatsApp Business account or approval is needed: the button opens the
// groomer's own WhatsApp with the text already typed, and they press send.

/** wa.me link for a stored phone like "+919876543210", or null if it cannot be used. */
export function whatsappUrl(phone, text) {
  const raw = String(phone || "").trim();
  if (!raw.startsWith("+")) return null; // no country code, so the chat cannot be opened reliably
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 15) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

/**
 * view: "lapsed" | "overdue" | "soon" | "ok"
 * dueLabel: short date such as "Feb 5"
 */
export function manualMessageText({ dog, view, businessName, dueLabel, bookingUrl }) {
  const salon = (businessName || "").trim();
  const hello = `Hi ${dog.owner_name}, ${salon ? `it is ${salon}. ` : ""}`;
  const link = bookingUrl ? ` You can pick a time here: ${bookingUrl}` : "";
  if (view === "lapsed") {
    return `${hello}It has been a while since ${dog.dog_name}'s last groom and we would love to see them again. Would you like to book a spot?${link}`;
  }
  if (view === "overdue") {
    return `${hello}${dog.dog_name} was due for a groom on ${dueLabel}. Would you like to book a spot?${link}`;
  }
  return `${hello}${dog.dog_name} is due for a groom around ${dueLabel}.${link}`;
}
