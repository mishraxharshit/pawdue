import { describe, it, expect } from "vitest";
import { buildReminderEmail } from "./reminderEmail";

const dog = (name, extra = {}) => ({ dog_name: name, owner_name: "Sam", breed: "Poodle", booking_token: "t-" + name, ...extra });
const comp = (stage, status = "soon") => ({ status, due: new Date("2026-02-05T12:00:00Z"), plan: { stage } });
const biz = { name: "Happy Paws", phone: "555 0100" };

describe("buildReminderEmail stages", () => {
  it("uses different wording for each reminder", () => {
    const s1 = buildReminderEmail({ items: [{ dog: dog("Nova"), comp: comp(1, "ok") }], business: biz, appUrl: "https://x.test" });
    const s2 = buildReminderEmail({ items: [{ dog: dog("Nova"), comp: comp(2) }], business: biz, appUrl: "https://x.test" });
    const s3 = buildReminderEmail({ items: [{ dog: dog("Nova"), comp: comp(3, "overdue") }], business: biz, appUrl: "https://x.test" });
    expect(new Set([s1.subject, s2.subject, s3.subject]).size).toBe(3);
    expect(s1.subject).toMatch(/plan Nova/);
    expect(s3.text).toMatch(/was due/);
    expect(s3.text).toContain("https://x.test/book/t-Nova");
  });
  it("several dogs: most urgent stage wins, one email", () => {
    const e = buildReminderEmail({ items: [{ dog: dog("Nova"), comp: comp(1, "ok") }, { dog: dog("Biscuit"), comp: comp(3, "overdue") }], business: biz, appUrl: "https://x.test" });
    expect(e.subject).toMatch(/Nova and Biscuit/);
    expect(e.text).toMatch(/were due/);
  });
  it("still works without a stage (old behaviour)", () => {
    const e = buildReminderEmail({ items: [{ dog: dog("Nova"), comp: { status: "overdue", due: new Date("2026-02-05T12:00:00Z") } }], appUrl: "https://x.test" });
    expect(e.subject).toMatch(/see Nova again/);
  });
  it("has no em dashes", () => {
    const e = buildReminderEmail({ items: [{ dog: dog("Nova"), comp: comp(2) }], business: biz, appUrl: "https://x.test" });
    expect(e.text + e.html + e.subject).not.toContain(String.fromCharCode(8212));
  });
});
