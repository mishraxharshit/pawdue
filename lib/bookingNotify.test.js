import { describe, it, expect, vi, beforeEach } from "vitest";

const sent = [];
vi.mock("./messaging", () => ({
  sendEmail: vi.fn(async (to, subject, text, opts) => {
    sent.push({ to, subject, text, opts });
  }),
}));

import { notifyBookingCreated, notifyBookingCancelled } from "./bookingNotify";

function fakeAdmin({ calendarToken = null } = {}) {
  const tables = {
    business_settings: { business_name: "Happy Paws", business_phone: "555", reply_to_email: null, timezone: "America/New_York", calendar_token: calendarToken },
    availability_settings: { slot_minutes: 45 },
  };
  return {
    from: (t) => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: tables[t] }) }) }) }),
    auth: { admin: { getUserById: async () => ({ data: { user: { email: "groomer@example.com" } } }) } },
  };
}
const dog = { dog_name: "Bruno", owner_name: "Sam", owner_email: "sam@example.com", phone: "1", breed: "Poodle", booking_token: "tok" };
const booking = { id: "b1", slot_at: "2026-11-03T15:00:00.000Z" };

beforeEach(() => (sent.length = 0));

describe("notifyBookingCreated", () => {
  it("emails groomer and customer, attaching a calendar file to both", async () => {
    const r = await notifyBookingCreated(fakeAdmin(), { userId: "u", dog, booking });
    expect(r).toEqual({ groomer: "sent", customer: "sent" });
    const g = sent.find((s) => s.to === "groomer@example.com");
    const c = sent.find((s) => s.to === "sam@example.com");
    expect(g.opts.attachments).toHaveLength(1);
    expect(c.opts.attachments[0].content).toContain("DTEND:20261103T154500Z");
    expect(c.opts.fromName).toBe("Happy Paws");
    expect(c.opts.replyTo).toBe("groomer@example.com");
  });
  it("skips the groomer's file when they use the calendar feed", async () => {
    await notifyBookingCreated(fakeAdmin({ calendarToken: "x" }), { userId: "u", dog, booking });
    expect(sent.find((s) => s.to === "groomer@example.com").opts.attachments).toHaveLength(0);
  });
  it("still emails the groomer when the dog has no email", async () => {
    const r = await notifyBookingCreated(fakeAdmin(), { userId: "u", dog: { ...dog, owner_email: null }, booking });
    expect(r).toEqual({ groomer: "sent", customer: "skipped" });
  });
});

describe("notifyBookingCancelled", () => {
  it("emails the owner a rebook link", async () => {
    expect(await notifyBookingCancelled(fakeAdmin(), { userId: "u", dog, booking })).toBe("sent");
    expect(sent[0].text).toContain("/book/tok");
  });
  it("reports when there is no email", async () => {
    expect(await notifyBookingCancelled(fakeAdmin(), { userId: "u", dog: { ...dog, owner_email: null }, booking })).toBe("no-email");
  });
});
