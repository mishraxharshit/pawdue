import { createSupabaseServerClient } from "../../../lib/supabase/server";
import { createSupabaseAdminClient } from "../../../lib/supabase/admin";
import { notifyBookingCancelled } from "../../../lib/bookingNotify";

// The groomer cancels a booking from the dashboard. The row is removed so the
// slot opens up again, and the dog owner gets an email with a link to rebook.
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const supabase = createSupabaseServerClient(req, res);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return res.status(401).json({ error: "Not authenticated" });

  const { id } = req.body || {};
  if (!id || typeof id !== "string") return res.status(400).json({ error: "id is required" });

  const admin = createSupabaseAdminClient();
  const { data: booking } = await admin
    .from("bookings")
    .select("id, user_id, dog_id, slot_at")
    .eq("id", id)
    .maybeSingle();
  if (!booking || booking.user_id !== user.id) return res.status(404).json({ error: "Booking not found" });

  const { data: dog } = await admin
    .from("dogs")
    .select("dog_name, owner_name, owner_email, booking_token")
    .eq("id", booking.dog_id)
    .maybeSingle();

  const { error } = await admin.from("bookings").delete().eq("id", id).eq("user_id", user.id);
  if (error) return res.status(500).json({ error: "Could not cancel the booking" });

  const email = dog ? await notifyBookingCancelled(admin, { userId: user.id, dog, booking }) : "no-dog";
  return res.status(200).json({ ok: true, ownerEmail: email });
}
