import { useEffect, useState } from "react";
import { IconPencil, IconCheck, IconX } from "./icons";

function formatMoney(n) {
  return `$${Math.round(n).toLocaleString()}`;
}

export default function RevenueBanner() {
  const [data, setData] = useState(null);
  const [editing, setEditing] = useState(false);
  const [priceInput, setPriceInput] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    const res = await fetch("/api/stats/revenue-recovered");
    if (res.ok) setData(await res.json());
  }

  useEffect(() => {
    load();
  }, []);

  function startEditing() {
    setPriceInput(String(data?.pricePerVisit ?? 55));
    setEditing(true);
  }

  async function savePrice(e) {
    e.preventDefault();
    const price = Number(priceInput);
    if (!Number.isFinite(price) || price <= 0) return;
    setSaving(true);
    await fetch("/api/settings/business", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ defaultServicePrice: price }),
    });
    setSaving(false);
    setEditing(false);
    load();
  }

  if (!data) return <div className="pd-revenue-banner pd-revenue-loading" />;

  const { thisMonth, pricePerVisit, isCustomPrice } = data;

  return (
    <div className="pd-revenue-banner">
      <div className="pd-revenue-main">
        <div className="pd-revenue-num">{formatMoney(thisMonth.revenue)}</div>
        <div className="pd-revenue-label">
          recovered this month &mdash; {thisMonth.count} rebooking{thisMonth.count === 1 ? "" : "s"} via your reminder links
        </div>
      </div>

      {editing ? (
        <form className="pd-revenue-edit" onSubmit={savePrice}>
          <span>$</span>
          <input
            type="number"
            min="1"
            step="1"
            autoFocus
            value={priceInput}
            onChange={(e) => setPriceInput(e.target.value)}
          />
          <span>/ visit</span>
          <button type="submit" className="pd-row-action" disabled={saving} title="Save">
            <IconCheck width={16} height={16} />
          </button>
          <button type="button" className="pd-row-action" onClick={() => setEditing(false)} title="Cancel">
            <IconX width={16} height={16} />
          </button>
        </form>
      ) : (
        <button className="pd-revenue-edit-btn" onClick={startEditing}>
          <IconPencil width={14} height={14} />
          {isCustomPrice
            ? `Based on $${pricePerVisit}/visit`
            : `Estimated at $${pricePerVisit}/visit \u2014 set your real price`}
        </button>
      )}
    </div>
  );
}
