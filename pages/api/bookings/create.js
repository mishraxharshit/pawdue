import { createSupabaseAdminClient } from "../../../lib/supabase/admin";
import { generateAvailableSlots, getAvailabilitySettings, getBusinessTimezone } from "../../../lib/booking";
import { notifyBookingCreated } from "../../../lib/bookingNotify";
import { rateLimit } from "../../../lib/rateLimit";
import { loadActiveServices, loadShopSettings } from "../../../lib/bookingMenu";
import { priceSelection } from "../../../lib/bookingServices";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  if (!rateLimit(req, res, { name: "booking-create", limit: 10, windowMs: 10 * 60 * 1000 })) return;

  const { token, slot, serviceId, addonIds, size } = req.body || {};
  if (!token || !slot || typeof token !== "string" || typeof slot !== "string") {
    return res.status(400).json({ error: "token and slot are required" });
  }

  const admin = createSupabaseAdminClient();

  const { data: dog, error: dogError } = await admin
    .from("dogs")
    .select("id, user_id, dog_name, owner_name, owner_email, phone, breed")
    .eq("booking_token", token)
    .maybeSingle();

  if (dogError || !dog) {
    if (dogError) console.error("bookings/create dog lookup failed:", dogError.message);
    return res.status(404).json({ error: "Booking link not found" });
  }

  // What was booked and what it costs. The price is worked out here from the
  // groomer's own menu; nothing the browser sends about money is trusted.
  const services = await loadActiveServices(admin, dog.user_id);
  const picked = priceSelection(services, { serviceId, addonIds, size });
  if (picked.error) return res.status(400).json({ error: picked.error });


  // Re-validate the slot is still free server-side - never trust the client's
  // idea of availability, since another owner could have booked it moments ago.
  // The lookups are independent, so they run together.
  const [bookingsRes, activeRes, settings, tz] = await Promise.all([
    admin.from("bookings").select("slot_at").eq("user_id", dog.user_id).gte("slot_at", new Date().toISOString()),
    // One upcoming booking per dog link. Without this, anyone holding a link
    // could grab every free slot of the groomer.
    admin
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("dog_id", dog.id)
      .eq("status", "confirmed")
      .gte("slot_at", new Date().toISOString()),
    getAvailabilitySettings(admin, dog.user_id),
    getBusinessTimezone(admin, dog.user_id),
  ]);

  if ((activeRes.count || 0) >= 1) {
    return res.status(409).json({
      error: "This dog already has an upcoming appointment. Please contact the groomer to change it.",
    });
  }

  const bookedIso = new Set((bookingsRes.data || []).map((b) => new Date(b.slot_at).toISOString()));
  const stillAvailable = generateAvailableSlots(bookedIso, settings, tz).includes(slot);

  if (!stillAvailable) {
    return res.status(409).json({ error: "Sorry, that slot was just taken. Please pick another." });
  }

  const row = { user_id: dog.user_id, dog_id: dog.id, slot_at: slot, status: "confirmed" };
  let shop = null;
  if (picked.value) {
    const v = picked.value;
    shop = await loadShopSettings(admin, dog.user_id);
    Object.assign(row, {
      service_id: v.service.id,
      service_name: v.service.name,
      dog_size: v.size,
      price: v.total,
      price_is_starting: v.isStarting,
      currency: shop.currency,
      addons: v.addons.map((a) => ({ id: a.id, name: a.name, price: v.lines.find((l) => l.id === a.id).price, starting: !!a.is_starting_price })),
      duration_minutes: v.durationMinutes,
    });
  }

  const { data: booking, error: insertError } = await admin
    .from("bookings")
    .insert(row)
    .select()
    .single();

  if (insertError) {
    // Unique constraint race - someone else grabbed it in the split second between checks.
    return res.status(409).json({ error: "Sorry, that slot was just taken. Please pick another." });
  }

  // Remember the size they chose, so next time the page already knows it.
  // Best effort: a failure here must never undo a booking that succeeded.
  if (picked.value?.size) {
    await admin.from("dogs").update({ size: picked.value.size }).eq("id", dog.id).is("size", null);
  }

  // Email the groomer and the dog owner. Awaited because serverless functions
  // can stop right after the response; failures are logged, never thrown.
  await notifyBookingCreated(admin, { userId: dog.user_id, dog, booking });

  return res.status(201).json({
    booking,
    dogName: dog.dog_name,
    summary: picked.value
      ? {
          lines: picked.value.lines,
          total: picked.value.total,
          isStarting: picked.value.isStarting,
          size: picked.value.size,
          currency: shop.currency,
          bookingNote: shop.bookingNote,
        }
      : null,
  });
}
