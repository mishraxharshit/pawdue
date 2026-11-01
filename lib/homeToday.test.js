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
