// "Recovered this month": money from owners who rebooked through a reminder
// link. Sits inside the green "handled this week" band on the dashboard home.
import { useEffect, useState } from "react";
import { IconPencil } from "./icons";
import { currencySymbol } from "../lib/services";

function money(n, symbol = "$") {
  return `${symbol}${Math.round(n).toLocaleString()}`;
}

export default function RecoveredTile({ refreshKey = 0 }) {
  const [data, setData] = useState(null);
  const [editing, setEditing] = useState(false);
  const [price, setPrice] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      const res = await fetch("/api/stats/revenue-recovered", { cache: "no-store" });
      if (res.ok) setData(await res.json());
    } catch {}
  }
  useEffect(() => {
    load();
  }, [refreshKey]);

  async function save(e) {
    e.preventDefault();
    const n = Number(price);
    if (!Number.isFinite(n) || n <= 0) return;
    setSaving(true);
    await fetch("/api/settings/business", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ defaultServicePrice: n }),
    });
    setSaving(false);
    setEditing(false);
    load();
  }

  if (!data) return <div className="pd-handled-tile pd-recovered"><b>…</b><span>recovered</span></div>;
  const { thisMonth, pricePerVisit, isCustomPrice } = data;
  const symbol = currencySymbol(data.currency);

  return (
    <div className="pd-handled-tile pd-recovered">
      <b>{money(thisMonth.revenue, symbol)}</b>
      <span>
        recovered this month
        {thisMonth.count > 0 ? `, ${thisMonth.count} rebooking${thisMonth.count === 1 ? "" : "s"}` : ""}
      </span>
      {editing ? (
        <form className="pd-recovered-edit" onSubmit={save}>
          <span>{symbol}</span>
          <input type="number" min="1" step="1" autoFocus value={price} onChange={(e) => setPrice(e.target.value)} aria-label="Price per visit" />
          <button type="submit" disabled={saving}>Save</button>
          <button type="button" onClick={() => setEditing(false)}>Cancel</button>
        </form>
      ) : (
        <button className="pd-recovered-price" onClick={() => { setPrice(String(pricePerVisit ?? 55)); setEditing(true); }}>
          <IconPencil width={12} height={12} />
          {isCustomPrice ? `${symbol}${pricePerVisit} default per visit` : `Set your real price (now ${symbol}${pricePerVisit})`}
        </button>
      )}
    </div>
  );
}
