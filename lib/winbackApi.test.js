import { describe, it, expect, vi, beforeEach } from "vitest";

const sent = [];
let state;

vi.mock("./messaging", () => ({
  sendEmail: vi.fn(async (to, subject, text, opts) => {
    if (state.failSend) throw new Error("boom");
    sent.push({ to, subject, text, opts });
  }),
}));

vi.mock("./supabase/server", () => ({
  createSupabaseServerClient: () => ({
    auth: { getUser: async () => ({ data: { user: state.user } }) },
    from: (table) => {
      const q = { table, filters: {} };
      const chain = {
        select: () => chain,
        update: (patch) => { q.patch = patch; return chain; },
        eq: (k, v) => { q.filters[k] = v; return chain; },
        maybeSingle: async () => {
          if (table === "dogs") {
            const d = state.dog;
            return { data: d && d.user_id === q.filters.user_id && d.id === q.filters.id ? d : null };
          }
          return { data: { business_name: "Happy Paws", business_phone: "+1 555", reply_to_email: "hello@happy.test" } };
        },
        then: (resolve) => { state.updates.push({ table, patch: q.patch, filters: q.filters }); resolve({ error: null }); },
      };
      return chain;
    },
  }),
}));

import handler from "../pages/api/dogs/winback";

function call(body, method = "POST") {
  return new Promise((resolve) => {
    const res = {
      statusCode: 0,
      status(c) { this.statusCode = c; return this; },
      json(b) { resolve({ status: this.statusCode, body: b }); },
    };
    handler({ method, body }, res);
  });
}

beforeEach(() => {
  sent.length = 0;
  state = {
    user: { id: "u1", email: "me@x.test" },
    failSend: false,
    updates: [],
    dog: { id: "d1", user_id: "u1", dog_name: "Rosie", owner_name: "Liam", owner_email: "liam@x.test", booking_token: "tok", is_archived: false, opted_out: false, last_winback_at: null },
  };
});

describe("POST /api/dogs/winback", () => {
  it("sends one email with the salon name, reply-to and book link, then records it", async () => {
    const r = await call({ dogId: "d1", message: "Hi Liam, come back soon." });
    expect(r.status).toBe(200);
    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe("liam@x.test");
    expect(sent[0].subject).toContain("Rosie");
    expect(sent[0].text).toContain("/book/tok");
    expect(sent[0].opts.replyTo).toBe("hello@happy.test");
    expect(sent[0].opts.fromName).toBe("Happy Paws");
    expect(state.updates.some((u) => u.patch?.last_winback_at)).toBe(true);
  });

  it("rejects other methods, signed-out callers and empty messages", async () => {
    expect((await call({}, "GET")).status).toBe(405);
    state.user = null;
    expect((await call({ dogId: "d1", message: "x" })).status).toBe(401);
    state.user = { id: "u1" };
    expect((await call({ dogId: "d1", message: "   " })).status).toBe(400);
    expect(sent).toHaveLength(0);
  });

  it("will not email someone else's dog, an opted-out owner, no-email dogs or a repeat within 7 days", async () => {
    state.user = { id: "other" };
    expect((await call({ dogId: "d1", message: "hi" })).status).toBe(404);
    state.user = { id: "u1" };
    state.dog.opted_out = true;
    expect((await call({ dogId: "d1", message: "hi" })).status).toBe(400);
    state.dog.opted_out = false; state.dog.owner_email = null;
    expect((await call({ dogId: "d1", message: "hi" })).status).toBe(400);
    state.dog.owner_email = "liam@x.test"; state.dog.last_winback_at = new Date().toISOString();
    expect((await call({ dogId: "d1", message: "hi" })).status).toBe(409);
    expect(sent).toHaveLength(0);
  });

  it("returns 502 and records nothing when the email provider fails", async () => {
    state.failSend = true;
    const r = await call({ dogId: "d1", message: "hi" });
    expect(r.status).toBe(502);
    expect(state.updates).toHaveLength(0);
  });
});
