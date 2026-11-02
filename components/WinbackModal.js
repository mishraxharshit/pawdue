// "Review and send": the groomer sees a drafted win-back email for each client
// who has gone quiet, can edit any of them, and sends the ticked ones with one
// tap. Nothing is sent until they press the button.
import { useState } from "react";
import { winbackTooSoon } from "../lib/winback";

export default function WinbackModal({ rows, draftFor, onClose, onSent }) {
  const items = rows.map(({ dog, comp }) => {
    let reason = "";
    if (!dog.owner_email) reason = "No email on file";
    else if (dog.opted_out) reason = "Asked to stop emails";
    else if (winbackTooSoon(dog.last_winback_at)) reason = "Emailed in the last 7 days";
    return { dog, comp, reason };
  });

  const [picked, setPicked] = useState(() => new Set(items.filter((i) => !i.reason).map((i) => i.dog.id)));
  const [drafts, setDrafts] = useState(() => Object.fromEntries(items.map((i) => [i.dog.id, draftFor(i.dog, i.comp)])));
  const [open, setOpen] = useState(null);
  const [status, setStatus] = useState({}); // dogId -> "sending" | "sent" | error text
  const [running, setRunning] = useState(false);

  const sendable = items.filter((i) => !i.reason);
  const chosen = sendable.filter((i) => picked.has(i.dog.id) && status[i.dog.id] !== "sent");
  const finished = sendable.length > 0 && sendable.every((i) => status[i.dog.id] === "sent");

  function toggle(id) {
    setPicked((p) => {
      const n = new Set(p);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  async function sendAll() {
    setRunning(true);
    for (const { dog } of chosen) {
      setStatus((s) => ({ ...s, [dog.id]: "sending" }));
      try {
        const res = await fetch("/api/dogs/winback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dogId: dog.id, message: drafts[dog.id] }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Could not send");
        setStatus((s) => ({ ...s, [dog.id]: "sent" }));
        onSent && onSent(dog);
      } catch (err) {
        setStatus((s) => ({ ...s, [dog.id]: err.message }));
      }
    }
    setRunning(false);
  }

  return (
    <div className="pd-modal-overlay" onMouseDown={onClose}>
      <div className="pd-modal pd-winback" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Review win-back emails">
        <h3 style={{ margin: "0 0 4px" }}>Review and send</h3>
        <p className="sub" style={{ margin: "0 0 14px" }}>
          A friendly email from you to each client below, with a link to book. Edit any message, untick anyone you do not want to email.
        </p>

        <ul className="pd-winback-list">
          {items.map(({ dog, comp, reason }) => {
            const st = status[dog.id];
            return (
              <li key={dog.id} className={reason ? "is-off" : ""}>
                <div className="pd-winback-row">
                  <input
                    type="checkbox"
                    aria-label={`Email ${dog.owner_name} about ${dog.dog_name}`}
                    checked={!reason && picked.has(dog.id) && st !== "sent"}
                    disabled={!!reason || st === "sent" || running}
                    onChange={() => toggle(dog.id)}
                  />
                  <div className="pd-winback-who">
                    <b>{dog.dog_name}</b> <span className="sub">{dog.owner_name} · {Math.abs(comp.daysLeft)} days overdue</span>
                    <div className="sub">{reason || dog.owner_email}</div>
                  </div>
                  {st === "sent" ? (
                    <span className="pd-winback-ok">Sent ✓</span>
                  ) : st === "sending" ? (
                    <span className="sub">Sending…</span>
                  ) : !reason ? (
                    <button className="link-btn" onClick={() => setOpen(open === dog.id ? null : dog.id)}>{open === dog.id ? "Done" : "Edit"}</button>
                  ) : null}
                </div>
                {st && st !== "sent" && st !== "sending" && <div className="error" style={{ margin: "6px 0 0" }}>{st}</div>}
                {open === dog.id && !reason && (
                  <textarea
                    className="pd-winback-text"
                    rows={5}
                    maxLength={1000}
                    value={drafts[dog.id]}
                    onChange={(e) => setDrafts((d) => ({ ...d, [dog.id]: e.target.value }))}
                    aria-label={`Message for ${dog.owner_name}`}
                  />
                )}
              </li>
            );
          })}
        </ul>

        <div className="pd-winback-foot">
          <button className="ghost" onClick={onClose}>{finished ? "Close" : "Cancel"}</button>
          {!finished && (
            <button onClick={sendAll} disabled={running || chosen.length === 0}>
              {running ? "Sending…" : chosen.length === 0 ? "Nothing to send" : `Send ${chosen.length} email${chosen.length === 1 ? "" : "s"}`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
