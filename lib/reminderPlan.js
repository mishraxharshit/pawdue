// Decides WHICH reminder (if any) a dog gets today.
//
// Each grooming cycle (from one groom to the next) sends at most 3 reminders:
//   1. a heads-up, up to 14 days before the due date (the last 2 weeks)
//   2. a nudge 5 days before the due date (the last week)
//   3. one overdue reminder, 3 days after the due date
// A dog more than 30 days overdue is treated as "lapsed": no automatic email
// (a months-old "you were due" message reads badly); the groomer decides.
// A send that fails is retried the next day, at most 3 times. After that the owner is left alone until the dog is groomed again, which
// starts a new cycle. A confirmed upcoming booking, an opt-out and an archived
// dog stop reminders before this function is even asked (see the cron route).
//
// "Missed" stages are skipped, not replayed: a dog added with 2 days left gets
// ONE reminder now, not three in a row.

export const MIN_GAP_DAYS = 2; // never two reminders closer than this
export const RETRY_AFTER_HOURS = 20; // a failed send is retried the next day
export const LEGACY_COOLDOWN_DAYS = 5; // used only until the SQL migration is run
export const LAPSED_AFTER_DAYS = 30; // overdue longer than this: no automatic emails
export const MAX_FAILED_ATTEMPTS = 3; // then stop retrying until the dog is groomed again
export const SAME_CYCLE_DAYS = 3; // a last-groom date fixed by up to 3 days is the same cycle

/** Days-left thresholds, in order. Stage N is due once daysLeft <= offsets[N-1]. */
export function reminderOffsets(intervalWeeks) {
  const total = Math.max(1, Number(intervalWeeks) || 1) * 7;
  const lead = Math.min(14, Math.max(6, Math.floor(total / 2)));
  return [lead, 5, -3];
}

/**
 * dog: row from `dogs` (needs last_groom_date, interval_weeks, and optionally
 *      reminder_count, reminder_cycle_date, last_reminder_sent_at, last_reminder_result)
 * comp: { daysLeft, status } from computeStatus
 * Returns { send: boolean, stage?, newCount?, cycleDate?, reason? }
 */
export function planReminder(dog, comp, now = new Date()) {
  const sentAt = dog.last_reminder_sent_at ? new Date(dog.last_reminder_sent_at) : null;
  const hoursSince = sentAt ? (now - sentAt) / 3600000 : Infinity;

  // Migration not run yet (no reminder_count column): behave like the old job.
  if (dog.reminder_count === undefined) {
    if (hoursSince < LEGACY_COOLDOWN_DAYS * 24) return { send: false, reason: "cooldown" };
    if (comp.status === "ok") return { send: false, reason: "notDueYet" };
    return { send: true, stage: null, newCount: null, cycleDate: null };
  }

  const cycleDate = String(dog.last_groom_date).slice(0, 10);
  // Same cycle if the stored cycle date matches, or the groomer only corrected
  // the last-groom date by a few days (a typo fix must not restart reminders).
  const storedCycle = dog.reminder_cycle_date ? String(dog.reminder_cycle_date).slice(0, 10) : null;
  const sameCycle = storedCycle
    ? Math.abs(Date.parse(`${storedCycle}T00:00:00Z`) - Date.parse(`${cycleDate}T00:00:00Z`)) <= SAME_CYCLE_DAYS * 86400000
    : false;
  const count = sameCycle ? Number(dog.reminder_count) || 0 : 0;
  const failCount = sameCycle ? Number(dog.reminder_fail_count) || 0 : 0;

  const offsets = reminderOffsets(dog.interval_weeks);
  const stage = offsets.filter((t) => comp.daysLeft <= t).length;

  if (stage === 0) return { send: false, reason: "notDueYet" };
  if (stage <= count) return { send: false, reason: count >= offsets.length ? "limitReached" : "notDueYet" };

  if (comp.daysLeft < -LAPSED_AFTER_DAYS) return { send: false, reason: "lapsed" };

  if (dog.last_reminder_result === "failed") {
    if (failCount >= MAX_FAILED_ATTEMPTS) return { send: false, reason: "gaveUp" };
    if (hoursSince < RETRY_AFTER_HOURS) return { send: false, reason: "retryWait" };
  } else if (hoursSince < MIN_GAP_DAYS * 24) {
    return { send: false, reason: "cooldown" };
  }

  return { send: true, stage, newCount: stage, cycleDate, count, failCount };
}
