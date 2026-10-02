import { createSupabaseServerClient } from "../../../lib/supabase/server";

const DEFAULT_PRICE = 55;
const DEFAULT_TIMEZONE = "UTC";

export default async function handler(req, res) {
  const supabase = createSupabaseServerClient(req, res);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return res.status(401).json({ error: "Not authenticated" });

  if (req.method === "GET") {
    const { data } = await supabase
      .from("business_settings")
      .select("default_service_price, timezone")
      .eq("user_id", user.id)
      .maybeSingle();

    return res.status(200).json({
      defaultServicePrice: data ? Number(data.default_service_price) : DEFAULT_PRICE,
      timezone: data?.timezone || DEFAULT_TIMEZONE,
      isCustomized: !!data,
    });
  }

  if (req.method === "PATCH") {
    const { defaultServicePrice, timezone } = req.body || {};
    const update = { user_id: user.id };

    if (defaultServicePrice !== undefined) {
      const price = Number(defaultServicePrice);
      if (!Number.isFinite(price) || price < 0) {
        return res.status(400).json({ error: "defaultServicePrice must be a positive number" });
      }
      update.default_service_price = price;
    }

    if (timezone !== undefined) {
      if (typeof timezone !== "string" || !timezone.trim()) {
        return res.status(400).json({ error: "timezone must be a non-empty string" });
      }
      try {
        Intl.DateTimeFormat("en-US", { timeZone: timezone }); // throws on invalid IANA name
      } catch {
        return res.status(400).json({ error: `"${timezone}" isn't a recognized timezone` });
      }
      update.timezone = timezone;
    }

    const { error } = await supabase.from("business_settings").upsert(update, { onConflict: "user_id" });
    if (error) return res.status(500).json({ error: error.message });

    const { data: fresh } = await supabase
      .from("business_settings")
      .select("default_service_price, timezone")
      .eq("user_id", user.id)
      .maybeSingle();

    return res.status(200).json({
      defaultServicePrice: Number(fresh?.default_service_price ?? DEFAULT_PRICE),
      timezone: fresh?.timezone || DEFAULT_TIMEZONE,
      isCustomized: true,
    });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
