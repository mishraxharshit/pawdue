// Settings > Services > "How clients pay you". PawDue does not take payments:
// the groomer lists how they accept them, clients see this when they book, and
// the groomer records the payment later so the client gets a receipt.
import { useEffect, useState } from "react";
import { PAYMENT_METHODS } from "../lib/payments";

export default function PaymentSettings({ onToast }) {
  const [data, setData] = useState(null); // { methods: [{type, detail}], note, available }
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let live = true;
    fetch("/api/payments/settings", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => live && setData(d))
      .catch(() => live && setData({ methods: [], note: "", available: false }));
    return () => { live = false; };
  }, []);

  if (!data) return null;

  const on = (type) => data.methods.find((m) => m.type === type);
  function toggle(type) {
    setData({ ...data, methods: on(type) ? data.methods.filter((m) => m.type !== type) : [...data.methods, { type, detail: "" }] });
  }
  function setDetail(type, detail) {
    setData({ ...data, methods: data.methods.map((m) => (m.type === type ? { ...m, detail } : m)) });
  }

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/payments/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ methods: data.methods, note: data.note }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || "Could not save");
      setData(d);
      onToast && onToast("Saved ✓");
    } catch (err) {
      setError(err.message);
    }
    setSaving(false);
  }

  return (
    <form className="card" onSubmit={save}>
      <h3 className="pd-set-title">How clients pay you</h3>
      <p className="sub" style={{ marginTop: 0 }}>
        PawDue never handles money. Clients pay you directly, any way you choose. Tick what you accept: clients see it when they book and in their confirmation email. After the groom you can mark the booking as paid and email them a receipt.
      </p>
      {data.available === false && (
        <p className="sub">One-time setup needed: run <code>supabase/add-payments.sql</code> in the Supabase SQL Editor to save these.</p>
      )}
      <div className="pd-pay-list">
        {PAYMENT_METHODS.map((m) => {
          const row = on(m.key);
          return (
            <div key={m.key} className="pd-pay-row">
              <label className="pd-pay-check">
                <input type="checkbox" checked={!!row} onChange={() => toggle(m.key)} />
                <span>{m.label}</span>
              </label>
              {row && m.detail && (
                <input value={row.detail} maxLength={80} placeholder={m.detail} aria-label={`${m.label} details`} onChange={(e) => setDetail(m.key, e.target.value)} />
              )}
            </div>
          );
        })}
      </div>
      <label style={{ marginTop: 14 }}>Payment note (optional)</label>
      <input value={data.note} maxLength={200} onChange={(e) => setData({ ...data, note: e.target.value })} placeholder="e.g. Pay after the groom. Tips are appreciated." />
      {error && <div className="error" style={{ marginTop: 10 }}>{error}</div>}
      <div style={{ marginTop: 14 }}>
        <button type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</button>
      </div>
    </form>
  );
}
