import { describe, it, expect } from "vitest";
import { whatsappUrl, manualMessageText } from "./manualMessage";

const dog = { dog_name: "Nova", owner_name: "Sam" };

describe("whatsappUrl", () => {
  it("builds a wa.me link from a number with country code", () => {
    const u = whatsappUrl("+91 98765 43210", "Hi there");
    expect(u).toBe("https://wa.me/919876543210?text=Hi%20there");
  });
  it("returns null without a country code or with a bad length", () => {
    expect(whatsappUrl("9876543210", "x")).toBeNull();
    expect(whatsappUrl("+123", "x")).toBeNull();
    expect(whatsappUrl("", "x")).toBeNull();
  });
});

describe("manualMessageText", () => {
  const args = { dog, businessName: "Happy Paws", dueLabel: "Feb 5", bookingUrl: "https://x.test/book/t" };
  it("has different wording for lapsed, overdue and upcoming", () => {
    const l = manualMessageText({ ...args, view: "lapsed" });
    const o = manualMessageText({ ...args, view: "overdue" });
    const s = manualMessageText({ ...args, view: "soon" });
    expect(new Set([l, o, s]).size).toBe(3);
    expect(l).toMatch(/been a while/);
    expect(o).toMatch(/was due for a groom on Feb 5/);
    expect(s).toMatch(/due for a groom around Feb 5/);
    expect(l).toContain("https://x.test/book/t");
    expect(l).toContain("it is Happy Paws");
  });
  it("works without a salon name or link, and has no em dash", () => {
    const t = manualMessageText({ dog, view: "lapsed", dueLabel: "Feb 5" });
    expect(t.startsWith("Hi Sam, It has been")).toBe(true);
    expect(t).not.toContain(String.fromCharCode(8212));
  });
});
