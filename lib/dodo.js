import DodoPayments from "dodopayments";

let dodoClient = null;

export function getDodo() {
  if (!dodoClient) {
    if (!process.env.DODO_PAYMENTS_API_KEY) {
      throw new Error("DODO_PAYMENTS_API_KEY is not set");
    }
    dodoClient = new DodoPayments({
      bearerToken: process.env.DODO_PAYMENTS_API_KEY,
      environment: process.env.DODO_PAYMENTS_ENVIRONMENT || "test_mode",
    });
  }
  return dodoClient;
}

// Maps our internal plan ids to Dodo Payments Product IDs (created in the Dodo dashboard).
export function productIdForPlan(planId) {
  if (planId === "starter") return process.env.DODO_STARTER_PRODUCT_ID;
  if (planId === "pro") return process.env.DODO_PRO_PRODUCT_ID;
  return null;
}

// Reverse lookup: given a Dodo Product ID (from a webhook event), figure out
// which of our plans it corresponds to.
export function planForProductId(productId) {
  if (productId === process.env.DODO_STARTER_PRODUCT_ID) return "starter";
  if (productId === process.env.DODO_PRO_PRODUCT_ID) return "pro";
  return "free";
}
