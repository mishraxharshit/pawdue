import { createSupabaseServerClient } from "../../../lib/supabase/server";
import { buildRecovered } from "../../../lib/recovered";

// "What PawDue brought back" for the Home screen. Every row in `bookings` was
// created through a dog's booking link (see schema.sql: there is no other insert
// path), so these are real rebookings. Money counts only bookings that carry a
// real price from the groomer's own menu; nothing is estimated.
function zonedMonthStarts(now, tz) {
  let zoned = now;
  try {
    zoned = new Date(now.toLocaleString("en-US", { timeZone: tz || "UTC" }));
  } catch {
    // invalid tz string: fall back to server-local
  }
  return {
    monthStart: new Date(zoned.getFullYear(), zoned.getMonth(), 1),
    prevMonthStart: new Date(zoned.getFullYear(), zoned.getMonth() - 1, 1),
  };
}

export default async function handler(req, res) {
  const supabase = createSupabaseServerClient(req, res);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return res.status(401).json({ error: "Not authenticated" });

  const settingsRes = await supabase.from("business_settings").select("timezone, currency").eq("user_id", user.id).maybeSingle();
  let timezone = "UTC";
  let currency = "USD";
  if (!settingsRes.error && settingsRes.data) {
    timezone = settingsRes.data.timezone || "UTC";
    currency = settingsRes.data.currency || "USD";
  } else {
    // currency column comes from supabase/add-services.sql
    const tz = await supabase.from("business_settings").select("timezone").eq("user_id", user.id).maybeSingle();
    timezone = tz.data?.timezone || "UTC";
  }

  // Price, service and add-ons exist after add-services.sql; before it, only the dates.
  const run = (cols) => supabase.from("bookings").select(cols).eq("status", "confirmed").limit(10000);
  let { data, error } = await run("created_at, slot_at, price, currency, service_name, addons");
  if (error) ({ data, error } = await run("created_at, slot_at"));
  if (error) return res.status(500).json({ error: error.message });

  const { monthStart, prevMonthStart } = zonedMonthStarts(new Date(), timezone);
  res.setHeader("Cache-Control", "no-store");
  return res.status(200).json(buildRecovered(data || [], { now: new Date(), monthStart, prevMonthStart, currency }));
}
