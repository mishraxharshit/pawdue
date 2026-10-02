import { createSupabaseServerClient } from "../../../lib/supabase/server";

const DEFAULT_PRICE = 55;

function startOfMonthInTz(now, tz) {
  let zoned = now;
  try {
    zoned = new Date(now.toLocaleString("en-US", { timeZone: tz || "UTC" }));
  } catch {
    // invalid tz string - fall back to server-local
  }
  return new Date(zoned.getFullYear(), zoned.getMonth(), 1);
}

// Every row in `bookings` was created through a dog's booking_token link
// (see schema.sql - there's no other insert path), so counting them is a
// genuine measure of rebookings PawDue's reminders produced, not a vanity
// metric. We multiply by the account's typical service price to turn that
// count into a dollar figure that's actually meaningful to a business owner.
export default async function handler(req, res) {
  const supabase = createSupabaseServerClient(req, res);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return res.status(401).json({ error: "Not authenticated" });

  const { data: settings } = await supabase
    .from("business_settings")
    .select("default_service_price, timezone")
    .eq("user_id", user.id)
    .maybeSingle();
  const price = settings ? Number(settings.default_service_price) : DEFAULT_PRICE;

  // "This month" is the groomer's local month, not the server's - matters
  // most in the last few hours of a month in a different timezone.
  const startOfMonth = startOfMonthInTz(new Date(), settings?.timezone).toISOString();

  const [{ count: monthCount }, { count: allTimeCount }] = await Promise.all([
    supabase
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .eq("status", "confirmed")
      .gte("created_at", startOfMonth),
    supabase
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .eq("status", "confirmed"),
  ]);

  return res.status(200).json({
    pricePerVisit: price,
    isCustomPrice: !!settings,
    thisMonth: { count: monthCount || 0, revenue: (monthCount || 0) * price },
    allTime: { count: allTimeCount || 0, revenue: (allTimeCount || 0) * price },
  });
}
