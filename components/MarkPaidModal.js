// The groomer records that a client paid. PawDue does not take or move money:
// this only keeps a record and can email the client a receipt.
import { useEffect, useState } from "react";
import { PAYMENT_METHODS } from "../lib/payments";
import { moneyText } from "../lib/bookingDetails";
import { currencySymbol } from "../lib/services";

export default function MarkPaidModal({ booking, onClose, onSaved }) {
  const [accepted, setAccepted] = useState([]);
  const [method, setMethod] = useState("");
  const [amount, setAmount] = useState(booking.price !== null && booking.price !== undefined ? String(booking.price) : "");
  const email = booking.dogs?.owner_email || "";
  const [sendReceipt, setSendReceipt] = useState(!!email);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Methods the groomer accepts come first, and the first one is the default.
  useEffect(() => {
    let live = true;
    fetch("/api/payments/settings", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (!live) return;
        const types = (d.methods || []).map((m) => m.type);
        setAccepted(types);
        setMethod((cur) => cur || types[0] || "cash");
      })
      .catch(() => live && setMethod((cur) => cur || "cash"));
    return () => { live = false; };
  }, []);

  const ordered = [
    ...PAYMENT_METHODS.filter((m) => accepted.includes(m.key)),
    ...PAYMENT_METHODS.filter((m) => !accepted.includes(m.key)),
  ];
  const dog = booking.dogs?.dog_name || "this dog";
  const symbol = currencySymbol(booking.currency);

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/bookings/payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: booking.id, paid: true, amount, method, sendReceipt: sendReceipt && !!email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not save the payment");
      onSaved(data.booking, data.receipt);
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <div className="pd-modal-overlay" onMouseDown={onClose}>
      <div className="pd-modal" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Mark as paid">
        <div className="pd-modal-head">
          <h2>Mark {dog} as paid</h2>
          <button className="pd-modal-close" onClick={onClose} aria-label="Close">×</button>
        </div>
        <form onSubmit={submit}>
          {booking.price !== null && booking.price !== undefined && (
            <p className="sub" style={{ marginTop: 0 }}>Agreed price: <b translate="no">{moneyText(booking.price, booking.currency, booking.price_is_starting)}</b>. Change the amount if the final price was different.</p>
          )}
          <div className="row2">
            <div>
              <label>Amount paid ({symbol.trim()})</label>
              <input type="number" inputMode="decimal" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required autoFocus />
            </div>
            <div>
              <label>Paid by</label>
              <select value={method} onChange={(e) => setMethod(e.target.value)}>
                {ordered.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
              </select>
            </div>
          </div>
          <label className="pd-pay-check" style={{ marginTop: 12, opacity: email ? 1 : 0.6 }}>
            <input type="checkbox" checked={sendReceipt && !!email} disabled={!email} onChange={(e) => setSendReceipt(e.target.checked)} />
            <span>{email ? <>Email a receipt to <b translate="no">{email}</b></> : "No email on file, so no receipt can be sent"}</span>
          </label>
          <p className="sub" style={{ fontSize: ".8rem" }}>PawDue does not take payments. This only records that you were paid.</p>
          {error && <div className="error">{error}</div>}
          <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
            <button type="submit" disabled={saving || !method}>{saving ? "Saving…" : "Mark as paid"}</button>
            <button type="button" className="ghost" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}
