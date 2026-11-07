// The dashboard home ("Autopilot" layout). Everything here is built from data
// the dashboard already loads, no extra API calls:
//   HomeHeader     greeting, date, today's dog count, reminders status
//   HandledBand    what PawDue did for the groomer in the last 7 days
//   NeedsYou       the few things only the groomer can do
//   TodaySchedule  today's bookings in time order
//   ComingUp       dogs whose reminder goes out this week
//   GetStarted     setup checklist for new accounts

import { moneyText } from "../lib/bookingDetails";
import { useState } from "react";
import { dayKey, timeLabel, greetingFor } from "../lib/homeToday";

function plural(n, one, many) {
  return `${n} ${n === 1 ? one : many}`;
}

export function HomeHeader({ timezone, todayCount, hasDogs, paused, pauseAvailable, pauseBusy, onTogglePause }) {
  const now = new Date();
  let pill;
  if (!hasDogs) {
    pill = <span className="pd-status-pill"><span className="pd-status-dot" />Add dogs to start reminders</span>;
  } else if (paused) {
    pill = (
      <button className="pd-status-pill is-paused" onClick={onTogglePause} disabled={pauseBusy} title="Resume automatic reminders">
        <span className="pd-status-dot" />Reminders paused <b>Resume</b>
      </button>
    );
  } else {
    pill = (
      <button className="pd-status-pill is-on" onClick={onTogglePause} disabled={pauseBusy} title={pauseAvailable ? "Pause automatic reminders" : "One-time setup needed"}>
        <span className="pd-status-dot" />Reminders are on <b>Pause</b>
      </button>
    );
  }
  return (
    <div className="pd-home-head">
      <div>
        <h2 className="pd-home-title">{greetingFor(now, timezone)}</h2>
        <p className="sub" style={{ margin: "4px 0 0" }}>
          {todayCount === 0 ? "No dogs booked today" : `${plural(todayCount, "dog", "dogs")} booked today`}
        </p>
      </div>
      {pill}
    </div>
  );
}

export function PausedNotice({ onResume, busy }) {
  return (
    <div className="pd-paused-notice" role="status">
      <div>
        <b>Autopilot is paused.</b> PawDue is not sending any reminders for your dogs. Bookings and your calendar keep working.
      </div>
      <button className="small" onClick={onResume} disabled={busy}>Resume reminders</button>
    </div>
  );
}

export function HandledBand({ stats, children }) {
  const nothing = stats.reminded === 0 && stats.booked === 0 && stats.failed === 0;
  return (
    <div className="pd-handled">
      <div className="pd-handled-text">
        <div className="pd-handled-kicker">PawDue handled this week, so you did not have to</div>
        <div className="pd-handled-line">
          {nothing
            ? "Nothing yet. Reminders and bookings will show up here."
            : `${plural(stats.reminded, "dog", "dogs")} reminded, ${plural(stats.booked, "new booking", "new bookings")}`}
        </div>
      </div>
      <div className="pd-handled-tiles">
        <div className="pd-handled-tile"><b>{stats.reminded}</b><span>{stats.reminded === 1 ? "dog reminded" : "dogs reminded"}</span></div>
        <div className="pd-handled-tile"><b>{stats.booked}</b><span>{stats.booked === 1 ? "new booking" : "new bookings"}</span></div>
        {children}
      </div>
    </div>
  );
}

function DogLine({ dog, comp, children, note }) {
  return (
    <li>
      <span>
        <b>{dog.dog_name}</b> <span className="sub">{dog.owner_name}{note ? ` · ${note}` : ""}</span>
      </span>
      <span className="pd-need-actions">{children}</span>
    </li>
  );
}

/**
 * Every item opens inline with the same Review / Hide button, so the groomer
 * can act without leaving Home. Items show only when there is something to do.
 *
 * lapsedRows, overdueRows, failedRows, noEmailRows: [{ dog, comp }]
 * messageFor(dog, comp, view) -> { url } (url may be null)
 */
export function NeedsYou({
  lapsedRows, overdueRows, failedRows, noEmailRows,
  messageFor, busyId, onGroomed, onEditDog, onReviewAndSend, onViewClients,
}) {
  const [open, setOpen] = useState(null);
  const toggle = (k) => setOpen((v) => (v === k ? null : k));
  const LIMIT = 4;

  const msgBtn = (dog, comp, view) => {
    const url = messageFor(dog, comp, view).url;
    return url ? (
      <a className="pd-wa-btn" href={url} target="_blank" rel="noopener noreferrer">Message</a>
    ) : (
      <button className="small ghost" onClick={() => onEditDog(dog)}>Add phone</button>
    );
  };

  const sections = [];

  if (lapsedRows.length) {
    const emailable = lapsedRows.filter(({ dog }) => dog.owner_email && !dog.opted_out).length;
    sections.push({
      key: "lapsed",
      title: `${plural(lapsedRows.length, "client has", "clients have")} gone quiet`,
      sub: "More than 30 days overdue, so PawDue stops emailing them. A short message from you often brings them back.",
      body: (
        <>
          <div className="pd-need-bulk">
            <button className="small" onClick={onReviewAndSend} disabled={emailable === 0}>
              Review and send emails{emailable ? ` (${emailable})` : ""}
            </button>
            {emailable === 0 && <span className="sub">None of them have an email on file. Use Message below.</span>}
          </div>
          <ul className="pd-need-sub">
            {lapsedRows.slice(0, LIMIT).map(({ dog, comp }) => (
              <DogLine key={dog.id} dog={dog} note={`${Math.abs(comp.daysLeft)} days overdue`}>
                {msgBtn(dog, comp, "lapsed")}
              </DogLine>
            ))}
            {lapsedRows.length > LIMIT && (
              <li><button className="link-btn" onClick={() => onViewClients("lapsed")}>View all {lapsedRows.length}</button></li>
            )}
          </ul>
        </>
      ),
    });
  }

  if (overdueRows.length) {
    sections.push({
      key: "overdue",
      title: `${plural(overdueRows.length, "dog is", "dogs are")} overdue`,
      sub: "Reminders have gone out. Nudge anyone yourself, or tap Groomed once they have been in.",
      body: (
        <ul className="pd-need-sub">
          {overdueRows.slice(0, LIMIT).map(({ dog, comp }) => (
            <DogLine key={dog.id} dog={dog} note={`${Math.abs(comp.daysLeft)} days overdue`}>
              {msgBtn(dog, comp, "overdue")}
              <button className="small" onClick={() => onGroomed(dog)} disabled={busyId === dog.id}>Groomed</button>
            </DogLine>
          ))}
          {overdueRows.length > LIMIT && (
            <li><button className="link-btn" onClick={() => onViewClients("overdue")}>View all {overdueRows.length}</button></li>
          )}
        </ul>
      ),
    });
  }

  if (failedRows.length) {
    sections.push({
      key: "failed",
      title: `${plural(failedRows.length, "reminder", "reminders")} failed to send`,
      sub: "The email address may be wrong. Check it and PawDue will try again.",
      body: (
        <ul className="pd-need-sub">
          {failedRows.slice(0, LIMIT).map(({ dog }) => (
            <DogLine key={dog.id} dog={dog} note={dog.owner_email || "no email"}>
              <button className="small ghost" onClick={() => onEditDog(dog)}>Fix email</button>
            </DogLine>
          ))}
          {failedRows.length > LIMIT && (
            <li><button className="link-btn" onClick={() => onViewClients("failed")}>View all {failedRows.length}</button></li>
          )}
        </ul>
      ),
    });
  }

  if (noEmailRows.length) {
    sections.push({
      key: "noemail",
      title: `${plural(noEmailRows.length, "dog has", "dogs have")} no owner email`,
      sub: "PawDue cannot send them reminders until you add one.",
      body: (
        <ul className="pd-need-sub">
          {noEmailRows.slice(0, LIMIT).map(({ dog }) => (
            <DogLine key={dog.id} dog={dog}>
              <button className="small ghost" onClick={() => onEditDog(dog)}>Add email</button>
            </DogLine>
          ))}
          {noEmailRows.length > LIMIT && (
            <li><button className="link-btn" onClick={() => onViewClients("noemail")}>View all {noEmailRows.length}</button></li>
          )}
        </ul>
      ),
    });
  }

  return (
    <div className="card pd-needs">
      <div className="pd-today-head">
        <h3 className="pd-set-title">
          Needs you {sections.length > 0 && <span className="pd-need-count">{sections.length}</span>}
        </h3>
        <span className="sub">Everything else is on autopilot</span>
      </div>
      {sections.length === 0 ? (
        <p className="sub" style={{ margin: 0 }}>Nothing needs you right now. PawDue is on it.</p>
      ) : (
        sections.map((sec) => (
          <div className="pd-need-item" key={sec.key}>
            <div className="pd-need-main">
              <b>{sec.title}</b>
              <span className="sub">{sec.sub}</span>
            </div>
            <button className={open === sec.key ? "small ghost" : "small"} onClick={() => toggle(sec.key)} aria-expanded={open === sec.key}>
              {open === sec.key ? "Hide" : "Review"}
            </button>
            {open === sec.key && <div className="pd-need-body">{sec.body}</div>}
          </div>
        ))
      )}
    </div>
  );
}

/** bookings carry a joined dog; onGroomed(dog) marks them groomed today. */
export function TodaySchedule({ bookings, dogs, timezone, busyId, onGroomed, onOpenBookings }) {
  const today = dayKey(new Date(), timezone);
  const todays = (bookings || [])
    .filter((b) => dayKey(b.slot_at, timezone) === today)
    .sort((a, b) => new Date(a.slot_at) - new Date(b.slot_at));
  const next = (bookings || [])
    .filter((b) => new Date(b.slot_at) > new Date())
    .sort((a, b) => new Date(a.slot_at) - new Date(b.slot_at))[0];
  const dogById = new Map((dogs || []).map((d) => [d.id, d]));

  return (
    <div className="card pd-schedule">
      <div className="pd-today-head">
        <h3 className="pd-set-title">Today's schedule</h3>
        <button className="link-btn" onClick={onOpenBookings}>All bookings</button>
      </div>
      {todays.length === 0 ? (
        <p className="sub" style={{ margin: 0 }}>
          No bookings today.
          {next && ` Next: ${next.dogs?.dog_name || "a dog"}, ${new Date(next.slot_at).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: timezone })} at ${timeLabel(next.slot_at, timezone)}.`}
        </p>
      ) : (
        <ul className="pd-sched-list">
          {todays.map((b) => {
            const dog = dogById.get(b.dog_id);
            return (
              <li key={b.id}>
                <span className="pd-sched-time">{timeLabel(b.slot_at, timezone)}</span>
                <span className="pd-sched-card">
                  <span>
                    <b>{b.dogs?.dog_name || "Dog"}</b>
                    {b.dogs?.owner_name ? <span className="sub"> · {b.dogs.owner_name}</span> : null}
                    {b.service_name ? <span className="sub pd-sched-service">{b.service_name}{b.price ? ` · ${moneyText(b.price, b.currency, b.price_is_starting)}` : ""}</span> : null}
                  </span>
                  {dog && <button className="small ghost" onClick={() => onGroomed(dog)} disabled={busyId === dog.id}>Groomed</button>}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/** items from lib/homeToday comingUp() */
export function ComingUp({ items, onShowSoon }) {
  return (
    <div className="card pd-coming">
      <div className="pd-today-head">
        <h3 className="pd-set-title">Coming up this week</h3>
        {items.length > 0 && <button className="link-btn" onClick={onShowSoon}>See all</button>}
      </div>
      {items.length === 0 ? (
        <p className="sub" style={{ margin: 0 }}>No dogs due this week.</p>
      ) : (
        <>
          <p className="sub pd-set-sub" style={{ marginBottom: 8 }}>Reminders PawDue sends automatically</p>
          <ul className="pd-coming-list">
            {items.map((i) => (
              <li key={i.id}>
                <span><b>{i.dogName}</b> <span className="sub">{i.ownerName}</span></span>
                <span className="pd-coming-when">{i.hasEmail ? i.when : "No email"}</span>
              </li>
            ))}
          </ul>
        </>
      )}
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
