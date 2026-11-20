import { describe, it, expect } from "vitest";
import { lapsedValue, minimumPrice, clamp, symbolFor } from "./tools";

describe("lapsedValue", () => {
  it("multiplies the groomer's own numbers", () => {
    const r = lapsedValue({ lapsed: 20, weeks: 6, price: 60, winBackPct: 25 });
    expect(r.visitsPerYear).toBe(8.7);
    expect(r.perDogYear).toBe(522);
    expect(r.yearly).toBe(10440);
    expect(r.monthly).toBe(870);
    expect(r.winBackCount).toBe(5);
    expect(r.winBackYearly).toBe(2610);
  });
  it("keeps silly input in range", () => {
    const r = lapsedValue({ lapsed: -5, weeks: 0, price: "abc", winBackPct: 400 });
    expect(r.lapsed).toBe(0);
    expect(r.yearly).toBe(0);
    expect(r.visitsPerYear).toBe(52);
  });
});

describe("minimumPrice", () => {
  const base = { hours: 2, hourly: 30, supplies: 4, monthlyOverhead: 400, groomsPerMonth: 80, feePct: 0 };
  it("adds labour, supplies and overhead", () => {
    const r = minimumPrice(base);
    expect(r.labour).toBe(60);
    expect(r.overheadPer).toBe(5);
    expect(r.minimum).toBe(69);
    expect(r.suggested).toBe(70);
  });
  it("takes card fees out of what the client pays", () => {
    const r = minimumPrice({ ...base, feePct: 3 });
    expect(r.minimum).toBeCloseTo(71.13, 2);
    // after a 3% fee on the minimum, the groomer keeps the 69 they need
    expect(r.minimum * 0.97).toBeCloseTo(69, 1);
  });
  it("never divides by zero", () => {
    expect(minimumPrice({ ...base, groomsPerMonth: 0 }).overheadPer).toBe(400);
    expect(Number.isFinite(minimumPrice({ ...base, feePct: 500 }).minimum)).toBe(true);
  });
  it("projects the month and the week", () => {
    const r = minimumPrice(base);
    expect(r.perMonth).toBe(5520);
    expect(r.perWeek).toBeCloseTo(1274.83, 1);
  });
});

describe("helpers", () => {
  it("clamps and finds symbols", () => {
    expect(clamp("x", 1, 5)).toBe(1);
    expect(clamp(9, 1, 5)).toBe(5);
    expect(symbolFor("GBP")).toBe("£");
    expect(symbolFor("???")).toBe("$");
  });
});
