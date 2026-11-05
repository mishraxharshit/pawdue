import { createSupabaseServerClient } from "../../../lib/supabase/server";
import { validateShopSettings, DEFAULT_SIZE_GUIDE } from "../../../lib/services";

// Shop-wide settings that go with the menu: currency, what small/medium/large
// mean, and a message clients see when booking. They live in their own columns
// (supabase/add-services.sql), read separately, so a database that has not run
// that file yet still works everywhere else.
function shape(row) {
  return {
    currency: row?.currency || "USD",
    sizeGuide: { ...DEFAULT_SIZE_GUIDE, ...(row?.size_guide || {}) },
    bookingNote: row?.booking_note || "",
  };
}

export default async function handler(req, res) {
  const supabase = createSupabaseServerClient(req, res);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return res.status(401).json({ error: "Not authenticated" });

  if (req.method === "GET") {
    const { data, error } = await supabase.from("business_settings").select("currency, size_guide, booking_note").eq("user_id", user.id).maybeSingle();
    res.setHeader("Cache-Control", "no-store");
    if (error) return res.status(200).json({ ...shape(null), available: false });
    return res.status(200).json({ ...shape(data), available: true });
  }

  if (req.method === "PUT") {
    const checked = validateShopSettings(req.body);
    if (checked.error) return res.status(400).json({ error: checked.error });
    const { error } = await supabase.from("business_settings").upsert({ user_id: user.id, ...checked.values }, { onConflict: "user_id" });
    if (error) {
      console.error("shop settings save failed:", error.message);
      return res.status(500).json({ error: "Could not save. Run supabase/add-services.sql in the Supabase SQL Editor first." });
    }
    return res.status(200).json({ ...shape(checked.values), available: true });
  }

  res.setHeader("Allow", "GET, PUT");
  return res.status(405).json({ error: "Method not allowed" });
}
