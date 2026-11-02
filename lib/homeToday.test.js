import { describe, it, expect } from "vitest";
import { dayKey, timeLabel } from "./homeToday";

describe("dayKey", () => {
  it("uses the groomer's time zone, not UTC", () => {
    const t = "2026-03-10T02:30:00Z";
    expect(dayKey(t, "UTC")).toBe("2026-03-10");
    expect(dayKey(t, "America/Los_Angeles")).toBe("2026-03-09");
    expect(dayKey(t, "Australia/Sydney")).toBe("2026-03-10");
  });
  it("falls back on a bad time zone", () => {
    expect(dayKey("2026-03-10T02:30:00Z", "Nope/Zone")).toBe("2026-03-10");
  });
});

describe("timeLabel", () => {
  it("formats in the given zone", () => {
    expect(timeLabel("2026-03-10T17:00:00Z", "America/New_York")).toMatch(/1:00\s?PM/);
  });
});

import { greetingFor, weekStats, failedReminderDogs, comingUp } from "./homeToday";

describe("greetingFor", () => {
  it("follows the groomer's local hour", () => {
    const t = "2026-03-10T08:00:00Z";
    expect(greetingFor(t, "UTC")).toBe("Good morning");
    expect(greetingFor(t, "Australia/Sydney")).toBe("Good evening"); // 7pm
    expect(greetingFor("2026-03-10T14:00:00Z", "UTC")).toBe("Good afternoon");
  });
});

describe("weekStats", () => {
  const now = new Date("2026-03-10T12:00:00Z");
  const dogs = [
    { last_reminder_sent_at: "2026-03-09T00:00:00Z", last_reminder_result: "sent" },
    { last_reminder_sent_at: "2026-03-08T00:00:00Z" },
    { last_reminder_sent_at: "2026-03-01T00:00:00Z", last_reminder_result: "sent" }, // too old
    { last_reminder_sent_at: "2026-03-09T00:00:00Z", last_reminder_result: "failed" },
    {},
  ];
  const bookings = [{ created_at: "2026-03-09T10:00:00Z" }, { created_at: "2026-02-01T10:00:00Z" }, {}];
  it("counts only the last 7 days", () => {
    expect(weekStats(dogs, bookings, now)).toEqual({ reminded: 2, failed: 1, booked: 1 });
  });
  it("handles empty input", () => {
    expect(weekStats(undefined, undefined, now)).toEqual({ reminded: 0, failed: 0, booked: 0 });
  });
});

describe("failedReminderDogs / comingUp", () => {
  it("finds failed dogs", () => {
    expect(failedReminderDogs([{ id: 1, last_reminder_result: "failed" }, { id: 2 }]).map((d) => d.id)).toEqual([1]);
  });
  it("lists soon dogs soonest first", () => {
    const due = new Date("2026-03-12T10:00:00Z");
    const rows = [
      { view: "ok", dog: { id: "a", dog_name: "A" }, comp: { daysLeft: 20, due } },
      { view: "soon", dog: { id: "b", dog_name: "B", owner_email: "x@y.z" }, comp: { daysLeft: 5, due } },
      { view: "soon", dog: { id: "c", dog_name: "C" }, comp: { daysLeft: 1, due } },
    ];
    const out = comingUp(rows, "UTC");
    expect(out.map((o) => o.id)).toEqual(["c", "b"]);
    expect(out[0].when).toBe("Tomorrow");
    expect(out[1].when).toBe("Thu");
    expect(out[1].hasEmail).toBe(true);
  });
});
