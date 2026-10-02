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

/**
 * Builds the list of bookable slots for the next `settings.daysAhead` days
 * according to that groomer's working days/hours/slot length/break window,
 * then removes any that are already taken (in bookedIso, a Set of ISO
 * strings) or are in the past.
 */
export function generateAvailableSlots(bookedIso, settings = DEFAULT_AVAILABILITY) {
  const cfg = { ...DEFAULT_AVAILABILITY, ...settings };
  const startMin = timeToMinutes(cfg.startTime);
  const endMin = timeToMinutes(cfg.endTime);
  const breakStartMin = cfg.breakStart ? timeToMinutes(cfg.breakStart) : null;
  const breakEndMin = cfg.breakEnd ? timeToMinutes(cfg.breakEnd) : null;
  const slots = [];
  const now = new Date();

  for (let d = 0; d < cfg.daysAhead; d++) {
    const day = new Date(now);
    day.setDate(day.getDate() + d);
    if (!cfg.workingDays.includes(day.getDay())) continue;

    for (let mins = startMin; mins < endMin; mins += cfg.slotMinutes) {
      if (breakStartMin != null && breakEndMin != null && mins >= breakStartMin && mins < breakEndMin) continue;
      const slot = new Date(day);
      slot.setHours(0, 0, 0, 0);
      slot.setMinutes(mins);
      if (slot <= now) continue;
      const iso = slot.toISOString();
      if (bookedIso.has(iso)) continue;
      slots.push(iso);
    }
  }
  return slots;
}

export function groupSlotsByDay(isoSlots) {
  const groups = {};
  for (const iso of isoSlots) {
    const date = new Date(iso);
    const key = date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    if (!groups[key]) groups[key] = [];
    groups[key].push(iso);
  }
  return groups;
}
