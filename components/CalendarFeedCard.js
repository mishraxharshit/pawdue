import { useEffect, useState } from "react";

// One-way calendar feed: bookings appear in Google / Apple / Outlook calendar.
export default function CalendarFeedCard() {
  const [url, setUrl] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    fetch("/api/settings/calendar")
      .then((r) => r.json())
      .then((d) => setUrl(d.url || null))
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  async function create(rotate) {
    if (rotate && !window.confirm("Make a new link? The old link will stop working in any calendar using it.")) return;
    setBusy(true);
    setErr("");
    try {
      const res = await fetch("/api/settings/calendar", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not create link");
      setUrl(data.url);
    } catch (e) {
      setErr(e.message);
    }
    setBusy(false);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  return (
    <div className="card pd-set-card">
      <h3 className="pd-set-title">Add bookings to your calendar</h3>
      <p className="sub pd-set-sub">
        Subscribe once and every confirmed booking shows up in Google Calendar, Apple Calendar or Outlook.
        It updates about once an hour. This is one way: bookings flow into your calendar, not the other way.
      </p>
      {!loaded ? null : url ? (
        <>
          <input readOnly value={url} onFocus={(e) => e.target.select()} style={{ fontSize: ".8rem" }} aria-label="Calendar feed link" />
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
            <button onClick={copy}>{copied ? "Copied" : "Copy link"}</button>
            <button className="ghost" onClick={() => create(true)} disabled={busy}>Make a new link</button>
          </div>
          <p className="sub" style={{ fontSize: ".78rem", marginBottom: 0 }}>
            Google Calendar: Other calendars (+) &gt; From URL &gt; paste the link. Anyone with this link can see your bookings, so keep it private.
          </p>
        </>
      ) : (
        <button onClick={() => create(false)} disabled={busy}>{busy ? "Creating..." : "Create calendar link"}</button>
      )}
      {err && <div className="error" style={{ marginTop: 10 }}>{err}</div>}
    </div>
  );
}
