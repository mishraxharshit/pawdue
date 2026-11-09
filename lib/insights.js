// Turns the bookings a groomer received into the numbers on the Insights tab.
// Only real data: prices come from the snapshot saved on each booking, never
// from a guess. Bookings made without a menu are counted, but have no price.

const DAY = 86400000;
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function num(v) {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
const round2 = (n) => Math.round(n * 100) / 100;

function weekdayIndex(iso, timeZone) {
  try {
    const name = new Date(iso).toLocaleDateString("en-US", { weekday: "long", timeZone: timeZone || "UTC" });
    const i = WEEKDAYS.indexOf(name);
    return i < 0 ? new Date(iso).getUTCDay() : i;
  } catch {
    return new Date(iso).getUTCDay();
  }
}

/**
 * rows: bookings (status confirmed). options:
 *   range: 30 | 90 | "all"   - bookings RECEIVED in the last N days
 *   currency: the groomer's current currency; money in another currency is not mixed in
 */
export function buildInsights(rows, { range = 30, now = new Date(), currency = "USD", timeZone = "UTC" } = {}) {
  const all = (rows || []).filter((r) => r && r.status !== "cancelled");
  const from = range === "all" ? null : new Date(now.getTime() - Number(range) * DAY);
  const inRange = all.filter((r) => !from || new Date(r.created_at) >= from);

  let bookedValue = 0;
  let hasStarting = false;
  let priced = 0;
  let withAddon = 0;
  let otherCurrency = 0;
  const services = new Map();
  const addons = new Map();
  const sizes = { small: 0, medium: 0, large: 0 };
  const weekdays = [0, 0, 0, 0, 0, 0, 0];
  let collectedAmount = 0;
  let collectedCount = 0;

  for (const r of inRange) {
    if (r.slot_at) weekdays[weekdayIndex(r.slot_at, timeZone)] += 1;
    if (r.dog_size && sizes[r.dog_size] !== undefined) sizes[r.dog_size] += 1;

    const price = num(r.price);
    const sameCurrency = !r.currency || r.currency === currency;
    if (r.paid_at && sameCurrency) {
      collectedCount += 1;
      collectedAmount += num(r.paid_amount) ?? 0;
    }
    if (price === null) continue;
    if (!sameCurrency) {
      otherCurrency += 1;
      continue;
    }
    priced += 1;
    bookedValue += price;
    if (r.price_is_starting) hasStarting = true;

    const list = Array.isArray(r.addons) ? r.addons.filter((a) => a && a.name) : [];
    if (list.length) withAddon += 1;
    const addonTotal = list.reduce((t, a) => t + (num(a.price) ?? 0), 0);

    if (r.service_name) {
      const s = services.get(r.service_name) || { name: r.service_name, count: 0, revenue: 0 };
      s.count += 1;
      s.revenue += price - addonTotal; // the service itself, add-ons are counted on their own
      services.set(r.service_name, s);
    }
    for (const a of list) {
      const x = addons.get(a.name) || { name: a.name, count: 0, revenue: 0 };
      x.count += 1;
      x.revenue += num(a.price) ?? 0;
      addons.set(a.name, x);
    }
  }

  const serviceList = [...services.values()]
    .map((s) => ({ ...s, revenue: round2(s.revenue), avg: s.count ? round2(s.revenue / s.count) : 0 }))
    .sort((a, b) => b.revenue - a.revenue || b.count - a.count);
  const serviceTotal = serviceList.reduce((t, s) => t + s.revenue, 0);
  for (const s of serviceList) s.share = serviceTotal > 0 ? Math.round((s.revenue / serviceTotal) * 100) : 0;

  const addonList = [...addons.values()]
    .map((a) => ({ ...a, revenue: round2(a.revenue) }))
    .sort((a, b) => b.count - a.count || b.revenue - a.revenue);

  // Money still to be marked as paid: appointments already past, any time.
  let awaitingCount = 0;
  let awaitingAmount = 0;
  for (const r of all) {
    if (r.paid_at || !r.slot_at || new Date(r.slot_at) > now) continue;
    awaitingCount += 1;
    if (!r.currency || r.currency === currency) awaitingAmount += num(r.price) ?? 0;
  }

  const maxDay = Math.max(...weekdays);
  return {
    range,
    currency,
    bookings: inRange.length,
    priced,
    unpriced: inRange.length - priced - otherCurrency,
    otherCurrency,
    bookedValue: round2(bookedValue),
    hasStarting,
    avgTicket: priced ? round2(bookedValue / priced) : null,
    addonRate: priced ? Math.round((withAddon / priced) * 100) : null,
    collected: { count: collectedCount, amount: round2(collectedAmount) },
    awaiting: { count: awaitingCount, amount: round2(awaitingAmount) },
    byService: serviceList,
    addons: addonList,
    sizes,
    weekdays: WEEKDAYS.map((name, i) => ({ name, count: weekdays[i] })),
    busiest: maxDay > 0 ? WEEKDAYS[weekdays.indexOf(maxDay)] : null,
  };
}
