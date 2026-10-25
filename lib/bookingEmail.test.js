import { describe, it, expect } from "vitest";
import { buildGroomerBookingEmail, buildCustomerBookingEmail, buildCancelEmail, buildEventIcs, formatSlot } from "./bookingEmail";
import { buildCalendar } from "./ical";

const dog = { dog_name: "Bruno", owner_name: "Sam", owner_email: "sam@example.com", phone: "+1 555 0100", breed: "Poodle" };
const slot = "2026-11-03T15:00:00.000Z";

describe("booking emails", () => {
  it("shows time in the groomer's time zone", () => {
    expect(formatSlot(slot, "America/New_York").time).toBe("10:00 AM");
    expect(formatSlot(slot, "Asia/Kolkata").time).toBe("8:30 PM");
  });
  it("groomer email has dog, owner contact and time", () => {
    const m = buildGroomerBookingEmail({ dog, slotIso: slot, timeZone: "America/New_York", dashboardUrl: "https://pawdue.pet/dashboard" });
    expect(m.subject).toContain("Bruno");
    expect(m.text).toContain("10:00 AM");
    expect(m.text).toContain("sam@example.com");
    expect(m.html).toContain("+1 555 0100");
  });
  it("customer email names the salon and escapes html", () => {
    const m = buildCustomerBookingEmail({ dog: { ...dog, owner_name: "<b>x</b>" }, slotIso: slot, timeZone: "UTC", salon: "Happy Paws", phone: "555" });
    expect(m.subject).toContain("Happy Paws");
    expect(m.html).not.toContain("<b>x</b>");
  });
  it("cancel email links to rebook", () => {
    const m = buildCancelEmail({ dog, slotIso: slot, timeZone: "UTC", salon: "Happy Paws", bookUrl: "https://pawdue.pet/book/abc" });
    expect(m.text).toContain("https://pawdue.pet/book/abc");
    expect(m.subject).toMatch(/cancelled/i);
  });
});

describe("calendar files", () => {
  it("event file is valid and has an alarm", () => {
    const ics = buildEventIcs({ id: "1", slotIso: slot, minutes: 60, summary: "Bruno; groom, ok" });
    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics).toContain("DTSTART:20261103T150000Z");
    expect(ics).toContain("DTEND:20261103T160000Z");
    expect(ics).toContain(String.raw`SUMMARY:Bruno\; groom\, ok`);
    expect(ics).toContain("BEGIN:VALARM");
  });
  it("feed escapes semicolons and refreshes every 15 min", () => {
    const ics = buildCalendar([{ id: "1", slot_at: slot, dogName: "A;B" }], {});
    expect(ics).toContain(String.raw`SUMMARY:Groom: A\;B`);
    expect(ics).toContain("PT15M");
  });
});
