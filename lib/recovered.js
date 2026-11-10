// "What PawDue brought back": built only from real bookings. Every booking is
// made through a dog's booking link, so each one is a rebooking PawDue helped
// produce. Money counts only when the booking carries a real price (the service
// the owner picked); nothing is estimated from a default price.

const DAY = 86400000;
const num = (v) => (v === null || v === undefined || v === "" || !Number.isFinite(Number(v)) ? null : Number(v));
const round2 = (n) => Math.round(n * 100) / 100;

/**
 * rows: confirmed bookings { created_at, slot_at, price, currency, service_name, addons }
 * monthStart / prevMonthStart: Date, the start of this and last month
 */
export function buildRecovered(rows, { now = new Date(), monthStart, prevMonthStart, currency = "USD" } = {}) {
  const all = (rows || []).filter((r) => r && r.created_at);
  const same = (r) => !r.currency || r.currency === currency;
  const priceOf = (r) => (same(r) ? num(r.price) : null);

  const sum = (list) => round2(list.reduce((t, r) => t + (priceOf(r) ?? 0), 0));
  const inMonth = all.filter((r) => new Date(r.created_at) >= monthStart);
  const inPrev = all.filter((r) => new Date(r.created_at) >= prevMonthStart && new Date(r.created_at) < monthStart);

  // By service this month. Add-ons are counted on their own so the bars add up.
  const services = new Map();
  let addonCount = 0;
  let addonRevenue = 0;
  let priced = 0;
  for (const r of inMonth) {
    const price = priceOf(r);
    if (price === null) continue;
    priced += 1;
    const addons = Array.isArray(r.addons) ? r.addons.filter((a) => a && a.name) : [];
    const addonTotal = addons.reduce((t, a) => t + (num(a.price) ?? 0), 0);
    addonCount += addons.length;
    addonRevenue += addonTotal;
    const name = r.service_name || "Other";
    const s = services.get(name) || { name, count: 0, revenue: 0 };
    s.count += 1;
    s.revenue += price - addonTotal;
    services.set(name, s);
  }
  const monthRevenue = sum(inMonth);
  const byService = [...services.values()]
    .map((s) => ({ ...s, revenue: round2(s.revenue) }))
    .sort((a, b) => b.revenue - a.revenue || b.count - a.count);
  for (const s of byService) s.share = monthRevenue > 0 ? Math.round((s.revenue / monthRevenue) * 100) : 0;

  const prevRevenue = sum(inPrev);
  const upcomingRows = all.filter((r) => r.slot_at && new Date(r.slot_at) >= now && new Date(r.slot_at) < new Date(now.getTime() + 7 * DAY));

  // Last 8 weeks of money brought back, oldest first (rolling 7-day buckets).
  const weeks = [];
  for (let i = 7; i >= 0; i--) {
    const from = new Date(now.getTime() - (i + 1) * 7 * DAY);
    const to = new Date(now.getTime() - i * 7 * DAY);
    const list = all.filter((r) => new Date(r.created_at) >= from && new Date(r.created_at) < to);
    weeks.push({ count: list.length, revenue: sum(list) });
  }

  return {
    currency,
    month: { count: inMonth.length, revenue: monthRevenue, priced, unpriced: inMonth.length - priced },
    prevMonth: { count: inPrev.length, revenue: prevRevenue },
    deltaPct: prevRevenue > 0 ? Math.round(((monthRevenue - prevRevenue) / prevRevenue) * 100) : null,
    allTime: { count: all.length, revenue: sum(all) },
    byService,
    addons: { count: addonCount, revenue: round2(addonRevenue) },
    upcoming: { count: upcomingRows.length, revenue: sum(upcomingRows) },
    weeks,
  };
}
