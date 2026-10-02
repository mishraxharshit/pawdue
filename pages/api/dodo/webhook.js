import { Webhook } from "standardwebhooks";
import { planForProductId } from "../../../lib/dodo";
import { createSupabaseAdminClient } from "../../../lib/supabase/admin";

// Dodo signs webhooks per the Standard Webhooks spec, which needs the raw
// request body - so we turn off Next's default body parsing for this route.
export const config = {
  api: { bodyParser: false },
};

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end("Method not allowed");

  const admin = createSupabaseAdminClient();

  let payload;
  try {
    const rawBody = (await readRawBody(req)).toString("utf8");
    const webhook = new Webhook(process.env.DODO_PAYMENTS_WEBHOOK_KEY);
    const webhookHeaders = {
      "webhook-id": req.headers["webhook-id"] || "",
      "webhook-signature": req.headers["webhook-signature"] || "",
      "webhook-timestamp": req.headers["webhook-timestamp"] || "",
    };
    await webhook.verify(rawBody, webhookHeaders);
    payload = JSON.parse(rawBody);
  } catch (err) {
    console.error("Dodo webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    const { type, data } = payload;

    switch (type) {
      // Fires once the customer's payment method is authorized - this is
      // Dodo's equivalent of "checkout completed" for a subscription.
      case "subscription.active":
      case "subscription.renewed":
      case "subscription.updated":
      case "subscription.on_hold": {
        const userId = data.metadata?.supabase_user_id;
        const plan = planForProductId(data.product_id);
        const customerId = data.customer?.customer_id;

        // Fall back to matching by customer_id if metadata is missing on a
        // later update event (Dodo carries metadata on the object it was set
        // on, so this is a safety net, not the primary path).
        let resolvedUserId = userId;
        if (!resolvedUserId && customerId) {
          const { data: existing } = await admin
            .from("subscriptions")
            .select("user_id")
            .eq("dodo_customer_id", customerId)
            .maybeSingle();
          resolvedUserId = existing?.user_id;
        }

        if (resolvedUserId) {
          await admin.from("subscriptions").upsert(
            {
              user_id: resolvedUserId,
              dodo_customer_id: customerId,
              dodo_subscription_id: data.subscription_id,
              plan,
              status: data.status,
              current_period_end: data.next_billing_date || null,
            },
            { onConflict: "user_id" }
          );
        }
        break;
      }

      // A hard failure at creation time - never grant access for this.
      case "subscription.failed": {
        const userId = data.metadata?.supabase_user_id;
        if (userId) {
          await admin
            .from("subscriptions")
            .upsert({ user_id: userId, plan: "free", status: "failed" }, { onConflict: "user_id" });
        }
        break;
      }

      // Cancelled - drop back to free, keep the customer id for next time.
      case "subscription.cancelled":
      case "subscription.expired": {
        const customerId = data.customer?.customer_id;
        const { data: existing } = customerId
          ? await admin.from("subscriptions").select("user_id").eq("dodo_customer_id", customerId).maybeSingle()
          : { data: null };

        if (existing?.user_id) {
          await admin
            .from("subscriptions")
            .update({ plan: "free", status: type === "subscription.expired" ? "expired" : "cancelled" })
            .eq("user_id", existing.user_id);
        }
        break;
      }

      default:
        // Ignore payment.* and other events we don't need for plan gating.
        break;
    }
  } catch (err) {
    console.error("Error handling Dodo webhook event:", err);
    return res.status(500).json({ error: "Webhook handler failed" });
  }

  return res.status(200).json({ received: true });
}
