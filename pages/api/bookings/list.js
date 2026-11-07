import { createSupabaseServerClient } from "../../../lib/supabase/server";

const BASE = "id, slot_at, status, created_at, dog_id, dogs(dog_name, owner_name, owner_email, phone, breed)";
// Present once supabase/add-services.sql has been run.
const WITH_SERVICE = `${BASE}, service_name, dog_size, price, price_is_starting, currency, addons, duration_minutes`;

export default async function handler(req, res) {
  const supabase = createSupabaseServerClient(req, res);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return res.status(401).json({ error: "Not authenticated" });

  const run = (columns) =>
    supabase.from("bookings").select(columns).gte("slot_at", new Date().toISOString()).order("slot_at", { ascending: true });

  let { data, error } = await run(WITH_SERVICE);
  // A database that has not run the services SQL yet has no such columns:
  // fall back to the original list instead of breaking the bookings screen.
  if (error) ({ data, error } = await run(BASE));

  if (error) return res.status(500).json({ error: error.message });
  res.setHeader("Cache-Control", "no-store");
  return res.status(200).json(data);
}
