// Services and prices a groomer offers. Pure helpers (no React, no database) so
// they can be tested and shared by the API, the settings screen and, in the next
// phase, the booking page and emails.

export const SIZES = [
  ["small", "Small"],
  ["medium", "Medium"],
  ["large", "Large"],
];
export const MAX_SERVICES = 40;

export const CURRENCIES = [
  ["USD", "US dollar ($)", "$"],
  ["GBP", "British pound (£)", "£"],
  ["AUD", "Australian dollar ($)", "$"],
  ["CAD", "Canadian dollar ($)", "$"],
  ["NZD", "New Zealand dollar ($)", "$"],
  ["EUR", "Euro (€)", "€"],
];
export function currencySymbol(code) {
  const hit = CURRENCIES.find((c) => c[0] === code);
  return hit ? hit[2] : "$";
}

export const DEFAULT_SIZE_GUIDE = {
  small: "Under 10 kg / 22 lb",
  medium: "10 to 25 kg / 22 to 55 lb",
  large: "Over 25 kg / 55 lb",
};

/** Cleans the shop-wide settings (currency, size guide, booking note). */
export function validateShopSettings(body) {
  const b = body || {};
  const currency = typeof b.currency === "string" ? b.currency.toUpperCase() : "";
  if (!CURRENCIES.some((c) => c[0] === currency)) return { error: "Pick a currency from the list." };
  const guide = {};
  for (const [key, label] of SIZES) {
    const v = text(b.sizeGuide && b.sizeGuide[key], 60);
    if (v.length > 60) return { error: `The ${label.toLowerCase()} size note is too long (60 characters at most).` };
    guide[key] = v || DEFAULT_SIZE_GUIDE[key];
  }
  const note = text(b.bookingNote, 500);
  if (note.length > 500) return { error: "The booking message is too long (500 characters at most)." };
  return { values: { currency, size_guide: guide, booking_note: note || null } };
}
export const SUGGESTED_SERVICES = [
  { name: "Full groom", category: "Grooming" },
  { name: "Bath and brush", category: "Grooming" },
  { name: "Puppy intro groom", category: "Puppy" },
  { name: "Nail trim", category: "Add-ons" },
  { name: "Teeth brushing", category: "Add-ons" },
];

function text(v, max) {
  return typeof v === "string" ? v.trim().slice(0, max + 1) : "";
}

// "" or missing -> null. A bad value -> NaN so the caller can say which field.
function money(v) {
  if (v === "" || v === null || v === undefined) return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0 || n > 10000) return NaN;
  return Math.round(n * 100) / 100;
}

/** Returns { error } or { values } in the database's column names. */
export function validateServiceInput(body) {
  const b = body || {};
  const name = text(b.name, 60);
  if (!name) return { error: "Give the service a name." };
  if (name.length > 60) return { error: "The name is too long (60 characters at most)." };
  const category = text(b.category, 40) || "General";
  if (category.length > 40) return { error: "The category is too long (40 characters at most)." };
  const description = text(b.description, 200);
  if (description.length > 200) return { error: "The description is too long (200 characters at most)." };

  const mode = b.pricingMode === "by_size" ? "by_size" : "flat";
  let duration = null;
  if (b.durationMinutes !== "" && b.durationMinutes !== null && b.durationMinutes !== undefined) {
    duration = Number(b.durationMinutes);
    if (!Number.isInteger(duration) || duration < 5 || duration > 600) {
      return { error: "Time must be a whole number of minutes between 5 and 600." };
    }
  }
  const values = {
    name,
    category,
    description,
    kind: b.kind === "addon" ? "addon" : "main",
    is_starting_price: !!b.isStartingPrice,
    duration_minutes: duration,
    pricing_mode: mode,
    price: null,
    price_small: null,
    price_medium: null,
    price_large: null,
    is_active: b.isActive === undefined ? true : !!b.isActive,
  };

  if (mode === "flat") {
    const p = money(b.price);
    if (p === null) return { error: "Enter a price." };
    if (Number.isNaN(p)) return { error: "The price must be a number between 0 and 10,000." };
    values.price = p;
  } else {
    for (const [key, label] of SIZES) {
      const p = money(b[`price${label}`]);
      if (p === null) return { error: `Enter a price for ${label.toLowerCase()} dogs.` };
      if (Number.isNaN(p)) return { error: `The ${label.toLowerCase()} price must be a number between 0 and 10,000.` };
      values[`price_${key}`] = p;
    }
  }

  if (b.sortOrder !== undefined) {
    const n = Number(b.sortOrder);
    if (Number.isInteger(n) && n >= 0 && n <= 100000) values.sort_order = n;
  }
  return { values };
}

function fmt(n, symbol) {
  const v = Number(n);
  return `${symbol}${Number.isInteger(v) ? v : v.toFixed(2)}`;
}

/** "$65" for one price, "$55 - $90" when it depends on size; a trailing "+" marks a starting price. */
export function priceLabel(service, symbol = "$") {
  const base = rawPriceLabel(service, symbol);
  return base && service.is_starting_price ? `${base}+` : base;
}

/** "1 h 30 min", "45 min", or "" when no time is set. */
export function durationLabel(minutes) {
  const m = Number(minutes);
  if (!Number.isInteger(m) || m <= 0) return "";
  if (m < 60) return `${m} min`;
  return m % 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${Math.floor(m / 60)} h`;
}

function rawPriceLabel(service, symbol) {
  if (!service) return "";
  if (service.pricing_mode === "by_size") {
    const all = [service.price_small, service.price_medium, service.price_large].filter((x) => x !== null && x !== undefined).map(Number);
    if (!all.length) return "";
    const lo = Math.min(...all);
    const hi = Math.max(...all);
    return lo === hi ? fmt(lo, symbol) : `${fmt(lo, symbol)} - ${fmt(hi, symbol)}`;
  }
  return service.price === null || service.price === undefined ? "" : fmt(service.price, symbol);
}

/** The price for one dog size ("small" | "medium" | "large"), or null. */
export function priceForSize(service, size) {
  if (!service) return null;
  const v = service.pricing_mode === "by_size" ? service[`price_${size}`] : service.price;
  return v === null || v === undefined ? null : Number(v);
}

/** Groups into [{ category, items }], keeping the groomer's own order. Pass a kind to keep only "main" or "addon". */
export function groupServices(list, kind) {
  const sorted = [...(list || [])].filter((x) => !kind || (x.kind || "main") === kind).sort(
    (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || String(a.name).localeCompare(String(b.name))
  );
  const order = [];
  const map = new Map();
  for (const s of sorted) {
    const c = s.category || "General";
    if (!map.has(c)) {
      map.set(c, []);
      order.push(c);
    }
    map.get(c).push(s);
  }
  return order.map((category) => ({ category, items: map.get(category) }));
}
