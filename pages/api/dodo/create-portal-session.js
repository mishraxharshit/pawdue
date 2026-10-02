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

  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("subscriptions")
    .select("dodo_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!data?.dodo_customer_id) {
    return res.status(400).json({ error: "No billing account yet - subscribe to a plan first" });
  }

  const dodo = getDodo();
  const portalSession = await dodo.customers.customerPortal.create(data.dodo_customer_id);

  return res.status(200).json({ url: portalSession.link });
}
