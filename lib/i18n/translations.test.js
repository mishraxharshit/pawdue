import { describe, it, expect } from "vitest";
import { t } from "./translations";

describe("t (translate)", () => {
  it("returns the string for a valid key and language", () => {
    expect(t("en", "nav.pricing")).toBe("Pricing");
    expect(t("es", "nav.pricing")).toBe("Precios");
  });

  it("substitutes {variables} in the string", () => {
    const result = t("en", "booking.confirmed", { dog: "Nova", when: "Mon 10am" });
    expect(result).toBe("You're booked! 🎉 See you for Nova's groom on Mon 10am.");
  });

  it("falls back to English when a key is missing in the requested language", () => {
    // Every language object currently has every key, but this guards the
    // fallback path for whenever a new key is added to one language first.
    const result = t("xx", "nav.pricing");
    expect(result).toBe("Pricing");
  });

  it("falls back to the raw path if the key doesn't exist anywhere", () => {
    expect(t("en", "nav.doesNotExist")).toBe("nav.doesNotExist");
  });
});
