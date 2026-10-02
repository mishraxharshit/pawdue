import { useEffect, useState } from "react";
import Link from "next/link";
import { BREED_INTERVALS } from "../lib/breedIntervals";
import { IconX } from "./icons";
import PhoneInput from "./PhoneInput";

export default function DogModal({ mode, initialValues, knownOwners, saving, error, limitReached, onSubmit, onClose }) {
  const [form, setForm] = useState(initialValues);

  useEffect(() => setForm(initialValues), [initialValues]);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function handleOwnerNameChange(value) {
    set("ownerName", value);
    const match = knownOwners.find((o) => o.owner_name.toLowerCase() === value.toLowerCase());
    if (match && !form.phone) {
      setForm((f) => ({ ...f, ownerName: value, phone: match.phone }));
    }
  }

  return (
    <div className="pd-modal-overlay" onMouseDown={onClose}>
      <div className="pd-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="pd-modal-head">
          <h2>{mode === "edit" ? "Edit dog" : "Add a dog"}</h2>
          <button className="pd-modal-close" onClick={onClose} aria-label="Close">
            <IconX />
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit(form);
          }}
        >
          <div className="row2">
            <div>
              <label>Dog&apos;s name</label>
              <input value={form.dogName} onChange={(e) => set("dogName", e.target.value)} required />
            </div>
            <div>
              <label>Owner&apos;s name</label>
              <input list="owner-suggestions" value={form.ownerName} onChange={(e) => handleOwnerNameChange(e.target.value)} required />
              <datalist id="owner-suggestions">
                {knownOwners.map((o) => (
                  <option key={o.owner_name} value={o.owner_name} />
                ))}
              </datalist>
            </div>
          </div>
          <div className="row2">
            <div>
              <label>Owner phone</label>
              <PhoneInput value={form.phone} onChange={(v) => set("phone", v)} required />
            </div>
            <div>
              <label>Owner email (used for reminders)</label>
              <input type="email" placeholder="owner@example.com" value={form.ownerEmail} onChange={(e) => set("ownerEmail", e.target.value)} required />
            </div>
          </div>
          <div className="row2">
            <div>
              <label>Breed</label>
              <select value={form.breed} onChange={(e) => set("breed", e.target.value)}>
                {Object.keys(BREED_INTERVALS).map((b) => (
                  <option key={b} value={b}>{b} (~{BREED_INTERVALS[b]}wk)</option>
                ))}
              </select>
            </div>
            <div>
              <label>Last groom date</label>
              <input type="date" value={form.lastGroomDate} onChange={(e) => set("lastGroomDate", e.target.value)} required />
            </div>
          </div>
          <div className="row2">
            <div>
              <label>Custom interval, weeks (optional)</label>
              <input type="number" min="1" value={form.customWeeks} onChange={(e) => set("customWeeks", e.target.value)} />
            </div>
            <div>
              <label>Notes (optional)</label>
              <input placeholder="e.g. matted behind ears, nervous with clippers" value={form.notes} onChange={(e) => set("notes", e.target.value)} />
            </div>
          </div>
          <p className="pd-form-hint">
            Reminders send by email today. WhatsApp and SMS kick in automatically as backup
            channels the moment they&apos;re connected &mdash; the phone number above is ready for that.
          </p>

          {error && (
            <div className="error">
              {error}
              {limitReached && (
                <>
                  {" "}
                  <Link className="link" href="/pricing">Upgrade your plan</Link>
                </>
              )}
            </div>
          )}

          <div className="pd-modal-actions">
            <button type="button" className="ghost" onClick={onClose}>Cancel</button>
            <button type="submit" disabled={saving}>
              {saving ? "Saving…" : mode === "edit" ? "Save changes" : "Add dog"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
