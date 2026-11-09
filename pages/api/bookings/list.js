import { createSupabaseServerClient } from "../../../lib/supabase/server";

const BASE = "id, slot_at, status, created_at, dog_id, dogs(dog_name, owner_name, owner_email, phone, breed)";
// Present once supabase/add-services.sql has been run.
const WITH_SERVICE = `${BASE}, service_name, dog_size, price, price_is_starting, currency, addons, duration_minutes`;
// Present once supabase/add-payments.sql has been run.
const WITH_PAID = `${WITH_SERVICE}, paid_at, paid_amount, paid_method, receipt_sent_at`;

export default async function handler(req, res) {
  const supabase = createSupabaseServerClient(req, res);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return res.status(401).json({ error: "Not authenticated" });

  // Upcoming by default. "past" is the last 90 days, newest first, so the
  // groomer can record payments after the groom.
  const past = req.query.scope === "past";
  const nowIso = new Date().toISOString();
  const run = (columns) =>
    past
      ? supabase.from("bookings").select(columns).lt("slot_at", nowIso).gte("slot_at", new Date(Date.now() - 90 * 86400000).toISOString()).order("slot_at", { ascending: false }).limit(200)
      : supabase.from("bookings").select(columns).gte("slot_at", nowIso).order("slot_at", { ascending: true });

  let { data, error } = await run(WITH_PAID);
  if (error) ({ data, error } = await run(WITH_SERVICE));
  // A database that has not run the services SQL yet has no such columns:
  // fall back to the original list instead of breaking the bookings screen.
  if (error) ({ data, error } = await run(BASE));

  if (error) return res.status(500).json({ error: error.message });
  res.setHeader("Cache-Control", "no-store");
  return res.status(200).json(data);
}
