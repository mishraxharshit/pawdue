// The top of the dashboard home. Three things, all built from data the
// dashboard already has (no new API calls):
//   TodayCard    what needs the groomer's attention right now
//   LapsedCard   clients who went quiet, with a one-tap message
//   GetStarted   a short setup checklist for new accounts

import { useState } from "react";
import { dayKey, timeLabel } from "../lib/homeToday";

function plural(n, one, many) {
  return `${n} ${n === 1 ? one : many}`;
}

export function TodayCard({ counts, bookings, timezone, onShowOverdue, onShowSoon, onShowLapsed, onShowBookings }) {
  const today = dayKey(new Date(), timezone);
  const todays = (bookings || [])
    .filter((b) => dayKey(b.slot_at, timezone) === today)
    .sort((a, b) => new Date(a.slot_at) - new Date(b.slot_at));
  const next = (bookings || [])
    .filter((b) => new Date(b.slot_at) > new Date())
    .sort((a, b) => new Date(a.slot_at) - new Date(b.slot_at))[0];

  const quiet = todays.length === 0 && counts.overdue === 0 && counts.soon === 0 && counts.lapsed === 0;

  return (
    <div className="card pd-today">
      <div className="pd-today-head">
        <h3 className="pd-set-title">Today</h3>
        {next && (
          <span className="pd-today-next">
            Next booking: <b>{next.dogs?.dog_name || "A dog"}</b>, {dayKey(next.slot_at, timezone) === today ? "today" : new Date(next.slot_at).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: timezone })} at {timeLabel(next.slot_at, timezone)}
          </span>
        )}
      </div>

      {quiet ? (
        <p className="sub" style={{ margin: 0 }}>You are all caught up. Nothing needs your attention today. 🎉</p>
      ) : (
        <div className="pd-today-grid">
          <button className="pd-today-tile" onClick={onShowBookings}>
            <span className="pd-today-num">{todays.length}</span>
            <span className="pd-today-label">{todays.length === 1 ? "booking today" : "bookings today"}</span>
          </button>
          <button className={`pd-today-tile ${counts.overdue ? "is-hot" : ""}`} onClick={onShowOverdue}>
            <span className="pd-today-num">{counts.overdue}</span>
            <span className="pd-today-label">overdue</span>
          </button>
          <button className="pd-today-tile" onClick={onShowSoon}>
            <span className="pd-today-num">{counts.soon}</span>
            <span className="pd-today-label">due this week</span>
          </button>
          <button className={`pd-today-tile ${counts.lapsed ? "is-quiet" : ""}`} onClick={onShowLapsed}>
            <span className="pd-today-num">{counts.lapsed}</span>
            <span className="pd-today-label">gone quiet</span>
          </button>
        </div>
      )}

      {todays.length > 0 && (
        <ul className="pd-today-list">
          {todays.slice(0, 4).map((b) => (
            <li key={b.id}>
              <b>{timeLabel(b.slot_at, timezone)}</b> {b.dogs?.dog_name || "Dog"}
              {b.dogs?.owner_name ? <span className="sub"> with {b.dogs.owner_name}</span> : null}
            </li>
          ))}
          {todays.length > 4 && <li className="sub">and {todays.length - 4} more</li>}
        </ul>
      )}
    </div>
  );
}

/** rows: [{ dog, comp }] already filtered to lapsed, most recent first. */
export function LapsedCard({ rows, messageFor, onViewAll }) {
  if (!rows.length) return null;
  const shown = rows.slice(0, 3);
  return (
    <div className="card pd-lapsed-card">
      <div className="pd-today-head">
        <h3 className="pd-set-title">{plural(rows.length, "client has", "clients have")} gone quiet</h3>
        {rows.length > shown.length && (
          <button className="link-btn" onClick={onViewAll}>View all {rows.length}</button>
        )}
      </div>
      <p className="sub pd-set-sub">
        These dogs are more than 30 days overdue, so PawDue does not email them by itself. A short message from you often brings them back.
      </p>
      <ul className="pd-lapsed-list">
        {shown.map(({ dog, comp }) => {
          const msg = messageFor(dog, comp);
          return (
            <li key={dog.id}>
              <div>
                <b>{dog.dog_name}</b>
                <span className="sub"> {dog.owner_name} · {Math.abs(comp.daysLeft)} days overdue</span>
              </div>
              <a className="pd-wa-btn" href={msg.url} target="_blank" rel="noopener noreferrer">Message</a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * steps: [{ key, title, hint, done, actionLabel, onAction }]
 * Hides itself once every step is done, or when dismissed on this device.
 */
export function GetStarted({ steps }) {
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return localStorage.getItem("pd-getstarted-dismissed") === "1";
    } catch {
      return false;
    }
  });
  const doneCount = steps.filter((s) => s.done).length;
  if (dismissed || doneCount === steps.length) return null;

  function dismiss() {
    setDismissed(true);
    try {
      localStorage.setItem("pd-getstarted-dismissed", "1");
    } catch {}
  }

  return (
    <div className="card pd-getstarted">
      <div className="pd-today-head">
        <h3 className="pd-set-title">Get set up ({doneCount} of {steps.length})</h3>
        <button className="link-btn" onClick={dismiss}>Hide</button>
      </div>
      <div className="pd-progress" aria-hidden="true"><div style={{ width: `${(doneCount / steps.length) * 100}%` }} /></div>
      <ul className="pd-steps">
        {steps.map((s) => (
          <li key={s.key} className={s.done ? "is-done" : ""}>
            <span className="pd-step-dot">{s.done ? "✓" : ""}</span>
            <div className="pd-step-text">
              <b>{s.title}</b>
              {s.hint && <span className="sub">{s.hint}</span>}
            </div>
            {!s.done && s.onAction && <button className="small ghost" onClick={s.onAction}>{s.actionLabel}</button>}
          </li>
        ))}
      </ul>
    </div>
  );
}
