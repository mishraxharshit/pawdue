import { createSupabaseServerClient } from "../../../lib/supabase/server";
import { buildInsights } from "../../../lib/insights";

// Numbers for the Insights tab, built from the groomer's own bookings. The
// payment columns exist after supabase/add-payments.sql; without them the
// rest of the numbers still work.
const BASE = "status, created_at, slot_at, service_name, dog_size, price, price_is_starting, currency, addons";
const BASE_OLD = "status, created_at, slot_at";

export default async function handler(req, res) {
  const supabase = createSupabaseServerClient(req, res);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return res.status(401).json({ error: "Not authenticated" });

  const range = req.query.range === "all" ? "all" : req.query.range === "90" ? 90 : 30;

  const run = (cols) => supabase.from("bookings").select(cols).eq("status", "confirmed").order("created_at", { ascending: false }).limit(5000);
  let paymentsReady = true;
  let { data, error } = await run(`${BASE}, paid_at, paid_amount, paid_method`);
  if (error) {
    paymentsReady = false;
    ({ data, error } = await run(BASE));
  }
  if (error) ({ data, error } = await run(BASE_OLD));
  if (error) return res.status(500).json({ error: error.message });

  const settingsRes = await supabase.from("business_settings").select("currency, timezone").eq("user_id", user.id).maybeSingle();
  let currency = "USD";
  let timeZone = "UTC";
  if (!settingsRes.error && settingsRes.data) {
    currency = settingsRes.data.currency || "USD";
    timeZone = settingsRes.data.timezone || "UTC";
  } else {
    const tz = await supabase.from("business_settings").select("timezone").eq("user_id", user.id).maybeSingle();
    timeZone = tz.data?.timezone || "UTC";
  }

  res.setHeader("Cache-Control", "no-store");
  return res.status(200).json({ ...buildInsights(data || [], { range, currency, timeZone }), paymentsReady });
}
