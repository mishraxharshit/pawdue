export const PLANS = {
  free: { id: "free", name: "Free", priceLabel: "$0", limit: 10 },
  starter: { id: "starter", name: "Starter", priceLabel: "$49/mo", limit: 75 },
  pro: { id: "pro", name: "Pro", priceLabel: "$99/mo", limit: Infinity },
};

export function planLimit(planId) {
  return PLANS[planId]?.limit ?? PLANS.free.limit;
}

export function planName(planId) {
  return PLANS[planId]?.name ?? PLANS.free.name;
}
