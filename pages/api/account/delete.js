import { createSupabaseServerClient } from "../../../lib/supabase/server";
import { createSupabaseAdminClient } from "../../../lib/supabase/admin";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const supabase = createSupabaseServerClient(req, res);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return res.status(401).json({ error: "Not authenticated" });

  const { confirmation } = req.body || {};
  if (confirmation !== "DELETE") {
    return res.status(400).json({ error: 'Type "DELETE" to confirm.' });
  }

  const admin = createSupabaseAdminClient();

  // Every table with a user_id (dogs, bookings, subscriptions,
  // business_settings) has "on delete cascade" on that foreign key - see
  // schema.sql - so deleting the auth user removes everything else too.
  // No manual per-table cleanup needed, and nothing is left orphaned.
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return res.status(500).json({ error: error.message });

  return res.status(200).json({ ok: true });
}
