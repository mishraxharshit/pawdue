import { createSupabaseAdminClient } from "../../../../lib/supabase/admin";
import { generateAvailableSlots, getAvailabilitySettings, getBusinessTimezone } from "../../../../lib/booking";
import { rateLimit } from "../../../../lib/rateLimit";
import { computeStatus } from "../../../../lib/breedIntervals";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  if (!rateLimit(req, res, { name: "booking-availability", limit: 60, windowMs: 10 * 60 * 1000 })) return;

  const { token } = req.query;
  const admin = createSupabaseAdminClient();

  // This route is intentionally public (no login) - the booking_token itself
  // is the "access key" a dog owner got via their reminder link.
  const { data: dog, error } = await admin
    .from("dogs")
    .select("id, user_id, dog_name, owner_name, breed, last_groom_date, interval_weeks")
    .eq("booking_token", token)
    .maybeSingle();

  if (error || !dog) {
    if (error) console.error("bookings/availability lookup failed:", error.message);
    return res.status(404).json({ error: "Booking link not found" });
  }

  // These three lookups do not depend on each other, so run them together
  // instead of one after another (each is a network round trip to Supabase).
  // Only upcoming bookings matter for availability, so old ones are skipped.
  const [bookingsRes, settings, timezone] = await Promise.all([
    admin.from("bookings").select("slot_at").eq("user_id", dog.user_id).gte("slot_at", new Date().toISOString()),
    getAvailabilitySettings(admin, dog.user_id),
    getBusinessTimezone(admin, dog.user_id),
  ]);

  const bookedIso = new Set((bookingsRes.data || []).map((b) => new Date(b.slot_at).toISOString()));
  const slots = generateAvailableSlots(bookedIso, settings, timezone);

  // Shown on the owner's booking page too, not just the groomer's dashboard -
  // an owner who can see "due in 9 days" understands why they got the text,
  // and is more likely to actually pick a slot instead of ignoring the link.
  const comp = computeStatus(dog, new Date(), timezone);
  const elapsedDays = Math.round((new Date() - new Date(dog.last_groom_date)) / 86400000);
  const totalDays = dog.interval_weeks * 7;
  const progressPct = Math.max(0, Math.min(100, Math.round((elapsedDays / totalDays) * 100)));

  return res.status(200).json({
    dogName: dog.dog_name,
    ownerName: dog.owner_name,
    breed: dog.breed,
    slots,
    timezone,
    status: {
      state: comp.status,
      daysLeft: comp.daysLeft,
      dueDate: comp.due.toISOString(),
      lastGroomDate: dog.last_groom_date,
      progressPct,
    },
  });
}