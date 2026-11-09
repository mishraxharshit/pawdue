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

import { describeBooking } from "./bookingDetails";
import { buildCustomerBookingEmail as custEmail, buildGroomerBookingEmail as groomerEmail, buildCancelEmail as cancelEmail } from "./bookingEmail";

describe("emails with a service", () => {
  const dog = { dog_name: "Bella", owner_name: "Emma", breed: "Maltese" };
  const details = describeBooking({
    service_name: "Full groom", dog_size: "medium", price: 80, price_is_starting: true, currency: "GBP",
    addons: [{ name: "Nail trim", price: 15 }],
  });
  const slotIso = "2026-11-05T16:00:00Z";
  it("customer email shows service, add-ons, price and the groomer's note", () => {
    const m = custEmail({ dog, slotIso, timeZone: "America/Chicago", salon: "Happy Paws", phone: "", details, note: "Arrive 5 min early" });
    expect(m.text).toContain("Service: Full groom (Medium dog)");
    expect(m.text).toContain("Add-ons: Nail trim £15");
    expect(m.text).toContain("Price: £80+ (starting price)");
    expect(m.text).toContain("Arrive 5 min early");
    expect(m.html).toContain("Full groom");
    expect(m.html).toContain("£80+");
  });
  it("groomer email shows the service too", () => {
    const m = groomerEmail({ dog, slotIso, timeZone: "UTC", dashboardUrl: "https://x/dashboard", details });
    expect(m.text).toContain("Service: Full groom (Medium dog)");
    expect(m.text).toContain("Price: £80+");
  });
  it("cancel email names the service", () => {
    const m = cancelEmail({ dog, slotIso, timeZone: "UTC", salon: "Happy Paws", bookUrl: "https://x/book/t", details });
    expect(m.html).toContain("Full groom (Medium) + Nail trim");
  });
  it("emails without a service are unchanged", () => {
    const m = custEmail({ dog, slotIso, timeZone: "UTC", salon: "Happy Paws", phone: "" });
    expect(m.text).not.toContain("Service:");
    expect(m.text).not.toContain("Price:");
  });
});

describe("calendar feed with a service", () => {
  it("puts the service, price and its own length in the event", () => {
    const ics = buildCalendar(
      [{ id: "1", slot_at: "2026-11-05T16:00:00Z", dogName: "Bella", service: "Full groom + Nail trim", serviceDetail: "Full groom (Medium) + Nail trim", price: "£80+ (starting price)", minutes: 100 }],
      { slotMinutes: 60 }
    );
    expect(ics).toContain("SUMMARY:Bella: Full groom + Nail trim");
    expect(ics).toContain("Price: £80+");
    expect(ics).toContain("DTEND:20261105T174000Z");
  });
  it("is unchanged without a service", () => {
    const ics = buildCalendar([{ id: "1", slot_at: "2026-11-05T16:00:00Z", dogName: "Bella" }], { slotMinutes: 60 });
    expect(ics).toContain("SUMMARY:Groom: Bella");
    expect(ics).toContain("DTEND:20261105T170000Z");
  });
});

describe("payment wording", () => {
  const dog = { dog_name: "Bella", owner_name: "Sam", owner_email: "sam@e.com" };
  const slotIso = "2026-11-10T10:00:00Z";
  const payment = {
    methods: [{ type: "cash", label: "Cash", detail: "" }, { type: "venmo", label: "Venmo", detail: "@maya" }],
    note: "Tips welcome.",
  };

  it("tells the client how to pay the groomer directly", async () => {
    const { buildCustomerBookingEmail } = await import("./bookingEmail");
    const m = buildCustomerBookingEmail({ dog, slotIso, timeZone: "UTC", salon: "Happy Paws", payment });
    expect(m.text).toContain("Pay Happy Paws directly. Accepted: Cash, Venmo (@maya).");
    expect(m.text).toContain("Tips welcome.");
    expect(m.html).toContain("Venmo (@maya)");
    const none = buildCustomerBookingEmail({ dog, slotIso, timeZone: "UTC", salon: "Happy Paws" });
    expect(none.text).not.toContain("Payment:");
  });

  it("sends a receipt that says who was paid", async () => {
    const { buildReceiptEmail } = await import("./bookingEmail");
    const booking = { id: "3f2a9c1e-1111-2222-3333-444455556666", price: 60, currency: "GBP", paid_at: "2026-11-10T12:00:00Z", paid_amount: 65, paid_method: "card" };
    const details = { name: "Full groom", size: "Small", addons: [], total: "£60", isStarting: false };
    const m = buildReceiptEmail({ dog, slotIso, timeZone: "UTC", salon: "Happy Paws", phone: "+44 7700 900000", details, booking });
    expect(m.subject).toContain("PD-3F2A9C1E");
    expect(m.text).toContain("Paid: £65 by Card");
    expect(m.text).toContain("Price agreed: £60");
    expect(m.text).toContain("Paid to: Happy Paws");
    expect(m.text).toContain("PawDue does not process or hold payments");
    expect(m.html).toContain("Payment received");
  });
});
