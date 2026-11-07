import { describe, it, expect } from "vitest";
import { describeBooking, moneyText } from "./bookingDetails";

describe("moneyText", () => {
  it("formats amounts and currencies", () => {
    expect(moneyText(65, "USD")).toBe("$65");
    expect(moneyText("80", "GBP", true)).toBe("£80+");
    expect(moneyText(12.5, "EUR")).toBe("€12.50");
    expect(moneyText(null, "USD")).toBe("");
    expect(moneyText("", "USD")).toBe("");
  });
});

describe("describeBooking", () => {
  const row = {
    service_name: "Full groom", dog_size: "medium", price: 80, price_is_starting: true, currency: "GBP",
    addons: [{ id: "a", name: "Nail trim", price: 15, starting: false }], duration_minutes: 100,
  };
  it("is null for a booking without a service", () => {
    expect(describeBooking({ slot_at: "x" })).toBe(null);
    expect(describeBooking(null)).toBe(null);
  });
  it("describes service, size, add-ons and total", () => {
    const d = describeBooking(row);
    expect(d.name).toBe("Full groom");
    expect(d.size).toBe("Medium");
    expect(d.total).toBe("£80+");
    expect(d.addons).toEqual([{ name: "Nail trim", price: "£15" }]);
    expect(d.short).toBe("Full groom + Nail trim");
    expect(d.withSize).toBe("Full groom (Medium) + Nail trim");
    expect(d.minutes).toBe(100);
    expect(d.duration).toBe("1 h 40 min");
  });
  it("copes with missing optional parts", () => {
    const d = describeBooking({ service_name: "Bath", price: 40, currency: "USD" });
    expect(d.total).toBe("$40");
    expect(d.size).toBe("");
    expect(d.addons).toEqual([]);
    expect(d.minutes).toBe(null);
    expect(d.withSize).toBe("Bath");
  });
});
