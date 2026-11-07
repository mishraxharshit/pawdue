// What a booking was for (service, size, add-ons, price), read back from the
// snapshot saved on the booking row. Used by the emails, the calendar files,
// the dashboard and the revenue number, so they all say the same thing.
import { currencySymbol, durationLabel } from "./services";

function num(v) {
  return v === null || v === undefined || v === "" ? null : Number(v);
}

/** "£65", "£65+" (starting price) or "" when there is no amount. */
export function moneyText(amount, currency, starting = false) {
  const n = num(amount);
  if (n === null || !Number.isFinite(n)) return "";
  const body = Number.isInteger(n) ? String(n) : n.toFixed(2);
  return `${currencySymbol(currency)}${body}${starting ? "+" : ""}`;
}

/**
 * Returns null for a booking made without a menu (older bookings, or a groomer
 * with no services), otherwise a tidy description of what was booked.
 */
export function describeBooking(b) {
  if (!b || !b.service_name) return null;
  const addons = Array.isArray(b.addons) ? b.addons.filter((a) => a && a.name) : [];
  const starting = !!b.price_is_starting;
  const total = moneyText(b.price, b.currency, starting);
  const size = b.dog_size ? b.dog_size.charAt(0).toUpperCase() + b.dog_size.slice(1) : "";
  const names = [b.service_name, ...addons.map((a) => a.name)];
  return {
    name: b.service_name,
    size,
    addons: addons.map((a) => ({ name: a.name, price: moneyText(a.price, b.currency, !!a.starting) })),
    total,
    isStarting: starting,
    minutes: Number.isInteger(b.duration_minutes) && b.duration_minutes > 0 ? b.duration_minutes : null,
    duration: durationLabel(b.duration_minutes),
    // "Full groom + Nail trim"
    short: names.join(" + "),
    // "Full groom (Medium) + Nail trim"
    withSize: [size ? `${b.service_name} (${size})` : b.service_name, ...addons.map((a) => a.name)].join(" + "),
  };
}
