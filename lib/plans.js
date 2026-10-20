export const PLANS = {
  free: { id: "free", name: "Free", priceLabel: "$0", limit: 30 },
  starter: { id: "starter", name: "Starter", priceLabel: "$29/mo", limit: 200 },
  pro: { id: "pro", name: "Pro", priceLabel: "$49/mo", limit: Infinity },
};

export function planLimit(planId) {
  return PLANS[planId]?.limit ?? PLANS.free.limit;
}

export function planName(planId) {
  return PLANS[planId]?.name ?? PLANS.free.name;
}
