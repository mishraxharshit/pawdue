import { createSupabaseServerClient } from "../../../lib/supabase/server";
import { createSupabaseAdminClient } from "../../../lib/supabase/admin";
import { planLimit, planName } from "../../../lib/plans";

export default async function handler(req, res) {
  const supabase = createSupabaseServerClient(req, res);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return res.status(401).json({ error: "Not authenticated" });

  const admin = createSupabaseAdminClient();
  const { data: sub } = await admin
    .from("subscriptions")
    .select("plan, status, current_period_end")
    .eq("user_id", user.id)
    .maybeSingle();

  const plan = sub?.plan || "free";
  const { count } = await supabase.from("dogs").select("*", { count: "exact", head: true });

  return res.status(200).json({
    plan,
    planName: planName(plan),
    limit: planLimit(plan),
    dogCount: count ?? 0,
    status: sub?.status || "active",
    hasBillingAccount: !!sub?.plan && plan !== "free",
  });
}
