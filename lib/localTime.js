// What hour (0-23) is it right now in a given IANA timezone? Used by the
// reminder cron so each groomer's clients get messages at a sensible local
// hour (e.g. 9 AM) instead of every account getting them at the same UTC
// instant - which would land at 1-2 AM for anyone in the Americas.
export function localHour(date, timezone) {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      hourCycle: "h23", // 0-23, so midnight is 0 and never "24"
      timeZone: timezone || "UTC",
    }).formatToParts(date);
    return Number(parts.find((p) => p.type === "hour").value);
  } catch {
    // Unknown/invalid timezone string - fall back to UTC rather than throw.
    return date.getUTCHours();
  }
}
