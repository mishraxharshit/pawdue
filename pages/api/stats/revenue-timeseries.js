import { createSupabaseServerClient } from "../../../lib/supabase/server";

const DEFAULT_PRICE = 55;
const WEEKS = 8;

function startOfWeek(d) {
  const date = new Date(d);
  const day = date.getDay(); // 0 = Sunday
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - day);
  return date;
}

export default async function handler(req, res) {
  const supabase = createSupabaseServerClient(req, res);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return res.status(401).json({ error: "Not authenticated" });

  const { data: settings } = await supabase
    .from("business_settings")
    .select("default_service_price")
    .eq("user_id", user.id)
    .maybeSingle();
  const price = settings ? Number(settings.default_service_price) : DEFAULT_PRICE;

  const earliestWeekStart = startOfWeek(new Date());
  earliestWeekStart.setDate(earliestWeekStart.getDate() - (WEEKS - 1) * 7);

  const currencyRes = await supabase.from("business_settings").select("currency").eq("user_id", user.id).maybeSingle();
  const currency = (!currencyRes.error && currencyRes.data?.currency) || "USD";

  // Real booking prices once supabase/add-services.sql has been run.
  const since = earliestWeekStart.toISOString();
  const pricedRes = await supabase.from("bookings").select("created_at, price").eq("status", "confirmed").gte("created_at", since);
  const { data: bookings, error } = pricedRes.error
    ? await supabase.from("bookings").select("created_at").eq("status", "confirmed").gte("created_at", since)
    : pricedRes;

  if (error) return res.status(500).json({ error: error.message });

  // Bucket into the last N calendar weeks (Sun-Sat), oldest first, filling
  // in zero for any week with no bookings so the chart doesn't skip weeks.
  const buckets = [];
  for (let i = WEEKS - 1; i >= 0; i--) {
    const weekStart = startOfWeek(new Date());
    weekStart.setDate(weekStart.getDate() - i * 7);
    buckets.push({ weekStart: weekStart.toISOString(), count: 0, revenue: 0 });
  }

  for (const b of bookings || []) {
    const weekStart = startOfWeek(new Date(b.created_at)).toISOString();
    const bucket = buckets.find((x) => x.weekStart === weekStart);
    if (bucket) {
      bucket.count += 1;
      // Only real booking prices count. A booking made without a service adds no money.
      bucket.revenue += b.price !== null && b.price !== undefined ? Number(b.price) : 0;
    }
  }

  const weeks = buckets.map((b) => ({
    weekStart: b.weekStart,
    count: b.count,
    revenue: b.revenue,
  }));

  return res.status(200).json({ pricePerVisit: price, currency, weeks });
}
