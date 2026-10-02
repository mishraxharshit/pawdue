import { createSupabaseAdminClient } from "../../../../lib/supabase/admin";
import { generateAvailableSlots, getAvailabilitySettings } from "../../../../lib/booking";
import { computeStatus } from "../../../../lib/breedIntervals";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

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

  const { data: existingBookings } = await admin
    .from("bookings")
    .select("slot_at")
    .eq("user_id", dog.user_id);

  const bookedIso = new Set((existingBookings || []).map((b) => new Date(b.slot_at).toISOString()));
  const settings = await getAvailabilitySettings(admin, dog.user_id);
  const slots = generateAvailableSlots(bookedIso, settings);

  const { data: bizSettings } = await admin
    .from("business_settings")
    .select("timezone")
    .eq("user_id", dog.user_id)
    .maybeSingle();

  // Shown on the owner's booking page too, not just the groomer's dashboard -
  // an owner who can see "due in 9 days" understands why they got the text,
  // and is more likely to actually pick a slot instead of ignoring the link.
  const comp = computeStatus(dog, new Date(), bizSettings?.timezone || "UTC");
  const elapsedDays = Math.round((new Date() - new Date(dog.last_groom_date)) / 86400000);
  const totalDays = dog.interval_weeks * 7;
  const progressPct = Math.max(0, Math.min(100, Math.round((elapsedDays / totalDays) * 100)));

  return res.status(200).json({
    dogName: dog.dog_name,
    ownerName: dog.owner_name,
    breed: dog.breed,
    slots,
    status: {
      state: comp.status,
      daysLeft: comp.daysLeft,
      dueDate: comp.due.toISOString(),
      lastGroomDate: dog.last_groom_date,
      progressPct,
    },
  });
}
