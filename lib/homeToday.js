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
