import { describe, it, expect } from "vitest";
import { priceSelection, menuRequiresChoice, publicService } from "./bookingServices";

const full = { id: "s1", name: "Full groom", kind: "main", pricing_mode: "by_size", price_small: 45, price_medium: 65, price_large: 90, is_starting_price: true, duration_minutes: 90 };
const bath = { id: "s2", name: "Bath", kind: "main", pricing_mode: "flat", price: 40 };
const nails = { id: "a1", name: "Nail trim", kind: "addon", pricing_mode: "flat", price: 15, duration_minutes: 10 };
const menu = [full, bath, nails];

describe("priceSelection", () => {
  it("has no opinion when there is no menu", () => {
    expect(priceSelection([], {}).value).toBe(null);
    expect(priceSelection([nails], {}).value).toBe(null); // add-ons alone are not a menu
    expect(menuRequiresChoice([bath])).toBe(true);
  });
  it("requires a real, active main service", () => {
    expect(priceSelection(menu, {}).error).toMatch(/service/);
    expect(priceSelection(menu, { serviceId: "nope" }).error).toMatch(/service/);
    expect(priceSelection(menu, { serviceId: "a1" }).error).toMatch(/service/); // an add-on is not a main service
  });
  it("prices a flat service", () => {
    const r = priceSelection(menu, { serviceId: "s2" }).value;
    expect(r.total).toBe(40);
    expect(r.size).toBe(null);
    expect(r.isStarting).toBe(false);
  });
  it("needs a size for size-priced services and uses it", () => {
    expect(priceSelection(menu, { serviceId: "s1" }).error).toMatch(/size/);
    expect(priceSelection(menu, { serviceId: "s1", size: "huge" }).error).toMatch(/size/);
    const r = priceSelection(menu, { serviceId: "s1", size: "medium" }).value;
    expect(r.total).toBe(65);
    expect(r.isStarting).toBe(true);
    expect(r.durationMinutes).toBe(90);
  });
  it("adds add-ons and counts each once", () => {
    const r = priceSelection(menu, { serviceId: "s1", size: "large", addonIds: ["a1", "a1"] }).value;
    expect(r.total).toBe(105);
    expect(r.addons).toHaveLength(1);
    expect(r.durationMinutes).toBe(100);
    expect(r.lines.map((l) => l.name)).toEqual(["Full groom", "Nail trim"]);
  });
  it("rejects add-ons that are unknown, are main services, or too many", () => {
    expect(priceSelection(menu, { serviceId: "s2", addonIds: ["zzz"] }).error).toMatch(/add-on/);
    expect(priceSelection(menu, { serviceId: "s2", addonIds: ["s1"] }).error).toMatch(/add-on/);
    expect(priceSelection(menu, { serviceId: "s2", addonIds: Array.from({ length: 11 }, (_, i) => "x" + i) }).error).toMatch(/not valid/);
    expect(priceSelection(menu, { serviceId: "s2", addonIds: "a1" }).error).toMatch(/not valid/);
  });
  it("ignores a client-sent price", () => {
    const r = priceSelection(menu, { serviceId: "s2", price: 1, total: 1 }).value;
    expect(r.total).toBe(40);
  });
  it("sums cents exactly", () => {
    const m = [{ id: "m", kind: "main", pricing_mode: "flat", price: 0.1 }, { id: "x", kind: "addon", pricing_mode: "flat", price: 0.2 }];
    expect(priceSelection(m, { serviceId: "m", addonIds: ["x"] }).value.total).toBe(0.3);
  });
  it("works on the public shape too", () => {
    const pub = menu.map((r) => publicService({ ...r, category: "G", description: "" }));
    expect(priceSelection(pub, { serviceId: "s1", size: "small" }).value.total).toBe(45);
  });
});
