import { createSupabaseServerClient } from "../../../lib/supabase/server";
import { getDodo, productIdForPlan } from "../../../lib/dodo";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const supabase = createSupabaseServerClient(req, res);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return res.status(401).json({ error: "Not authenticated" });

  const { plan } = req.body || {};
  const productId = productIdForPlan(plan);
  if (!productId) {
    return res.status(400).json({ error: "Unknown or unconfigured plan" });
  }

  const dodo = getDodo();
  const origin = req.headers.origin || `https://${req.headers.host}`;

  // We don't pre-create a Dodo customer - passing email/name lets Dodo attach
  // (or create) the customer itself. The webhook links it back to this user
  // via the metadata below, and stores the resulting customer_id for us.
  const session = await dodo.checkoutSessions.create({
    product_cart: [{ product_id: productId, quantity: 1 }],
    customer: { email: user.email, name: user.email },
    return_url: `${origin}/dashboard?upgraded=1`,
    metadata: { supabase_user_id: user.id, plan },
  });

  return res.status(200).json({ url: session.checkout_url });
}
