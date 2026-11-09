import { describe, it, expect } from "vitest";
import { buildInsights } from "./insights";

const now = new Date("2026-11-07T12:00:00Z");
const b = (o) => ({ status: "confirmed", currency: "GBP", created_at: "2026-11-01T10:00:00Z", slot_at: "2026-11-10T10:00:00Z", ...o });

describe("buildInsights", () => {
  const rows = [
    b({ service_name: "Full groom", price: 60, addons: [{ name: "Nail trim", price: 15 }], dog_size: "small", slot_at: "2026-11-07T09:00:00Z", paid_at: "2026-11-07T10:00:00Z", paid_amount: 60 }),
    b({ service_name: "Full groom", price: 90, price_is_starting: true, dog_size: "large" }),
    b({ service_name: "Bath", price: 40, dog_size: "small", slot_at: "2026-11-03T09:00:00Z" }),
    b({ price: null }),
    b({ service_name: "Old", price: 10, created_at: "2026-06-01T10:00:00Z" }),
    b({ service_name: "USD thing", price: 99, currency: "USD" }),
  ];
  const r = buildInsights(rows, { range: 30, now, currency: "GBP" });

  it("counts only the chosen window", () => {
    expect(r.bookings).toBe(5);
    expect(buildInsights(rows, { range: "all", now, currency: "GBP" }).bookings).toBe(6);
  });
  it("sums real prices and keeps other currencies out", () => {
    expect(r.priced).toBe(3);
    expect(r.bookedValue).toBe(190);
    expect(r.otherCurrency).toBe(1);
    expect(r.unpriced).toBe(1);
    expect(r.hasStarting).toBe(true);
    expect(r.avgTicket).toBeCloseTo(63.33, 2);
  });
  it("splits the service from its add-ons", () => {
    const full = r.byService.find((s) => s.name === "Full groom");
    expect(full).toMatchObject({ count: 2, revenue: 135 });
    expect(r.byService[0].name).toBe("Full groom");
    expect(r.byService.reduce((t, s) => t + s.share, 0)).toBeGreaterThanOrEqual(99);
    expect(r.addons).toEqual([{ name: "Nail trim", count: 1, revenue: 15 }]);
    expect(r.addonRate).toBe(33);
  });
  it("counts sizes, weekdays and busiest day", () => {
    expect(r.sizes).toEqual({ small: 2, medium: 0, large: 1 });
    expect(r.weekdays.find((d) => d.name === "Tuesday").count).toBe(4);
    expect(r.busiest).toBe("Tuesday");
  });
  it("tracks collected and awaiting payment", () => {
    expect(r.collected).toEqual({ count: 1, amount: 60 });
    // Nov 3 (Bath) is past and unpaid; Nov 7 09:00 is paid
    expect(r.awaiting.count).toBe(1);
    expect(r.awaiting.amount).toBe(40);
  });
  it("is safe with no data", () => {
    const e = buildInsights([], { now });
    expect(e.bookings).toBe(0);
    expect(e.avgTicket).toBeNull();
    expect(e.busiest).toBeNull();
  });
});
