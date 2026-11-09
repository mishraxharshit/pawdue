import { createSupabaseServerClient } from "../../../lib/supabase/server";
import { validatePaymentSettings, readMethods } from "../../../lib/payments";

// How this groomer accepts payment. PawDue does not process payments: this is
// only shown to clients so they know how to pay the groomer directly.
// Columns come from supabase/add-payments.sql.
function shape(row) {
  return {
    methods: readMethods(row?.payment_methods).map((m) => ({ type: m.type, detail: m.detail })),
    note: row?.payment_note || "",
  };
}

export default async function handler(req, res) {
  const supabase = createSupabaseServerClient(req, res);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return res.status(401).json({ error: "Not authenticated" });

  if (req.method === "GET") {
    const { data, error } = await supabase.from("business_settings").select("payment_methods, payment_note").eq("user_id", user.id).maybeSingle();
    res.setHeader("Cache-Control", "no-store");
    if (error) return res.status(200).json({ ...shape(null), available: false });
    return res.status(200).json({ ...shape(data), available: true });
  }

  if (req.method === "PUT") {
    const checked = validatePaymentSettings(req.body);
    if (checked.error) return res.status(400).json({ error: checked.error });
    const { error } = await supabase.from("business_settings").upsert({ user_id: user.id, ...checked.values }, { onConflict: "user_id" });
    if (error) {
      console.error("payment settings save failed:", error.message);
      return res.status(500).json({ error: "Could not save. Run supabase/add-payments.sql in the Supabase SQL Editor first." });
    }
    return res.status(200).json({ ...shape(checked.values), available: true });
  }

  res.setHeader("Allow", "GET, PUT");
  return res.status(405).json({ error: "Method not allowed" });
}
