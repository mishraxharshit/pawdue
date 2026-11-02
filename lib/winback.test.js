import { describe, it, expect } from "vitest";
import { buildWinbackEmail, cleanMessage, winbackTooSoon, daysSince } from "./winback";

const dog = { dog_name: "Rosie", owner_name: "Liam" };

describe("buildWinbackEmail", () => {
  it("puts the salon in the subject and the book link in text and html", () => {
    const e = buildWinbackEmail({ dog, message: "Hi Liam, it has been a while.", salon: "Happy Paws", phone: "+1 555", bookUrl: "https://pawdue.pet/book/abc" });
    expect(e.subject).toBe("We would love to see Rosie again | Happy Paws");
    expect(e.text).toContain("Book a time: https://pawdue.pet/book/abc");
    expect(e.text).toContain("call +1 555");
    expect(e.html).toContain('href="https://pawdue.pet/book/abc"');
    expect(e.html).toContain("Book Rosie's slot");
    expect(e.text).toContain('choose "Stop reminders"');
    expect(e.html).toContain("Stop reminders");
  });
  it("escapes html in the message and works without salon, phone or link", () => {
    const e = buildWinbackEmail({ dog, message: "<script>x</script>\nline two" });
    expect(e.html).not.toContain("<script>");
    expect(e.html).toContain("&lt;script&gt;");
    expect(e.html).toContain("<br>");
    expect(e.subject).toBe("We would love to see Rosie again");
    expect(e.text).toContain("Just reply to this email");
    expect(e.html).not.toContain("Book Rosie");
    expect(e.text).toContain("Reply STOP");
  });
});

describe("cleanMessage", () => {
  it("trims, bounds and rejects empty", () => {
    expect(cleanMessage("  hi  ")).toBe("hi");
    expect(cleanMessage("   ")).toBeNull();
    expect(cleanMessage(undefined)).toBeNull();
    expect(cleanMessage("a".repeat(5000))).toHaveLength(1000);
  });
});

describe("winbackTooSoon", () => {
  const now = new Date("2026-03-10T12:00:00Z");
  it("blocks a repeat within 7 days only", () => {
    expect(winbackTooSoon("2026-03-08T12:00:00Z", now)).toBe(true);
    expect(winbackTooSoon("2026-03-01T12:00:00Z", now)).toBe(false);
    expect(winbackTooSoon(null, now)).toBe(false);
    expect(daysSince("garbage", now)).toBeNull();
  });
});
