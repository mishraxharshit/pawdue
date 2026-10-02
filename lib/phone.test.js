import { describe, it, expect } from "vitest";
import { parsePhone } from "./phone";

describe("parsePhone", () => {
  it("splits a US number into country + local digits", () => {
    expect(parsePhone("+19876543210")).toEqual({ countryCode: "US", local: "9876543210" });
  });

  it("splits an India number correctly", () => {
    expect(parsePhone("+919876543210")).toEqual({ countryCode: "IN", local: "9876543210" });
  });

  it("matches the longest dial code first, so a 3-digit code isn't shadowed by a 1-digit one", () => {
    // UAE is +971 - if dial-code matching weren't longest-first, a naive
    // implementation could mis-split this against an unrelated 1-digit code.
    expect(parsePhone("+971501234567")).toEqual({ countryCode: "AE", local: "501234567" });
  });

  it("strips non-digit characters (spaces, dashes) before matching", () => {
    expect(parsePhone("+91 98765-43210")).toEqual({ countryCode: "IN", local: "9876543210" });
  });

  it("falls back to the default country for an empty value", () => {
    expect(parsePhone("")).toEqual({ countryCode: "US", local: "" });
  });

  it("falls back gracefully on a number with no recognized dial code", () => {
    const result = parsePhone("123");
    expect(result.local.length).toBeGreaterThan(0);
  });
});
