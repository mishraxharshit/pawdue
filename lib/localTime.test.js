import { describe, it, expect } from "vitest";
import { localHour } from "./localTime";

describe("localHour", () => {
  it("returns the UTC hour for UTC", () => {
    expect(localHour(new Date("2026-01-07T13:20:00Z"), "UTC")).toBe(13);
  });

  it("handles a half-hour offset zone (India, UTC+5:30)", () => {
    expect(localHour(new Date("2026-01-07T03:05:00Z"), "Asia/Kolkata")).toBe(8); // 08:35 IST
    expect(localHour(new Date("2026-01-07T04:05:00Z"), "Asia/Kolkata")).toBe(9); // 09:35 IST
  });

  it("handles a negative-offset zone (Los Angeles, UTC-8 in January)", () => {
    expect(localHour(new Date("2026-01-07T17:05:00Z"), "America/Los_Angeles")).toBe(9);
  });

  it("returns 0 (not 24) at local midnight", () => {
    expect(localHour(new Date("2026-01-07T00:30:00Z"), "UTC")).toBe(0);
  });

  it("falls back to the UTC hour for an invalid timezone instead of throwing", () => {
    expect(localHour(new Date("2026-01-07T10:00:00Z"), "Not/AZone")).toBe(10);
  });
});
