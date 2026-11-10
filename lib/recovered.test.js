import { describe, it, expect } from "vitest";
import { buildRecovered } from "./recovered";

const now = new Date("2026-11-09T12:00:00Z");
const opts = { now, monthStart: new Date("2026-11-01T00:00:00Z"), prevMonthStart: new Date("2026-10-01T00:00:00Z"), currency: "GBP" };
const b = (o) => ({ currency: "GBP", created_at: "2026-11-03T10:00:00Z", slot_at: "2026-11-12T10:00:00Z", ...o });

describe("buildRecovered", () => {
  const rows = [
    b({ service_name: "Full groom", price: 60, addons: [{ name: "Nail trim", price: 15 }] }),
    b({ service_name: "Full groom", price: 45 }),
    b({ service_name: "Bath", price: 40, slot_at: "2026-11-02T10:00:00Z" }),
    b({ price: null }),
    b({ service_name: "USD", price: 99, currency: "USD" }),
    b({ service_name: "Full groom", price: 50, created_at: "2026-10-15T10:00:00Z", slot_at: "2026-10-20T10:00:00Z" }),
    b({ service_name: "Old", price: 30, created_at: "2026-08-01T10:00:00Z", slot_at: "2026-08-05T10:00:00Z" }),
  ];
  const r = buildRecovered(rows, opts);

  it("counts every booking but only prices real ones in this currency", () => {
    expect(r.month).toEqual({ count: 5, revenue: 145, priced: 3, unpriced: 2 });
    expect(r.allTime.revenue).toBe(225);
    expect(r.allTime.count).toBe(7);
  });
  it("splits money by service and keeps add-ons separate", () => {
    expect(r.byService.map((s) => [s.name, s.count, s.revenue])).toEqual([["Full groom", 2, 90], ["Bath", 1, 40]]);
    expect(r.addons).toEqual({ count: 1, revenue: 15 });
    expect(r.byService[0].share).toBe(62);
  });
  it("compares with last month", () => {
    expect(r.prevMonth).toEqual({ count: 1, revenue: 50 });
    expect(r.deltaPct).toBe(190);
  });
  it("shows what is already booked for the next 7 days", () => {
    expect(r.upcoming.count).toBe(4);
    expect(r.upcoming.revenue).toBe(105);
  });
  it("returns 8 weekly buckets, oldest first, ending now", () => {
    expect(r.weeks).toHaveLength(8);
    expect(r.weeks[7].count).toBe(5);
  });
  it("never invents money", () => {
    const e = buildRecovered([b({ price: null }), b({ price: null })], opts);
    expect(e.month.revenue).toBe(0);
    expect(e.deltaPct).toBeNull();
    expect(buildRecovered([], opts).allTime.count).toBe(0);
  });
});
