import { describe, it, expect } from "vitest";
import { computeStatus } from "../lib/breedIntervals";

describe("computeStatus", () => {
  it("is 'ok' when well within the interval", () => {
    const dog = { last_groom_date: "2026-01-01", interval_weeks: 6 };
    const now = new Date("2026-01-05T12:00:00Z");
    const result = computeStatus(dog, now, "UTC");
    expect(result.status).toBe("ok");
    expect(result.daysLeft).toBeGreaterThan(7);
  });

  it("is 'soon' within 7 days of the due date", () => {
    const dog = { last_groom_date: "2026-01-01", interval_weeks: 1 }; // due 2026-01-08
    const now = new Date("2026-01-05T12:00:00Z");
    const result = computeStatus(dog, now, "UTC");
    expect(result.status).toBe("soon");
    expect(result.daysLeft).toBe(3);
  });

  it("is 'overdue' once past the due date", () => {
    const dog = { last_groom_date: "2026-01-01", interval_weeks: 1 }; // due 2026-01-08
    const now = new Date("2026-01-10T12:00:00Z");
    const result = computeStatus(dog, now, "UTC");
    expect(result.status).toBe("overdue");
    expect(result.daysLeft).toBeLessThan(0);
  });

  it("treats the due date itself as 0 days left, not -1 or 1", () => {
    const dog = { last_groom_date: "2026-01-01", interval_weeks: 1 }; // due 2026-01-08
    const now = new Date("2026-01-08T23:00:00Z");
    const result = computeStatus(dog, now, "UTC");
    expect(result.daysLeft).toBe(0);
    expect(result.status).toBe("soon");
  });

  it("defaults to UTC when no timezone is given, without throwing", () => {
    const dog = { last_groom_date: "2026-01-01", interval_weeks: 6 };
    expect(() => computeStatus(dog)).not.toThrow();
  });

  it("falls back to the raw date rather than throwing on an invalid timezone string", () => {
    const dog = { last_groom_date: "2026-01-01", interval_weeks: 6 };
    const now = new Date("2026-01-05T12:00:00Z");
    expect(() => computeStatus(dog, now, "Not/ARealZone")).not.toThrow();
  });

  it("a day boundary can shift status depending on timezone", () => {
    // Due exactly at 2026-01-08T00:00:00Z. At 2026-01-07T23:30 UTC that's
    // still "tomorrow" in UTC (1 day left) but already "today" in a zone
    // far enough ahead of UTC (e.g. Asia/Kolkata, UTC+5:30) -> 0 days left.
    const dog = { last_groom_date: "2026-01-01", interval_weeks: 1 };
    const now = new Date("2026-01-07T23:30:00Z");
    const utcResult = computeStatus(dog, now, "UTC");
    const kolkataResult = computeStatus(dog, now, "Asia/Kolkata");
    expect(utcResult.daysLeft).toBe(1);
    expect(kolkataResult.daysLeft).toBe(0);
  });
});
