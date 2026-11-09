import { describe, it, expect } from "vitest";
import { validatePaymentSettings, readMethods, methodsText, receiptNumber, validatePaid, paidSummary } from "./payments";

describe("validatePaymentSettings", () => {
  it("keeps valid methods, trims details and drops duplicates", () => {
    const r = validatePaymentSettings({ methods: [{ type: "venmo", detail: " @maya " }, { type: "cash" }, { type: "venmo", detail: "@x" }], note: " Pay after the groom " });
    expect(r.values.payment_methods).toEqual([{ type: "venmo", detail: "@maya" }, { type: "cash" }]);
    expect(r.values.payment_note).toBe("Pay after the groom");
  });
  it("rejects unknown methods and long text", () => {
    expect(validatePaymentSettings({ methods: [{ type: "bitcoin" }] }).error).toBeTruthy();
    expect(validatePaymentSettings({ methods: [{ type: "venmo", detail: "x".repeat(81) }] }).error).toBeTruthy();
    expect(validatePaymentSettings({ methods: [], note: "x".repeat(201) }).error).toBeTruthy();
  });
  it("allows no methods at all", () => {
    expect(validatePaymentSettings({}).values).toEqual({ payment_methods: [], payment_note: null });
  });
});

describe("helpers", () => {
  it("reads stored methods and ignores junk", () => {
    expect(readMethods([{ type: "cash" }, { type: "nope" }, null, { type: "zelle", detail: "a@b.co" }])).toEqual([
      { type: "cash", label: "Cash", detail: "" },
      { type: "zelle", label: "Zelle", detail: "a@b.co" },
    ]);
    expect(readMethods(null)).toEqual([]);
  });
  it("writes methods as text", () => {
    const m = readMethods([{ type: "cash" }, { type: "venmo", detail: "@maya" }]);
    expect(methodsText(m)).toBe("Cash, Venmo (@maya)");
    expect(methodsText(m, { withDetails: false })).toBe("Cash, Venmo");
  });
  it("makes a stable receipt number", () => {
    expect(receiptNumber("3f2a9c1e-1111-2222-3333-444455556666")).toBe("PD-3F2A9C1E");
  });
});

describe("validatePaid", () => {
  it("defaults the amount to the booking price", () => {
    expect(validatePaid({ method: "card" }, { price: 60 }).values).toEqual({ amount: 60, method: "card" });
  });
  it("accepts a different amount and rounds it", () => {
    expect(validatePaid({ method: "cash", amount: "62.505" }, { price: 60 }).values.amount).toBe(62.51);
  });
  it("needs a method and an amount", () => {
    expect(validatePaid({ amount: 5 }, {}).error).toBeTruthy();
    expect(validatePaid({ method: "cash" }, { price: null }).error).toBeTruthy();
    expect(validatePaid({ method: "cash", amount: -1 }, {}).error).toBeTruthy();
  });
  it("describes a payment", () => {
    expect(paidSummary({ paid_at: "2026-11-07T12:00:00Z", paid_amount: 60, paid_method: "card", currency: "GBP" }, "UTC")).toBe("Paid £60 by Card on Nov 7");
    expect(paidSummary({}, "UTC")).toBe("");
  });
});
