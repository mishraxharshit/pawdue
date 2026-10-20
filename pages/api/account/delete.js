import { createSupabaseServerClient } from "../../../lib/supabase/server";
import { createSupabaseAdminClient } from "../../../lib/supabase/admin";
import { getDodo } from "../../../lib/dodo";

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

  // Stop billing first. If the account is deleted but the Dodo subscription
  // keeps running, the customer is charged for a product they can no longer use.
  try {
    const { data: sub } = await admin
      .from("subscriptions")
      .select("dodo_subscription_id, plan, status")
      .eq("user_id", user.id)
      .maybeSingle();
    if (sub?.dodo_subscription_id && sub.plan !== "free" && sub.status !== "cancelled" && sub.status !== "expired") {
      await getDodo().subscriptions.update(sub.dodo_subscription_id, { status: "cancelled" });
    }
  } catch (err) {
    console.error("account delete: could not cancel Dodo subscription:", err?.message);
    return res.status(502).json({
      error: "We could not cancel your subscription, so your account was not deleted. Please try again or email support.",
    });
  }

  // Every table with a user_id (dogs, bookings, subscriptions,
  // business_settings) has "on delete cascade" on that foreign key - see
  // schema.sql - so deleting the auth user removes everything else too.
  // No manual per-table cleanup needed, and nothing is left orphaned.
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return res.status(500).json({ error: error.message });

  return res.status(200).json({ ok: true });
}
