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

/**
 * Shifts a Date to represent the same instant's wall-clock time in `tz`,
 * so day-boundary math (daysLeft, "is it overdue yet") reflects the
 * groomer's actual local day instead of the server's. Deliberately avoids
 * adding a timezone library (date-fns-tz, luxon) for one calculation -
 * Intl.DateTimeFormat is built into Node/browsers and is accurate enough
 * for "which calendar day is this" purposes.
 */
function toZonedTime(date, tz) {
  if (!tz || tz === "UTC") return new Date(date.getTime()); // clone - never mutate the caller's Date
  try {
    return new Date(date.toLocaleString("en-US", { timeZone: tz }));
  } catch {
    return new Date(date.getTime()); // invalid/unknown tz string - fall back to UTC rather than throw
  }
}

/**
 * Given a dog record (last_groom_date: date string/Date, interval_weeks: number),
 * compute the due date and status. `timezone` should be the groomer's IANA
 * timezone (business_settings.timezone) - defaults to UTC if not provided.
 */
export function computeStatus(dog, now = new Date(), timezone = "UTC") {
  const last = new Date(dog.last_groom_date);
  const due = new Date(last.getTime());
  due.setDate(due.getDate() + dog.interval_weeks * 7);

  const zonedNow = toZonedTime(now, timezone);
  const zonedDue = toZonedTime(due, timezone);
  // Compare at midnight in the groomer's local day, so "due today" reads as
  // 0 days left all day rather than flipping to -1 partway through the day.
  zonedNow.setHours(0, 0, 0, 0);
  zonedDue.setHours(0, 0, 0, 0);
  const daysLeft = Math.round((zonedDue - zonedNow) / (1000 * 60 * 60 * 24));

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
