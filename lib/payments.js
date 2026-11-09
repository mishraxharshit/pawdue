// How a groomer gets paid. PawDue never touches the money: groomers list the
// ways they accept payment, clients pay them directly, and the groomer records
// it here so the client gets a clear receipt.
import { currencySymbol } from "./services";

export const MAX_PAYMENT_METHODS = 9;

// `detail` is what a client needs to pay this way (a handle, an email, ...).
// Methods without a detail are paid in person.
export const PAYMENT_METHODS = [
  { key: "cash", label: "Cash", detail: null },
  { key: "card", label: "Card", detail: null },
  { key: "tap", label: "Apple Pay / Google Pay", detail: null },
  { key: "venmo", label: "Venmo", detail: "@yourname" },
  { key: "cashapp", label: "Cash App", detail: "$yourname" },
  { key: "zelle", label: "Zelle", detail: "email or phone number" },
  { key: "paypal", label: "PayPal", detail: "paypal.me/yourname or email" },
  { key: "bank", label: "Bank transfer", detail: "account details" },
  { key: "other", label: "Other", detail: "how to pay" },
];

const LABEL = Object.fromEntries(PAYMENT_METHODS.map((m) => [m.key, m.label]));

export function methodLabel(key) {
  return LABEL[key] || "";
}

function text(v, max) {
  return typeof v === "string" ? v.trim().slice(0, max + 1) : "";
}

/** Returns { error } or { values } in the database's column names. */
export function validatePaymentSettings(body) {
  const b = body || {};
  const list = Array.isArray(b.methods) ? b.methods : [];
  if (list.length > MAX_PAYMENT_METHODS) return { error: "Too many payment methods." };
  const seen = new Set();
  const methods = [];
  for (const m of list) {
    const type = m && m.type;
    if (!LABEL[type]) return { error: "Pick payment methods from the list." };
    if (seen.has(type)) continue;
    seen.add(type);
    const detail = text(m.detail, 80);
    if (detail.length > 80) return { error: `The ${LABEL[type]} details are too long (80 characters at most).` };
    methods.push(detail ? { type, detail } : { type });
  }
  const note = text(b.note, 200);
  if (note.length > 200) return { error: "The payment note is too long (200 characters at most)." };
  return { values: { payment_methods: methods, payment_note: note || null } };
}

/** Stored list -> [{ type, label, detail }] ready to show. Ignores junk. */
export function readMethods(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((m) => m && LABEL[m.type])
    .map((m) => ({ type: m.type, label: LABEL[m.type], detail: typeof m.detail === "string" ? m.detail : "" }));
}

/** "Cash, Card, Venmo (@maya)" */
export function methodsText(methods, { withDetails = true } = {}) {
  return (methods || [])
    .map((m) => (withDetails && m.detail ? `${m.label} (${m.detail})` : m.label))
    .join(", ");
}

/** Receipt number shown to the client and the groomer. */
export function receiptNumber(bookingId) {
  return `PD-${String(bookingId || "").replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}

/** Checks what the groomer typed when marking a booking paid. */
export function validatePaid(body, booking) {
  const b = body || {};
  if (!LABEL[b.method]) return { error: "Choose how they paid." };
  const raw = b.amount === "" || b.amount === null || b.amount === undefined ? booking?.price : b.amount;
  const n = Number(raw);
  if (raw === null || raw === undefined || !Number.isFinite(n) || n < 0 || n > 100000) return { error: "Enter the amount they paid." };
  return { values: { amount: Math.round(n * 100) / 100, method: b.method } };
}

/** "Paid £60 by Card on Nov 7" */
export function paidSummary(b, timeZone) {
  if (!b || !b.paid_at) return "";
  const amount = `${currencySymbol(b.currency)}${Number.isInteger(Number(b.paid_amount)) ? Number(b.paid_amount) : Number(b.paid_amount).toFixed(2)}`;
  let day = "";
  try {
    day = new Date(b.paid_at).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: timeZone || "UTC" });
  } catch {}
  return `Paid ${amount}${b.paid_method ? ` by ${methodLabel(b.paid_method)}` : ""}${day ? ` on ${day}` : ""}`;
}
