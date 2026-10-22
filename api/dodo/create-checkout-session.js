import { createSupabaseServerClient } from "../../../lib/supabase/server";
import { getDodo, productIdForPlan } from "../../../lib/dodo";
import { createSupabaseAdminClient } from "../../../lib/supabase/admin";

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

  try {
    // Do not start a second paid subscription while one is already active.
    const admin = createSupabaseAdminClient();
    const { data: current } = await admin
      .from("subscriptions")
      .select("plan,status")
      .eq("user_id", user.id)
      .maybeSingle();
    if (current && current.plan !== "free" && current.status === "active") {
      return res.status(409).json({
        error: "You already have an active plan. Use Manage billing to change or cancel it.",
      });
    }

    const dodo = getDodo();
    // Use our own configured URL, never the client-supplied Origin header.
    const origin = (process.env.NEXT_PUBLIC_APP_URL || `https://${req.headers.host}`).replace(/\/+$/, "");

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
  } catch (err) {
    // Always answer with JSON, never Next's HTML 500 page - the browser
    // would otherwise fail with "Unexpected token '<'" and hide the cause.
    const status = err?.status || err?.statusCode;
    const detail = err?.error?.message || err?.message || "Unknown error";
    console.error("Dodo checkout failed", {
      status,
      detail,
      env: process.env.DODO_PAYMENTS_ENVIRONMENT || "test_mode",
      plan,
      productId,
    });
    let hint = "";
    if (/DODO_PAYMENTS_API_KEY/.test(detail)) {
      hint = " Set DODO_PAYMENTS_API_KEY in Vercel and redeploy.";
    } else if (status === 401 || status === 403) {
      hint =
        " Dodo rejected the API key. Check the key matches DODO_PAYMENTS_ENVIRONMENT (test key with test_mode, live key with live_mode).";
    } else if (status === 404 || status === 422) {
      hint =
        " Check the Product ID exists in the same mode (test/live) as your API key and is a subscription product.";
    }
    return res.status(500).json({ error: `Checkout failed: ${detail}.${hint}` });
  }
}
