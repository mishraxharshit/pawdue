import { randomUUID } from "crypto";
import { createSupabaseServerClient } from "../../../lib/supabase/server";

function feedUrl(token) {
  const base = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
  return `${base}/api/calendar/${token}`;
}

// GET: current feed URL (null if none). POST: create it, or rotate it (old link stops working).
export default async function handler(req, res) {
  const supabase = createSupabaseServerClient(req, res);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return res.status(401).json({ error: "Not authenticated" });

  if (req.method === "GET") {
    const { data } = await supabase.from("business_settings").select("calendar_token").eq("user_id", user.id).maybeSingle();
    return res.status(200).json({ url: data?.calendar_token ? feedUrl(data.calendar_token) : null });
  }
  if (req.method === "POST") {
    const token = randomUUID();
    const { error } = await supabase.from("business_settings").upsert({ user_id: user.id, calendar_token: token }, { onConflict: "user_id" });
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ url: feedUrl(token) });
  }
  return res.status(405).json({ error: "Method not allowed" });
}
