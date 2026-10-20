// Booking availability is per-groomer, stored in the availability_settings
// table (see supabase/add-availability-settings.sql). These defaults match
// the old hardcoded MVP constant (Mon-Sat, 9am-5pm, 1-hour slots) and are
// used as a fallback for any groomer who hasn't opened the Availability
// settings screen yet, so nothing breaks for existing accounts.
export const DEFAULT_AVAILABILITY = {
  workingDays: [1, 2, 3, 4, 5, 6], // 0 = Sunday ... 6 = Saturday
  startTime: "09:00",
  endTime: "17:00",
  slotMinutes: 60,
  breakStart: null,
  breakEnd: null,
  daysAhead: 14,
};

function timeToMinutes(t) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}

/**
 * Reads a groomer's availability_settings row (if any) and returns it in
 * the shape generateAvailableSlots expects, falling back to
 * DEFAULT_AVAILABILITY field-by-field so a partially-set row still works.
 */
export async function getAvailabilitySettings(admin, userId) {
  const { data } = await admin
    .from("availability_settings")
    .select("working_days, start_time, end_time, slot_minutes, break_start, break_end, days_ahead")
    .eq("user_id", userId)
    .maybeSingle();

  if (!data) return { ...DEFAULT_AVAILABILITY };

  return {
    workingDays: data.working_days ?? DEFAULT_AVAILABILITY.workingDays,
    startTime: (data.start_time || DEFAULT_AVAILABILITY.startTime).slice(0, 5),
    endTime: (data.end_time || DEFAULT_AVAILABILITY.endTime).slice(0, 5),
    slotMinutes: data.slot_minutes ?? DEFAULT_AVAILABILITY.slotMinutes,
    breakStart: data.break_start ? data.break_start.slice(0, 5) : null,
    breakEnd: data.break_end ? data.break_end.slice(0, 5) : null,
    daysAhead: data.days_ahead ?? DEFAULT_AVAILABILITY.daysAhead,
  };
}

// ---- Time zone helpers -----------------------------------------------------
// Slot times are "9:00 to 17:00" in the GROOMER's time zone. The server itself
// runs in UTC (Vercel), so building slots with the server's local clock made a
// 9 AM slot land at 9 AM UTC, which is the wrong hour for everyone else.

/** Offset (in minutes) of `timeZone` from UTC at the instant `utcMs`. */
function tzOffsetMinutes(utcMs, timeZone) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
  }).formatToParts(new Date(utcMs));
  const get = (t) => Number(parts.find((p) => p.type === t).value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return Math.round((asUtc - Math.floor(utcMs / 1000) * 1000) / 60000);
}

/** The UTC instant (ms) when the wall clock in `timeZone` reads y-m-d h:min. */
export function zonedWallTimeToUtcMs(y, m, d, minutesOfDay, timeZone) {
  const wall = Date.UTC(y, m - 1, d, 0, minutesOfDay, 0);
  let utc = wall - tzOffsetMinutes(wall, timeZone) * 60000;
  // Re-check once: near a daylight-saving change the first guess can be an hour off.
  const fixed = wall - tzOffsetMinutes(utc, timeZone) * 60000;
  return fixed;
}

/** Today's calendar date (y, m, d) in `timeZone`. */
function todayInZone(now, timeZone) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(now);
  const get = (t) => Number(parts.find((p) => p.type === t).value);
  return { y: get("year"), m: get("month"), d: get("day") };
}

/** Today's date as YYYY-MM-DD in the groomer's timezone (for "Groomed today"). */
export function localDateString(timeZone, now = new Date()) {
  const { y, m, d } = todayInZone(now, safeZone(timeZone));
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function safeZone(timeZone) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return timeZone;
  } catch {
    return "UTC";
  }
}

/** The groomer's saved time zone, or "UTC" if none (or the column is missing). */
export async function getBusinessTimezone(admin, userId) {
  const { data, error } = await admin
    .from("business_settings")
    .select("timezone")
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data?.timezone) return "UTC";
  return safeZone(data.timezone);
}

/**
 * Builds the list of bookable slots for the next `settings.daysAhead` days
 * according to that groomer's working days/hours/slot length/break window,
 * all read as wall-clock time in `timeZone`, then removes any that are already
 * taken (in bookedIso, a Set of ISO strings) or are in the past.
 */
export function generateAvailableSlots(bookedIso, settings = DEFAULT_AVAILABILITY, timeZone = "UTC", nowDate = new Date()) {
  const cfg = { ...DEFAULT_AVAILABILITY, ...settings };
  const zone = safeZone(timeZone);
  const startMin = timeToMinutes(cfg.startTime);
  const endMin = timeToMinutes(cfg.endTime);
  const breakStartMin = cfg.breakStart ? timeToMinutes(cfg.breakStart) : null;
  const breakEndMin = cfg.breakEnd ? timeToMinutes(cfg.breakEnd) : null;
  const slots = [];
  const today = todayInZone(nowDate, zone);

  for (let dayOffset = 0; dayOffset < cfg.daysAhead; dayOffset++) {
    // Calendar arithmetic on a plain UTC date: no daylight-saving surprises.
    const cal = new Date(Date.UTC(today.y, today.m - 1, today.d + dayOffset));
    const y = cal.getUTCFullYear();
    const m = cal.getUTCMonth() + 1;
    const d = cal.getUTCDate();
    if (!cfg.workingDays.includes(cal.getUTCDay())) continue;

    for (let mins = startMin; mins < endMin; mins += cfg.slotMinutes) {
      if (breakStartMin != null && breakEndMin != null && mins >= breakStartMin && mins < breakEndMin) continue;
      const ms = zonedWallTimeToUtcMs(y, m, d, mins, zone);
      if (ms <= nowDate.getTime()) continue;
      const iso = new Date(ms).toISOString();
      if (bookedIso.has(iso)) continue;
      slots.push(iso);
    }
  }
  return slots;
}

export function groupSlotsByDay(isoSlots, timeZone) {
  const groups = {};
  for (const iso of isoSlots) {
    const date = new Date(iso);
    const key = date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      ...(timeZone ? { timeZone: safeZone(timeZone) } : {}),
    });
    if (!groups[key]) groups[key] = [];
    groups[key].push(iso);
  }
  return groups;
}
