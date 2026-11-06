// What a dog owner picks on the booking page (a service, a dog size, add-ons)
// and what it costs. Pure functions, used twice on purpose: in the browser to
// show the total as they tick things, and on the server to work out the real
// price. The server never trusts a price sent from the browser.
import { priceForSize, SIZES } from "./services";

const SIZE_KEYS = SIZES.map(([k]) => k);
export const MAX_ADDONS = 10;

/** The columns a public booking page may see, in camelCase. */
export function publicService(row) {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    description: row.description || "",
    kind: row.kind || "main",
    pricingMode: row.pricing_mode,
    price: row.price,
    priceSmall: row.price_small,
    priceMedium: row.price_medium,
    priceLarge: row.price_large,
    isStartingPrice: !!row.is_starting_price,
    durationMinutes: row.duration_minutes,
  };
}

// Works on either the database row shape or the public camelCase shape.
function toRow(s) {
  if (s.pricing_mode !== undefined) return s;
  return {
    id: s.id,
    name: s.name,
    kind: s.kind,
    pricing_mode: s.pricingMode,
    price: s.price,
    price_small: s.priceSmall,
    price_medium: s.priceMedium,
    price_large: s.priceLarge,
    is_starting_price: s.isStartingPrice,
    duration_minutes: s.durationMinutes,
  };
}

/** True when the groomer has a menu, so the owner must choose a service. */
export function menuRequiresChoice(services) {
  return (services || []).some((s) => (s.kind || "main") === "main");
}

/** True when any chosen item is priced by dog size. */
export function needsSize(items) {
  return items.some((s) => s.pricing_mode === "by_size");
}

/**
 * Works out the booking's price from the groomer's active menu.
 *   services: the groomer's active services (database rows or public shape)
 *   pick:     { serviceId, addonIds, size }
 * Returns { value: null } when there is no menu to choose from,
 *         { error } for an invalid choice, or
 *         { value: { service, addons, size, total, isStarting, durationMinutes, lines } }.
 */
export function priceSelection(services, pick) {
  const menu = (services || []).map(toRow);
  if (!menuRequiresChoice(menu)) return { value: null };

  const { serviceId, addonIds, size } = pick || {};
  const main = menu.find((s) => s.id === serviceId && (s.kind || "main") === "main");
  if (!main) return { error: "Please choose a service." };

  let ids = [];
  if (addonIds !== undefined && addonIds !== null) {
    if (!Array.isArray(addonIds) || addonIds.length > MAX_ADDONS) return { error: "Those add-ons are not valid." };
    ids = [...new Set(addonIds)];
  }
  const addons = [];
  for (const id of ids) {
    const a = menu.find((s) => s.id === id && s.kind === "addon");
    if (!a) return { error: "One of the add-ons is no longer available. Please check your choices." };
    addons.push(a);
  }

  const chosen = [main, ...addons];
  let cleanSize = null;
  if (size !== undefined && size !== null && size !== "") {
    if (!SIZE_KEYS.includes(size)) return { error: "Please choose a valid dog size." };
    cleanSize = size;
  }
  if (needsSize(chosen) && !cleanSize) return { error: "Please choose your dog's size." };

  const lines = [];
  let cents = 0;
  let isStarting = false;
  let minutes = 0;
  let anyMinutes = false;
  for (const item of chosen) {
    const price = priceForSize(item, cleanSize);
    if (price === null) return { error: "That service has no price for this size. Please contact your groomer." };
    cents += Math.round(price * 100);
    if (item.is_starting_price) isStarting = true;
    if (item.duration_minutes) {
      minutes += item.duration_minutes;
      anyMinutes = true;
    }
    lines.push({ id: item.id, name: item.name, kind: item.kind || "main", price, starting: !!item.is_starting_price });
  }

  return {
    value: {
      service: main,
      addons,
      size: cleanSize,
      total: cents / 100,
      isStarting,
      durationMinutes: anyMinutes ? minutes : null,
      lines,
    },
  };
}
