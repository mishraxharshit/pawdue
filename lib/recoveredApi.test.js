import { describe, it, expect, vi, beforeEach } from "vitest";

let rows;
let bookingsError;
vi.mock("./supabase/server", () => ({
  createSupabaseServerClient: () => ({
    auth: { getUser: async () => ({ data: { user: { id: "u1" } } }) },
    from: (table) => {
      const q = {
        select: (cols) => { q.cols = cols; return q; },
        eq: () => q,
        limit: () => q,
        maybeSingle: async () => ({ data: { timezone: "UTC", currency: "GBP" }, error: null }),
        then: (res) => {
          // before add-services.sql the price columns do not exist
          const missing = table === "bookings" && bookingsError && q.cols.includes("price");
          res(missing ? { data: null, error: { message: "column does not exist" } } : { data: rows, error: null });
        },
      };
      return q;
    },
  }),
}));

import handler from "../pages/api/stats/revenue-recovered";

function call() {
  return new Promise((resolve) => {
    const res = { headers: {}, setHeader() {}, status(c) { this.code = c; return this; }, json(b) { resolve({ code: this.code, body: b }); } };
    handler({}, res);
  });
}

describe("revenue-recovered API", () => {
  beforeEach(() => { bookingsError = false; });
  const iso = (d) => new Date(Date.now() - d * 86400000).toISOString();

  it("adds up real prices by service", async () => {
    rows = [
      { created_at: iso(0), slot_at: iso(-2), price: 60, currency: "GBP", service_name: "Full groom", addons: [] },
      { created_at: iso(0), slot_at: iso(-3), price: null, currency: null, service_name: null, addons: null },
    ];
    const { code, body } = await call();
    expect(code).toBe(200);
    expect(body.currency).toBe("GBP");
    expect(body.month.revenue).toBe(60);
    expect(body.month.unpriced).toBe(1);
    expect(body.byService[0].name).toBe("Full groom");
  });

  it("still works before add-services.sql: counts bookings, no invented money", async () => {
    bookingsError = true;
    rows = [{ created_at: iso(0), slot_at: iso(-2) }];
    const { code, body } = await call();
    expect(code).toBe(200);
    expect(body.month.count).toBe(1);
    expect(body.month.revenue).toBe(0);
  });
});
