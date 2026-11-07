import { createSupabaseAdminClient } from "../../../lib/supabase/admin";
import { buildCalendar } from "../../../lib/ical";
import { describeBooking } from "../../../lib/bookingDetails";

// Public, unguessable-URL calendar feed (subscribe from Google/Apple/Outlook).
export default async function handler(req, res) {
  let token = String(req.query.token || "").replace(/\.ics$/i, "");
  if (!/^[0-9a-f-]{36}$/i.test(token)) return res.status(404).end("Not found");

  const supabase = createSupabaseAdminClient();
  const { data: owner } = await supabase
    .from("business_settings")
    .select("user_id, business_name")
    .eq("calendar_token", token)
    .maybeSingle();
  if (!owner) return res.status(404).end("Not found");

  const since = new Date(Date.now() - 30 * 86400000).toISOString();
  const baseSelect = (cols) => supabase.from("bookings").select(cols).eq("user_id", owner.user_id).eq("status", "confirmed").gte("slot_at", since);
  const [withService, { data: avail }] = await Promise.all([
    baseSelect("id, slot_at, dog_id, service_name, dog_size, price, price_is_starting, currency, addons, duration_minutes"),
    supabase.from("availability_settings").select("slot_minutes").eq("user_id", owner.user_id).maybeSingle(),
  ]);

  // Before supabase/add-services.sql is run those columns do not exist: use the plain list.
  const bookings = withService.error ? (await baseSelect("id, slot_at, dog_id")).data : withService.data;
  const ids = [...new Set((bookings || []).map((b) => b.dog_id))];
  const { data: dogs } = ids.length
    ? await supabase.from("dogs").select("id, dog_name, owner_name, phone, breed").in("id", ids)
    : { data: [] };
  const dogById = new Map((dogs || []).map((d) => [d.id, d]));

  const ics = buildCalendar(
    (bookings || []).map((b) => {
      const d = dogById.get(b.dog_id) || {};
      const det = describeBooking(b);
      return {
        id: b.id, slot_at: b.slot_at, dogName: d.dog_name, ownerName: d.owner_name, phone: d.phone, breed: d.breed,
        service: det?.short, serviceDetail: det?.withSize, price: det?.total ? `${det.total}${det.isStarting ? " (starting price)" : ""}` : "",
        minutes: det?.minutes,
      };
    }),
    { name: `${owner.business_name || "PawDue"} bookings`, slotMinutes: avail?.slot_minutes || 60 }
  );
  res.setHeader("Content-Type", "text/calendar; charset=utf-8");
  res.setHeader("Cache-Control", "private, max-age=60");
  return res.status(200).send(ics);
}
