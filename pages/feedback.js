import { useState } from "react";
import MarketingNav from "../components/MarketingNav";
import SiteFooter from "../components/SiteFooter";

export default function Feedback() {
  const [form, setForm] = useState({ name: "", email: "", category: "General", message: "" });
  const [status, setStatus] = useState("idle"); // idle | sending | sent | error
  const [error, setError] = useState("");

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus("sending");
    setError("");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");
      setStatus("sent");
    } catch (err) {
      setError(err.message);
      setStatus("error");
    }
  }

  return (
    <div className="pd-landing">
      <div className="pd-shell">
        <MarketingNav />

        <div className="pd-band" style={{ paddingBottom: 10 }}>
          <div className="pd-section-head pd-center">
            <div className="pd-eyebrow">Feedback</div>
            <h1 className="pd-display">Tell us what's working (or not)</h1>
            <p>Bug reports, feature requests, or just a thought — it goes straight to the team.</p>
          </div>

          {status === "sent" ? (
            <div className="pd-feedback-success">
              <div className="pd-icon-badge teal" style={{ width: 56, height: 56, fontSize: "1.6rem" }}>🐾</div>
              <h2 className="pd-display">Thanks — got it.</h2>
              <p style={{ color: "var(--pd-ink-soft)" }}>We read every message. If you left an email, we'll follow up there.</p>
            </div>
          ) : (
            <form className="pd-feedback-form" onSubmit={handleSubmit}>
              {error && <div className="error">{error}</div>}
              <div>
                <label htmlFor="fb-name">Name (optional)</label>
                <input id="fb-name" value={form.name} onChange={(e) => update("name", e.target.value)} />
              </div>
              <div>
                <label htmlFor="fb-email">Email (optional, so we can reply)</label>
                <input id="fb-email" type="email" value={form.email} onChange={(e) => update("email", e.target.value)} />
              </div>
              <div>
                <label htmlFor="fb-category">Category</label>
                <select id="fb-category" value={form.category} onChange={(e) => update("category", e.target.value)}>
                  <option>General</option>
                  <option>Bug report</option>
                  <option>Feature request</option>
                  <option>Billing question</option>
                </select>
              </div>
              <div>
                <label htmlFor="fb-message">Message</label>
                <textarea id="fb-message" rows={5} required value={form.message} onChange={(e) => update("message", e.target.value)} />
              </div>
              <button className="pd-btn pd-btn-primary" type="submit" disabled={status === "sending"}>
                {status === "sending" ? "Sending…" : "Send feedback"}
              </button>
            </form>
          )}
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
