// The dog owner's side of the groomer's menu: choose a service, the dog's size
// (only when a chosen item is priced by size) and any add-ons, with the total
// updating as they tick things. All the maths is in lib/bookingServices.js.
import { SIZES, priceLabel, durationLabel, currencySymbol } from "../lib/services";
import { priceSelection, needsSize } from "../lib/bookingServices";

// The public shape (camelCase) -> the shape priceLabel understands.
function asRow(s) {
  return {
    pricing_mode: s.pricingMode,
    price: s.price,
    price_small: s.priceSmall,
    price_medium: s.priceMedium,
    price_large: s.priceLarge,
    is_starting_price: s.isStartingPrice,
  };
}

export default function BookingServicePicker({ menu, dogName, pick, onChange, translate }) {
  const symbol = currencySymbol(menu.currency);
  const mains = menu.services.filter((s) => s.kind === "main");
  const addons = menu.services.filter((s) => s.kind === "addon");
  const chosenMain = mains.find((s) => s.id === pick.serviceId);
  const chosenAddons = addons.filter((a) => pick.addonIds.includes(a.id));
  const sizeNeeded = needsSize([chosenMain, ...chosenAddons].filter(Boolean).map((s) => ({ pricing_mode: s.pricingMode })));
  const result = priceSelection(menu.services, pick);
  const value = result.value;

  function toggleAddon(id) {
    const has = pick.addonIds.includes(id);
    onChange({ ...pick, addonIds: has ? pick.addonIds.filter((x) => x !== id) : [...pick.addonIds, id] });
  }

  return (
    <div className="pd-pick">
      <p className="pd-pick-title">{translate("booking.chooseService", { dog: dogName })}</p>
      <div className="pd-pick-list" role="radiogroup" aria-label={translate("booking.chooseService", { dog: dogName })}>
        {mains.map((s) => (
          <button
            key={s.id}
            type="button"
            role="radio"
            aria-checked={pick.serviceId === s.id}
            className={`pd-pick-card${pick.serviceId === s.id ? " is-on" : ""}`}
            onClick={() => onChange({ ...pick, serviceId: s.id })}
          >
            <span className="pd-pick-name">{s.name}</span>
            <span className="pd-pick-price" translate="no">{priceLabel(asRow(s), symbol)}</span>
            {(s.description || s.durationMinutes) && (
              <span className="pd-pick-desc">
                {[s.description, durationLabel(s.durationMinutes)].filter(Boolean).join(" · ")}
              </span>
            )}
          </button>
        ))}
      </div>

      {sizeNeeded && (
        <>
          <p className="pd-pick-title">{translate("booking.dogSize")}</p>
          <div className="pd-pick-sizes" role="radiogroup" aria-label={translate("booking.dogSize")}>
            {SIZES.map(([key, label]) => (
              <button
                key={key}
                type="button"
                role="radio"
                aria-checked={pick.size === key}
                className={`pd-pick-card${pick.size === key ? " is-on" : ""}`}
                onClick={() => onChange({ ...pick, size: key })}
              >
                <span className="pd-pick-name">{label}</span>
                <span className="pd-pick-desc">{menu.sizeGuide[key]}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {addons.length > 0 && chosenMain && (
        <>
          <p className="pd-pick-title">{translate("booking.addOns")}</p>
          <div className="pd-pick-list">
            {addons.map((a) => (
              <label key={a.id} className={`pd-pick-card pd-pick-check${pick.addonIds.includes(a.id) ? " is-on" : ""}`}>
                <input type="checkbox" checked={pick.addonIds.includes(a.id)} onChange={() => toggleAddon(a.id)} />
                <span className="pd-pick-name">{a.name}</span>
                <span className="pd-pick-price" translate="no">{priceLabel(asRow(a), symbol)}</span>
                {a.description && <span className="pd-pick-desc">{a.description}</span>}
              </label>
            ))}
          </div>
        </>
      )}

      {value && (
        <div className="pd-pick-total" aria-live="polite">
          <span>{translate("booking.estimatedTotal")}</span>
          <b translate="no">{`${symbol}${Number.isInteger(value.total) ? value.total : value.total.toFixed(2)}${value.isStarting ? "+" : ""}`}</b>
          {value.isStarting && <span className="pd-pick-desc">{translate("booking.startingNote")}</span>}
        </div>
      )}
      {menu.bookingNote && <p className="pd-pick-note">{menu.bookingNote}</p>}
    </div>
  );
}
