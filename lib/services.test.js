import { describe, it, expect } from "vitest";
import { validateServiceInput, validateShopSettings, priceLabel, priceForSize, groupServices, durationLabel, currencySymbol, DEFAULT_SIZE_GUIDE } from "./services";

describe("validateServiceInput", () => {
  it("accepts a flat-price service", () => {
    const r = validateServiceInput({ name: " Full groom ", category: "Grooming", price: "65" });
    expect(r.values).toMatchObject({ name: "Full groom", category: "Grooming", pricing_mode: "flat", price: 65, is_active: true });
  });
  it("defaults the category", () => {
    expect(validateServiceInput({ name: "Nail trim", price: 15 }).values.category).toBe("General");
  });
  it("needs a name and a price", () => {
    expect(validateServiceInput({ price: 10 }).error).toMatch(/name/i);
    expect(validateServiceInput({ name: "x" }).error).toMatch(/price/i);
  });
  it("rejects bad prices", () => {
    expect(validateServiceInput({ name: "x", price: "abc" }).error).toMatch(/number/);
    expect(validateServiceInput({ name: "x", price: -1 }).error).toMatch(/number/);
    expect(validateServiceInput({ name: "x", price: 10001 }).error).toMatch(/number/);
  });
  it("requires all three prices for by-size", () => {
    expect(validateServiceInput({ name: "x", pricingMode: "by_size", priceSmall: 40, priceMedium: 55 }).error).toMatch(/large/);
    const r = validateServiceInput({ name: "x", pricingMode: "by_size", priceSmall: 40, priceMedium: 55, priceLarge: 70.5 });
    expect(r.values).toMatchObject({ pricing_mode: "by_size", price: null, price_small: 40, price_medium: 55, price_large: 70.5 });
  });
  it("rejects over-long text", () => {
    expect(validateServiceInput({ name: "a".repeat(61), price: 1 }).error).toMatch(/too long/);
    expect(validateServiceInput({ name: "a", description: "d".repeat(201), price: 1 }).error).toMatch(/too long/);
  });
});

describe("price helpers", () => {
  const flat = { pricing_mode: "flat", price: 65 };
  const sized = { pricing_mode: "by_size", price_small: 40, price_medium: 55, price_large: 70.5 };
  it("labels prices", () => {
    expect(priceLabel(flat)).toBe("$65");
    expect(priceLabel(sized)).toBe("$40 - $70.50");
    expect(priceLabel({ pricing_mode: "by_size", price_small: 30, price_medium: 30, price_large: 30 })).toBe("$30");
  });
  it("finds the price for a size", () => {
    expect(priceForSize(flat, "large")).toBe(65);
    expect(priceForSize(sized, "medium")).toBe(55);
    expect(priceForSize(null, "small")).toBe(null);
  });
});

describe("groupServices", () => {
  it("groups by category in the groomer's order", () => {
    const g = groupServices([
      { name: "B", category: "Add-ons", sort_order: 2 },
      { name: "A", category: "Grooming", sort_order: 1 },
      { name: "C", category: "Grooming", sort_order: 3 },
    ]);
    expect(g.map((x) => x.category)).toEqual(["Grooming", "Add-ons"]);
    expect(g[0].items.map((x) => x.name)).toEqual(["A", "C"]);
  });
});

describe("kind, starting price and time", () => {
  it("stores add-ons, starting price and duration", () => {
    const r = validateServiceInput({ name: "De-matting", kind: "addon", price: 20, isStartingPrice: true, durationMinutes: "30" });
    expect(r.values).toMatchObject({ kind: "addon", is_starting_price: true, duration_minutes: 30 });
    expect(validateServiceInput({ name: "x", price: 1 }).values).toMatchObject({ kind: "main", is_starting_price: false, duration_minutes: null });
  });
  it("rejects a bad duration", () => {
    expect(validateServiceInput({ name: "x", price: 1, durationMinutes: 2 }).error).toMatch(/minutes/);
    expect(validateServiceInput({ name: "x", price: 1, durationMinutes: 1.5 }).error).toMatch(/minutes/);
  });
  it("marks starting prices with a plus", () => {
    expect(priceLabel({ pricing_mode: "flat", price: 65, is_starting_price: true })).toBe("$65+");
    expect(priceLabel({ pricing_mode: "flat", price: 65 }, "£")).toBe("£65");
  });
  it("labels durations", () => {
    expect(durationLabel(45)).toBe("45 min");
    expect(durationLabel(90)).toBe("1 h 30 min");
    expect(durationLabel(120)).toBe("2 h");
    expect(durationLabel(null)).toBe("");
  });
  it("filters by kind", () => {
    const list = [{ name: "A", kind: "main", category: "G" }, { name: "B", kind: "addon", category: "Add-ons" }];
    expect(groupServices(list, "addon").flatMap((g) => g.items.map((i) => i.name))).toEqual(["B"]);
    expect(groupServices(list, "main").flatMap((g) => g.items.map((i) => i.name))).toEqual(["A"]);
  });
});

describe("validateShopSettings", () => {
  it("accepts a currency and fills the size guide defaults", () => {
    const r = validateShopSettings({ currency: "gbp", sizeGuide: { small: "Up to 8 kg" }, bookingNote: "  Please arrive 5 minutes early.  " });
    expect(r.values.currency).toBe("GBP");
    expect(r.values.size_guide).toEqual({ small: "Up to 8 kg", medium: DEFAULT_SIZE_GUIDE.medium, large: DEFAULT_SIZE_GUIDE.large });
    expect(r.values.booking_note).toBe("Please arrive 5 minutes early.");
  });
  it("rejects an unknown currency and a long note", () => {
    expect(validateShopSettings({ currency: "XYZ" }).error).toMatch(/currency/i);
    expect(validateShopSettings({ currency: "USD", bookingNote: "x".repeat(501) }).error).toMatch(/too long/);
  });
  it("maps symbols", () => {
    expect(currencySymbol("GBP")).toBe("£");
    expect(currencySymbol("AUD")).toBe("$");
    expect(currencySymbol("nope")).toBe("$");
  });
});
