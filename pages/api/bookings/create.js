import { createSupabaseAdminClient } from "../../../lib/supabase/admin";
import { generateAvailableSlots, getAvailabilitySettings, getBusinessTimezone } from "../../../lib/booking";
import { rateLimit } from "../../../lib/rateLimit";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  if (!rateLimit(req, res, { name: "booking-create", limit: 10, windowMs: 10 * 60 * 1000 })) return;

  const { token, slot } = req.body || {};
  if (!token || !slot || typeof token !== "string" || typeof slot !== "string") {
    return res.status(400).json({ error: "token and slot are required" });
  }

  const admin = createSupabaseAdminClient();

  const { data: dog, error: dogError } = await admin
    .from("dogs")
    .select("id, user_id, dog_name")
    .eq("booking_token", token)
    .maybeSingle();

  if (dogError || !dog) {
    if (dogError) console.error("bookings/create dog lookup failed:", dogError.message);
    return res.status(404).json({ error: "Booking link not found" });
  }

  // Re-validate the slot is still free server-side - never trust the client's
  // idea of availability, since another owner could have booked it moments ago.
  const { data: existingBookings } = await admin
    .from("bookings")
    .select("slot_at")
    .eq("user_id", dog.user_id);

  // One upcoming booking per dog link. Without this, anyone holding a link
  // could grab every free slot of the groomer.
  const { count: activeForDog } = await admin
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("dog_id", dog.id)
    .eq("status", "confirmed")
    .gte("slot_at", new Date().toISOString());
  if ((activeForDog || 0) >= 1) {
    return res.status(409).json({
      error: "This dog already has an upcoming appointment. Please contact the groomer to change it.",
    });
  }

  const bookedIso = new Set((existingBookings || []).map((b) => new Date(b.slot_at).toISOString()));
  const settings = await getAvailabilitySettings(admin, dog.user_id);
  const tz = await getBusinessTimezone(admin, dog.user_id);
  const stillAvailable = generateAvailableSlots(bookedIso, settings, tz).includes(slot);

  if (!stillAvailable) {
    return res.status(409).json({ error: "Sorry, that slot was just taken. Please pick another." });
  }

  const { data: booking, error: insertError } = await admin
    .from("bookings")
    .insert({ user_id: dog.user_id, dog_id: dog.id, slot_at: slot, status: "confirmed" })
    .select()
    .single();

  if (insertError) {
    // Unique constraint race - someone else grabbed it in the split second between checks.
    return res.status(409).json({ error: "Sorry, that slot was just taken. Please pick another." });
  }

  return res.status(201).json({ booking, dogName: dog.dog_name });
}
