export const BREED_INTERVALS = {
  "Poodle (Standard/Mini/Toy)": 5,
  "Doodle (Goldendoodle/Labradoodle/etc)": 5,
  "Shih Tzu": 5,
  Maltese: 5,
  "Bichon Frise": 6,
  "Cocker Spaniel": 6,
  "Yorkshire Terrier": 6,
  Schnauzer: 6,
  "Old English Sheepdog": 6,
  "Golden Retriever": 8,
  "Labrador Retriever": 10,
  "German Shepherd": 9,
  Beagle: 10,
  "Husky / Malamute": 12,
  Chihuahua: 8,
  Pug: 8,
  "Mixed / Unknown breed": 7,
  "Other (short coat, low maintenance)": 12,
};

export function defaultIntervalFor(breed) {
  return BREED_INTERVALS[breed] || 8;
}

/** Calendar date (y, m, d) of an instant, as seen in `tz`. Independent of the machine's own timezone. */
function ymdInZone(date, tz) {
  let zone = tz || "UTC";
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: zone });
  } catch {
    zone = "UTC"; // unknown tz string: fall back to UTC rather than throw
  }
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(date);
  const get = (t) => Number(parts.find((p) => p.type === t).value);
  return { y: get("year"), m: get("month"), d: get("day") };
}

/**
 * Given a dog record (last_groom_date: date string/Date, interval_weeks: number),
 * compute the due date and status. `timezone` should be the groomer's IANA
 * timezone (business_settings.timezone) - defaults to UTC if not provided.
 *
 * The last groom date is a calendar date, so the due date is a calendar date
 * too (last + N weeks), the same everywhere. "Today" is the groomer's local
 * day. Everything is computed with UTC arithmetic, so the result does not
 * depend on the timezone of the server or browser running it.
 */
export function computeStatus(dog, now = new Date(), timezone = "UTC") {
  const lastRaw = dog.last_groom_date;
  const last = typeof lastRaw === "string" ? new Date(`${lastRaw.slice(0, 10)}T00:00:00Z`) : new Date(lastRaw);
  const dueDay = Date.UTC(last.getUTCFullYear(), last.getUTCMonth(), last.getUTCDate() + dog.interval_weeks * 7);
  // Noon UTC, so formatting this date in any timezone from UTC-12 to UTC+11
  // still shows the same calendar day.
  const due = new Date(dueDay + 12 * 3600 * 1000);

  const t = ymdInZone(now, timezone);
  const todayDay = Date.UTC(t.y, t.m - 1, t.d);
  const daysLeft = Math.round((dueDay - todayDay) / 86400000);

  let status = "ok";
  if (daysLeft < 0) status = "overdue";
  else if (daysLeft <= 7) status = "soon";

  return { due, daysLeft, status };
}

export function reminderMessage(dog, comp) {
  const dueStr = comp.due.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://your-app.vercel.app";
  const bookingLink = dog.booking_token ? `${appUrl}/book/${dog.booking_token}` : appUrl;

  if (comp.status === "overdue") {
    return `Hi ${dog.owner_name}, we miss ${dog.dog_name}! Their ${dog.breed} coat was due for grooming on ${dueStr}. Book a slot this week: ${bookingLink}`;
  }
  return `Hi ${dog.owner_name}, ${dog.dog_name}'s ${dog.breed} coat is due for a trim around ${dueStr}. Click here to book your slot: ${bookingLink}`;
}

// Only the email channel needs a subject line - WhatsApp/SMS just use the body.
export function reminderSubject(dog, comp) {
  return comp.status === "overdue"
    ? `${dog.dog_name} is overdue for a groom`
    : `${dog.dog_name} is due for a groom soon`;
}
