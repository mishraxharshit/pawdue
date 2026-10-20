import { describe, it, expect } from "vitest";
import { generateAvailableSlots, zonedWallTimeToUtcMs, groupSlotsByDay } from "./booking";

const base = { workingDays: [0, 1, 2, 3, 4, 5, 6], startTime: "09:00", endTime: "11:00", slotMinutes: 60, breakStart: null, breakEnd: null, daysAhead: 2 };
const now = new Date("2026-10-20T00:00:00Z");

describe("zonedWallTimeToUtcMs", () => {
  it("Kolkata 09:00 is 03:30 UTC", () => {
    expect(new Date(zonedWallTimeToUtcMs(2026, 10, 21, 9 * 60, "Asia/Kolkata")).toISOString()).toBe("2026-10-21T03:30:00.000Z");
  });
  it("New York 09:00 in summer (EDT) is 13:00 UTC, in winter (EST) 14:00 UTC", () => {
    expect(new Date(zonedWallTimeToUtcMs(2026, 7, 1, 540, "America/New_York")).toISOString()).toBe("2026-07-01T13:00:00.000Z");
    expect(new Date(zonedWallTimeToUtcMs(2026, 12, 1, 540, "America/New_York")).toISOString()).toBe("2026-12-01T14:00:00.000Z");
  });
  it("UTC is identity", () => {
    expect(new Date(zonedWallTimeToUtcMs(2026, 10, 21, 600, "UTC")).toISOString()).toBe("2026-10-21T10:00:00.000Z");
  });
});

describe("generateAvailableSlots in a time zone", () => {
  it("builds 09:00 and 10:00 in the groomer's zone", () => {
    const s = generateAvailableSlots(new Set(), base, "Asia/Kolkata", now);
    expect(s).toContain("2026-10-20T03:30:00.000Z"); // 09:00 IST today
    expect(s).toContain("2026-10-20T04:30:00.000Z"); // 10:00 IST today
    expect(s).not.toContain("2026-10-20T09:00:00.000Z"); // the old buggy UTC result
  });
  it("skips slots already in the past (in the groomer's zone)", () => {
    const late = new Date("2026-10-20T04:00:00Z"); // 09:30 IST
    const s = generateAvailableSlots(new Set(), base, "Asia/Kolkata", late);
    expect(s).not.toContain("2026-10-20T03:30:00.000Z");
    expect(s).toContain("2026-10-20T04:30:00.000Z");
  });
  it("respects taken slots and breaks", () => {
    const taken = new Set(["2026-10-20T03:30:00.000Z"]);
    const s = generateAvailableSlots(taken, { ...base, breakStart: "10:00", breakEnd: "11:00" }, "Asia/Kolkata", now);
    expect(s).not.toContain("2026-10-20T03:30:00.000Z");
    expect(s).not.toContain("2026-10-20T04:30:00.000Z");
  });
  it("uses the groomer's local calendar day for working days", () => {
    // 23:30 UTC Monday = 05:00 Tuesday in Kolkata; only Tuesdays are open
    const mondayNight = new Date("2026-10-19T23:30:00Z");
    const s = generateAvailableSlots(new Set(), { ...base, workingDays: [2], daysAhead: 1 }, "Asia/Kolkata", mondayNight);
    expect(s[0]).toBe("2026-10-20T03:30:00.000Z");
  });
  it("falls back to UTC for a bad zone", () => {
    const s = generateAvailableSlots(new Set(), base, "Not/AZone", now);
    expect(s).toContain("2026-10-20T09:00:00.000Z");
  });
});

describe("groupSlotsByDay", () => {
  it("groups by day in the given zone", () => {
    const g = groupSlotsByDay(["2026-10-20T20:30:00.000Z"], "Asia/Kolkata"); // 02:00 next day IST
    expect(Object.keys(g)[0]).toContain("Oct 21");
  });
});

import { localDateString } from "./booking";
describe("localDateString", () => {
  it("uses the groomer's date, not UTC", () => {
    const t = new Date("2026-03-10T20:00:00Z");
    expect(localDateString("Asia/Kolkata", t)).toBe("2026-03-11");
    expect(localDateString("America/New_York", t)).toBe("2026-03-10");
    expect(localDateString("Not/AZone", t)).toBe("2026-03-10");
  });
});
