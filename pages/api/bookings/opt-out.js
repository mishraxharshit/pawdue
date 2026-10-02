import { createSupabaseAdminClient } from "../../../lib/supabase/admin";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { token } = req.body || {};
  if (!token) return res.status(400).json({ error: "token is required" });

  const admin = createSupabaseAdminClient();

  // Public by design - the booking_token itself is the "proof" this is the
  // right person, same trust model as the booking page it lives on.
  const { data, error } = await admin
    .from("dogs")
    .update({ opted_out: true })
    .eq("booking_token", token)
    .select("dog_name")
    .maybeSingle();

  if (error || !data) return res.status(404).json({ error: "Booking link not found" });

  return res.status(200).json({ dogName: data.dog_name });
}
