import { createSupabaseServerClient } from "../../../lib/supabase/server";

export default async function handler(req, res) {
  const supabase = createSupabaseServerClient(req, res);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return res.status(401).json({ error: "Not authenticated" });

  const { data, error } = await supabase
    .from("bookings")
    .select("id, slot_at, status, created_at, dogs(dog_name, owner_name, breed)")
    .gte("slot_at", new Date().toISOString())
    .order("slot_at", { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json(data);
}
