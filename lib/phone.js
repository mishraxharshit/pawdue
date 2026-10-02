import { COUNTRIES, DEFAULT_COUNTRY } from "./countries";

export function flagFor(iso2) {
  return iso2
    .toUpperCase()
    .replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)));
}

// Given a full stored value like "+919876543210", find which known country's
// dial code it starts with (longest match first, so a 3-digit code isn't
// shadowed by matching a shorter one's prefix first) and split off the local
// number. Falls back to DEFAULT_COUNTRY with the whole value treated as the
// local number if nothing matches (e.g. a legacy number entered before this
// component existed).
export function parsePhone(value) {
  const digits = (value || "").replace(/[^\d]/g, "");
  if (!digits) return { countryCode: DEFAULT_COUNTRY, local: "" };

  const sorted = [...COUNTRIES].sort((a, b) => b.dial.length - a.dial.length);
  for (const c of sorted) {
    if (digits.startsWith(c.dial)) {
      return { countryCode: c.code, local: digits.slice(c.dial.length) };
    }
  }
  return { countryCode: DEFAULT_COUNTRY, local: digits };
}
