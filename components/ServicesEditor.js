// Settings > Services: the groomer's own menu (main services and add-ons, with
// prices) plus the shop-wide settings that go with it (currency, what small /
// medium / large mean, and a message for clients). The booking page and emails
// start using all of this in the next phases.
import { useEffect, useMemo, useState } from "react";
import {
  SIZES, SUGGESTED_SERVICES, MAX_SERVICES, CURRENCIES, DEFAULT_SIZE_GUIDE,
  priceLabel, durationLabel, groupServices, currencySymbol,
} from "../lib/services";

const EMPTY = {
  name: "", category: "", description: "", kind: "main", pricingMode: "flat",
  price: "", priceSmall: "", priceMedium: "", priceLarge: "",
  isStartingPrice: false, durationMinutes: "", isActive: true,
};

function toForm(s) {
  return {
    name: s.name,
    category: s.category === "General" || s.category === "Add-ons" ? "" : s.category,
    description: s.description || "",
    kind: s.kind || "main",
    pricingMode: s.pricing_mode,
    price: s.price ?? "",
    priceSmall: s.price_small ?? "",
    priceMedium: s.price_medium ?? "",
    priceLarge: s.price_large ?? "",
    isStartingPrice: !!s.is_starting_price,
    durationMinutes: s.duration_minutes ?? "",
    isActive: s.is_active,
    sortOrder: s.sort_order,
  };
}

export default function ServicesEditor({ onToast }) {
  const [list, setList] = useState(null);
  const [setupNeeded, setSetupNeeded] = useState(false);
  const [editing, setEditing] = useState(null); // null | { id|null, form }
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [shop, setShop] = useState(null); // { currency, sizeGuide, bookingNote, available }
  const [shopSaving, setShopSaving] = useState(false);
  const [shopError, setShopError] = useState("");

  async function load() {
    try {
      const res = await fetch("/api/services", { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (res.ok) setList(data);
      else {
        setSetupNeeded(!!data.setupNeeded);
        setList([]);
      }
    } catch {
      setList([]);
    }
    try {
      const res = await fetch("/api/services/settings", { cache: "no-store" });
      if (res.ok) setShop(await res.json());
    } catch {}
  }
  useEffect(() => {
    load();
  }, []);

  const symbol = currencySymbol(shop?.currency);
  const mainGroups = useMemo(() => groupServices(list, "main"), [list]);
  const addonGroups = useMemo(() => groupServices(list, "addon"), [list]);
  const categories = useMemo(() => [...new Set((list || []).filter((s) => s.kind !== "addon").map((s) => s.category))], [list]);

  function open(service, preset) {
    setError("");
    setEditing(service ? { id: service.id, form: toForm(service) } : { id: null, form: { ...EMPTY, ...(preset || {}) } });
  }
  const set = (k, v) => setEditing((e) => ({ ...e, form: { ...e.form, [k]: v } }));

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const form = { ...editing.form };
      if (form.kind === "addon" && !form.category) form.category = "Add-ons";
      const res = await fetch(editing.id ? `/api/services/${editing.id}` : "/api/services", {
        method: editing.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not save");
      setList((prev) => (editing.id ? prev.map((s) => (s.id === data.id ? data : s)) : [...prev, data]));
      onToast && onToast(editing.id ? "Service updated ✓" : "Service added ✓");
      setEditing(null);
    } catch (err) {
      setError(err.message);
    }
    setSaving(false);
  }

  async function put(s, changes) {
    const res = await fetch(`/api/services/${s.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...toForm(s), ...changes }),
    }).catch(() => null);
    return !!(res && res.ok);
  }

  async function toggle(s) {
    setBusyId(s.id);
    const next = !s.is_active;
    setList((prev) => prev.map((x) => (x.id === s.id ? { ...x, is_active: next } : x)));
    if (!(await put(s, { isActive: next }))) {
      setList((prev) => prev.map((x) => (x.id === s.id ? { ...x, is_active: !next } : x)));
      onToast && onToast("Could not change that service", "error");
    }
    setBusyId(null);
  }

  // Moves a service one place up or down inside its own group, then saves the
  // new order for the rows whose place changed.
  async function move(group, s, dir) {
    const i = group.items.findIndex((x) => x.id === s.id);
    const j = i + dir;
    if (j < 0 || j >= group.items.length) return;
    const order = [...group.items];
    [order[i], order[j]] = [order[j], order[i]];
    const base = Math.min(...group.items.map((x) => x.sort_order || 0));
    const updates = order.map((x, idx) => ({ x, sort_order: base + idx })).filter(({ x, sort_order }) => x.sort_order !== sort_order);
    // If several rows share the same number, renumber the whole group.
    const all = new Set(order.map((_, idx) => base + idx)).size === order.length && updates.length ? updates : order.map((x, idx) => ({ x, sort_order: base + idx }));
    const before = list;
    setList((prev) => prev.map((x) => { const u = all.find((a) => a.x.id === x.id); return u ? { ...x, sort_order: u.sort_order } : x; }));
    const results = await Promise.all(all.map(({ x, sort_order }) => put(x, { sortOrder: sort_order })));
    if (results.some((ok) => !ok)) {
      setList(before);
      onToast && onToast("Could not change the order", "error");
    }
  }

  async function remove(s) {
    if (!window.confirm(`Delete "${s.name}"? Bookings you already have keep their price.`)) return;
    setBusyId(s.id);
    const before = list;
    setList((prev) => prev.filter((x) => x.id !== s.id));
    const res = await fetch(`/api/services/${s.id}`, { method: "DELETE" }).catch(() => null);
    if (!res || !res.ok) {
      setList(before);
      onToast && onToast("Could not delete that service", "error");
    } else onToast && onToast("Service deleted");
    setBusyId(null);
  }

  async function saveShop(e) {
    e.preventDefault();
    setShopSaving(true);
    setShopError("");
    try {
      const res = await fetch("/api/services/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(shop),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not save");
      setShop(data);
      onToast && onToast("Saved ✓");
    } catch (err) {
      setShopError(err.message);
    }
    setShopSaving(false);
  }

  if (list === null) return <div className="card"><p className="sub" style={{ margin: 0 }}>Loading…</p></div>;

  if (setupNeeded) {
    return (
      <div className="card">
        <h3 className="pd-set-title">Services</h3>
        <p className="sub">One-time setup needed: run <code>supabase/add-services.sql</code> in the Supabase SQL Editor, then refresh this page.</p>
      </div>
    );
  }

  const f = editing?.form;

  function renderGroups(groups) {
    return groups.map((g) => (
      <div key={g.category} className="pd-svc-group">
        <h4 className="pd-svc-cat">{g.category}</h4>
        <ul className="pd-svc-list">
          {g.items.map((s, idx) => (
            <li key={s.id} className={s.is_active ? "" : "is-off"}>
              <div className="pd-svc-main">
                <b>{s.name}</b>
                <span className="pd-svc-price">{priceLabel(s, symbol)}</span>
                {s.pricing_mode === "by_size" && <span className="sub"> by dog size</span>}
                {s.duration_minutes && <span className="sub"> · {durationLabel(s.duration_minutes)}</span>}
                {!s.is_active && <span className="pd-svc-hidden">Hidden</span>}
                {s.description && <div className="sub">{s.description}</div>}
                {s.pricing_mode === "by_size" && (
                  <div className="sub">
                    {SIZES.map(([k, label]) => `${label} ${priceLabel({ pricing_mode: "flat", price: s[`price_${k}`] }, symbol)}`).join(" · ")}
                  </div>
                )}
              </div>
              <div className="pd-svc-actions">
                <button className="link-btn" aria-label={`Move ${s.name} up`} disabled={idx === 0} onClick={() => move(g, s, -1)}>↑</button>
                <button className="link-btn" aria-label={`Move ${s.name} down`} disabled={idx === g.items.length - 1} onClick={() => move(g, s, 1)}>↓</button>
                <button className="link-btn" onClick={() => open(s)}>Edit</button>
                <button className="link-btn" onClick={() => open(null, { ...toForm(s), name: `${s.name} copy` })}>Copy</button>
                <button className="link-btn" disabled={busyId === s.id} onClick={() => toggle(s)}>{s.is_active ? "Hide" : "Show"}</button>
                <button className="link-btn" disabled={busyId === s.id} onClick={() => remove(s)}>Delete</button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    ));
  }

  return (
    <div className="pd-settings-col">
      <div className="card">
        <div className="pd-today-head">
          <h3 className="pd-set-title">Your services and prices</h3>
          <button className="small" onClick={() => open(null)} disabled={list.length >= MAX_SERVICES}>Add service</button>
        </div>
        <p className="sub" style={{ margin: "0 0 14px" }}>
          Build your menu once. Soon your clients will pick from it when they book, and the confirmation emails will show the service and price. A + after a price means "starting from".
        </p>

        {list.length === 0 && (
          <div>
            <p className="sub">Start with a common one, then set your own price:</p>
            <div className="pd-svc-suggest">
              {SUGGESTED_SERVICES.map((s) => (
                <button key={s.name} className="ghost small" onClick={() => open(null, { name: s.name, category: s.category === "Add-ons" ? "" : s.category, kind: s.category === "Add-ons" ? "addon" : "main" })}>{s.name}</button>
              ))}
            </div>
          </div>
        )}

        {renderGroups(mainGroups)}
        {addonGroups.length > 0 && (
          <>
            <p className="pd-svc-divider">Add-ons clients can tick on top of a service</p>
            {renderGroups(addonGroups)}
          </>
        )}
      </div>

      {shop && (
        <form className="card" onSubmit={saveShop}>
          <h3 className="pd-set-title">Prices, sizes and your message</h3>
          {shop.available === false && (
            <p className="sub">One-time setup needed: run <code>supabase/add-services.sql</code> in the Supabase SQL Editor to save these.</p>
          )}
          <label>Currency</label>
          <select value={shop.currency} onChange={(e) => setShop({ ...shop, currency: e.target.value })}>
            {CURRENCIES.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
          </select>

          <label style={{ marginTop: 14 }}>What do your dog sizes mean?</label>
          <p className="sub" style={{ margin: "0 0 8px" }}>Clients see this when they choose a size, so they pick the right price.</p>
          <div className="pd-svc-sizes">
            {SIZES.map(([k, label]) => (
              <div key={k}>
                <label>{label}</label>
                <input value={shop.sizeGuide[k]} maxLength={60} placeholder={DEFAULT_SIZE_GUIDE[k]} onChange={(e) => setShop({ ...shop, sizeGuide: { ...shop.sizeGuide, [k]: e.target.value } })} />
              </div>
            ))}
          </div>

          <label style={{ marginTop: 14 }}>Message for clients when they book (optional)</label>
          <textarea rows={3} maxLength={500} value={shop.bookingNote} onChange={(e) => setShop({ ...shop, bookingNote: e.target.value })} placeholder="e.g. Please arrive 5 minutes early. Vaccinations must be up to date. 24 hours notice to cancel." />

          {shopError && <div className="error" style={{ marginTop: 10 }}>{shopError}</div>}
          <div style={{ marginTop: 14 }}>
            <button type="submit" disabled={shopSaving}>{shopSaving ? "Saving…" : "Save"}</button>
          </div>
        </form>
      )}

      {editing && (
        <div className="pd-modal-overlay" onMouseDown={() => setEditing(null)}>
          <div className="pd-modal" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Service">
            <div className="pd-modal-head">
              <h2>{editing.id ? "Edit service" : "Add service"}</h2>
              <button className="pd-modal-close" onClick={() => setEditing(null)} aria-label="Close">×</button>
            </div>
            <form onSubmit={save}>
              <div className="pd-svc-mode">
                <button type="button" className={f.kind === "main" ? "small" : "small ghost"} onClick={() => set("kind", "main")}>Main service</button>
                <button type="button" className={f.kind === "addon" ? "small" : "small ghost"} onClick={() => set("kind", "addon")}>Add-on</button>
              </div>
              <div className="row2">
                <div>
                  <label>Service name</label>
                  <input value={f.name} maxLength={60} onChange={(e) => set("name", e.target.value)} placeholder={f.kind === "addon" ? "e.g. Nail trim" : "e.g. Full groom"} required autoFocus />
                </div>
                {f.kind === "main" && (
                  <div>
                    <label>Category (optional)</label>
                    <input list="svc-cats" value={f.category} maxLength={40} onChange={(e) => set("category", e.target.value)} placeholder="e.g. Grooming" />
                    <datalist id="svc-cats">{categories.map((c) => <option key={c} value={c} />)}</datalist>
                  </div>
                )}
              </div>

              <label>Price ({symbol})</label>
              <div className="pd-svc-mode">
                <button type="button" className={f.pricingMode === "flat" ? "small" : "small ghost"} onClick={() => set("pricingMode", "flat")}>One price</button>
                <button type="button" className={f.pricingMode === "by_size" ? "small" : "small ghost"} onClick={() => set("pricingMode", "by_size")}>By dog size</button>
              </div>
              {f.pricingMode === "flat" ? (
                <input type="number" min="0" step="0.01" value={f.price} onChange={(e) => set("price", e.target.value)} placeholder="65" required aria-label="Price" />
              ) : (
                <div className="pd-svc-sizes">
                  {SIZES.map(([, label]) => (
                    <div key={label}>
                      <label>{label}</label>
                      <input type="number" min="0" step="0.01" value={f[`price${label}`]} onChange={(e) => set(`price${label}`, e.target.value)} required aria-label={`${label} price`} />
                    </div>
                  ))}
                </div>
              )}
              <label className="pd-svc-check">
                <input type="checkbox" checked={f.isStartingPrice} onChange={(e) => set("isStartingPrice", e.target.checked)} />
                This is a starting price (extra for matting, thick coats, etc.)
              </label>

              <div className="row2">
                <div>
                  <label>Usual time, minutes (optional)</label>
                  <input type="number" min="5" max="600" step="5" value={f.durationMinutes} onChange={(e) => set("durationMinutes", e.target.value)} placeholder="90" />
                </div>
                <div>
                  <label>Short description (optional)</label>
                  <input value={f.description} maxLength={200} onChange={(e) => set("description", e.target.value)} placeholder="e.g. Bath, cut, nails and ears" />
                </div>
              </div>

              {error && <div className="error" style={{ marginTop: 10 }}>{error}</div>}
              <div className="pd-winback-foot" style={{ marginTop: 16 }}>
                <button type="button" className="ghost" onClick={() => setEditing(null)}>Cancel</button>
                <button type="submit" disabled={saving}>{saving ? "Saving…" : "Save service"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
