import { useEffect, useState } from "react";

// Salon name, phone and reply-to address. These appear in every reminder email,
// and replies from dog owners go to the reply-to address.
export default function BusinessProfileCard({ profile, onSaved }) {
  const [form, setForm] = useState(profile);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => setForm(profile), [profile.businessName, profile.businessPhone, profile.replyToEmail]);

  async function save() {
    setSaving(true);
    setErr("");
    setMsg("");
    try {
      const res = await fetch("/api/settings/business", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not save");
      onSaved({ businessName: data.businessName, businessPhone: data.businessPhone, replyToEmail: data.replyToEmail });
      setMsg("Saved");
      setTimeout(() => setMsg(""), 2500);
    } catch (e) {
      setErr(e.message);
    }
    setSaving(false);
  }

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="card pd-set-card">
      <h3 className="pd-set-title">Your salon details</h3>
      <p className="sub pd-set-sub">
        Shown in every reminder email, so owners see your salon, not a software tool. Replies go to your reply-to address.
      </p>
      <label>Salon name
        <input value={form.businessName} onChange={set("businessName")} placeholder="Happy Paws Grooming" maxLength={80} />
      </label>
      <label>Phone (optional)
        <input value={form.businessPhone} onChange={set("businessPhone")} placeholder="+1 555 010 2030" maxLength={30} />
      </label>
      <label>Reply-to email
        <input type="email" value={form.replyToEmail} onChange={set("replyToEmail")} placeholder="you@yoursalon.com" />
      </label>
      {err && <div className="error">{err}</div>}
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 16 }}>
        <button onClick={save} disabled={saving}>{saving ? "Saving..." : "Save details"}</button>
        {msg && <span className="pd-form-hint" style={{ margin: 0 }}>{msg}</span>}
      </div>
    </div>
  );
}
