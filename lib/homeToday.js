// Small date helpers for the dashboard home, kept free of React so they can be tested.

// A calendar day key (YYYY-MM-DD) for an instant, in the groomer's time zone.
export function dayKey(date, timeZone = "UTC") {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(date));
  } catch {
    return new Date(date).toISOString().slice(0, 10);
  }
}

export function timeLabel(date, timeZone = "UTC") {
  try {
    return new Date(date).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone });
  } catch {
    return new Date(date).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }
}

/** "Good morning" / "afternoon" / "evening" for the hour (0-23) in the groomer's zone. */
export function greetingFor(date, timeZone = "UTC") {
  let hour;
  try {
    hour = Number(new Intl.DateTimeFormat("en-US", { hour: "numeric", hourCycle: "h23", timeZone }).format(new Date(date)));
  } catch {
    hour = new Date(date).getUTCHours();
  }
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

const WEEK_MS = 7 * 24 * 3600 * 1000;

/**
 * What PawDue did in the last 7 days. A dog only stores its LATEST reminder,
 * so "dogs reminded" counts dogs, not every email sent.
 */
export function weekStats(dogs, bookings, now = new Date()) {
  const since = new Date(now).getTime() - WEEK_MS;
  let reminded = 0;
  let failed = 0;
  for (const d of dogs || []) {
    if (!d.last_reminder_sent_at || new Date(d.last_reminder_sent_at).getTime() < since) continue;
    if (d.last_reminder_result === "failed") failed++;
    else reminded++;
  }
  const booked = (bookings || []).filter((b) => b.created_at && new Date(b.created_at).getTime() >= since).length;
  return { reminded, failed, booked };
}

/** Dogs whose latest reminder failed, any age (the groomer still has to act). */
export function failedReminderDogs(dogs) {
  return (dogs || []).filter((d) => d.last_reminder_result === "failed");
}

/** Dogs due within the week, soonest first, with a short weekday label. */
export function comingUp(rows, timeZone = "UTC", limit = 5) {
  return rows
    .filter((x) => x.view === "soon")
    .sort((a, b) => a.comp.daysLeft - b.comp.daysLeft)
    .slice(0, limit)
    .map((x) => ({
      id: x.dog.id,
      dogName: x.dog.dog_name,
      ownerName: x.dog.owner_name,
      hasEmail: !!x.dog.owner_email,
      when: x.comp.daysLeft <= 0 ? "Today" : x.comp.daysLeft === 1 ? "Tomorrow" : new Date(x.comp.due).toLocaleDateString("en-US", { weekday: "short", timeZone }),
    }));
}
