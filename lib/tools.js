// Maths for the free tools. Plain arithmetic on what the groomer types: no
// industry statistics, no promised results.

export const TOOL_CURRENCIES = [
  { code: "USD", symbol: "$", label: "US dollar ($)" },
  { code: "GBP", symbol: "£", label: "British pound (£)" },
  { code: "AUD", symbol: "A$", label: "Australian dollar (A$)" },
  { code: "CAD", symbol: "C$", label: "Canadian dollar (C$)" },
  { code: "EUR", symbol: "€", label: "Euro (€)" },
];

export function symbolFor(code) {
  return (TOOL_CURRENCIES.find((c) => c.code === code) || TOOL_CURRENCIES[0]).symbol;
}

export function clamp(v, lo, hi) {
  const n = Number(v);
  if (!Number.isFinite(n)) return lo;
  return Math.min(hi, Math.max(lo, n));
}

const round2 = (n) => Math.round(n * 100) / 100;

/** What lapsed regulars are worth, and a what-if the groomer chooses. */
export function lapsedValue({ lapsed, weeks, price, winBackPct }) {
  const l = Math.round(clamp(lapsed, 0, 5000));
  const w = clamp(weeks, 1, 52);
  const p = clamp(price, 0, 5000);
  const pct = clamp(winBackPct, 0, 100);
  const visitsPerYear = Math.round((52 / w) * 10) / 10;
  const perDogYear = round2(p * visitsPerYear);
  const yearly = round2(l * perDogYear);
  const winBackCount = Math.round((l * pct) / 100);
  return {
    lapsed: l,
    visitsPerYear,
    perDogYear,
    yearly,
    monthly: round2(yearly / 12),
    winBackCount,
    winBackYearly: round2(winBackCount * perDogYear),
  };
}

/** The lowest price per groom that still pays you, your costs and card fees. */
export function minimumPrice({ hours, hourly, supplies, monthlyOverhead, groomsPerMonth, feePct }) {
  const h = clamp(hours, 0.25, 12);
  const rate = clamp(hourly, 0, 500);
  const sup = clamp(supplies, 0, 500);
  const over = clamp(monthlyOverhead, 0, 100000);
  const n = clamp(groomsPerMonth, 1, 400);
  const fee = clamp(feePct, 0, 20);

  const labour = round2(h * rate);
  const overheadPer = round2(over / n);
  const base = labour + sup + overheadPer;
  // Fees are taken from the price the client pays, so divide rather than add.
  const minimum = fee >= 100 ? base : base / (1 - fee / 100);
  return {
    hours: h,
    labour,
    supplies: round2(sup),
    overheadPer,
    fees: round2(minimum - base),
    minimum: round2(minimum),
    // Rounded up to a price you would actually put on a menu.
    suggested: Math.ceil(minimum / 5) * 5,
    perMonth: round2(minimum * n),
    perWeek: round2((minimum * n) / 4.33),
  };
}
