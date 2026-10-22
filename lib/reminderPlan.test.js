import { describe, it, expect } from "vitest";
import { planReminder, reminderOffsets } from "./reminderPlan";

const NOW = new Date("2026-03-01T10:00:00Z");
const base = { last_groom_date: "2026-01-01", interval_weeks: 8, reminder_count: 0, reminder_cycle_date: "2026-01-01" };
const at = (daysLeft) => ({ daysLeft, status: daysLeft < 0 ? "overdue" : daysLeft <= 7 ? "soon" : "ok" });

describe("reminderOffsets", () => {
  it("is 14, 5, -3 for normal cycles and shorter lead for short ones", () => {
    expect(reminderOffsets(8)).toEqual([14, 5, -3]);
    expect(reminderOffsets(4)).toEqual([14, 5, -3]);
    expect(reminderOffsets(2)).toEqual([7, 5, -3]);
    expect(reminderOffsets(1)).toEqual([6, 5, -3]);
  });
});

describe("planReminder", () => {
  it("does nothing before the last 2 weeks", () => {
    expect(planReminder(base, at(20), NOW)).toMatchObject({ send: false, reason: "notDueYet" });
  });
  it("sends the heads-up at 14 days and records stage 1", () => {
    expect(planReminder(base, at(14), NOW)).toMatchObject({ send: true, stage: 1, newCount: 1 });
  });
  it("does not repeat the same stage", () => {
    expect(planReminder({ ...base, reminder_count: 1 }, at(10), NOW).send).toBe(false);
  });
  it("sends the nudge at 5 days, and the overdue one at -3", () => {
    expect(planReminder({ ...base, reminder_count: 1 }, at(5), NOW)).toMatchObject({ send: true, stage: 2 });
    expect(planReminder({ ...base, reminder_count: 2 }, at(-3), NOW)).toMatchObject({ send: true, stage: 3 });
  });
  it("stops after 3 reminders in the same cycle", () => {
    expect(planReminder({ ...base, reminder_count: 3 }, at(-30), NOW)).toMatchObject({ send: false, reason: "limitReached" });
  });
  it("a dog added late gets ONE reminder, not all three", () => {
    const r = planReminder(base, at(2), NOW);
    expect(r).toMatchObject({ send: true, stage: 2, newCount: 2 });
  });
  it("a new groom starts a new cycle and resets the count", () => {
    const dog = { ...base, last_groom_date: "2026-02-20", reminder_count: 3, reminder_cycle_date: "2026-01-01" };
    expect(planReminder(dog, at(14), NOW)).toMatchObject({ send: true, stage: 1 });
  });
  it("keeps 2 days between reminders", () => {
    const dog = { ...base, reminder_count: 1, last_reminder_sent_at: "2026-03-01T01:00:00Z", last_reminder_result: "sent" };
    expect(planReminder(dog, at(5), NOW)).toMatchObject({ send: false, reason: "cooldown" });
  });
  it("retries a failed send after 20 hours, not before", () => {
    const failed = { ...base, last_reminder_result: "failed" };
    expect(planReminder({ ...failed, last_reminder_sent_at: "2026-03-01T01:00:00Z" }, at(14), NOW)).toMatchObject({ send: false, reason: "retryWait" });
    expect(planReminder({ ...failed, last_reminder_sent_at: "2026-02-28T10:00:00Z" }, at(14), NOW).send).toBe(true);
  });
  it("falls back to the old 5-day rule if the migration is not run", () => {
    const legacy = { last_groom_date: "2026-01-01", interval_weeks: 8 };
    expect(planReminder(legacy, at(3), NOW).send).toBe(true);
    expect(planReminder(legacy, at(20), NOW).send).toBe(false);
    expect(planReminder({ ...legacy, last_reminder_sent_at: "2026-02-27T10:00:00Z" }, at(3), NOW).send).toBe(false);
  });
});

describe("planReminder: lapsed, failures, typo fixes", () => {
  it("does not email a dog that is more than 30 days overdue", () => {
    expect(planReminder(base, at(-45), NOW)).toMatchObject({ send: false, reason: "lapsed" });
    expect(planReminder(base, at(-25), NOW).send).toBe(true);
  });
  it("gives up after 3 failed attempts in a cycle", () => {
    const dog = { ...base, last_reminder_result: "failed", reminder_fail_count: 3, last_reminder_sent_at: "2026-02-20T10:00:00Z" };
    expect(planReminder(dog, at(14), NOW)).toMatchObject({ send: false, reason: "gaveUp" });
    expect(planReminder({ ...dog, reminder_fail_count: 2 }, at(14), NOW).send).toBe(true);
  });
  it("a small fix to the last-groom date does not restart the cycle", () => {
    const dog = { ...base, last_groom_date: "2026-01-03", reminder_count: 2, reminder_cycle_date: "2026-01-01" };
    expect(planReminder(dog, at(5), NOW)).toMatchObject({ send: false });
    const moved = { ...base, last_groom_date: "2026-02-20", reminder_count: 2, reminder_cycle_date: "2026-01-01" };
    expect(planReminder(moved, at(14), NOW).send).toBe(true);
  });
});
