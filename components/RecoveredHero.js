// Home hero: what PawDue brought back this month, by service. Every number is
// built from real bookings (see lib/recovered.js); nothing is estimated.
import { useEffect, useRef, useState } from "react";
import { currencySymbol } from "../lib/services";

const MAX_ROWS = 5;

function useCountUp(target, ms = 1100) {
  const [value, setValue] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    const reduce = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || from.current === target) {
      from.current = target;
      setValue(target);
      return undefined;
    }
    const start = from.current;
    let raf;
    let t0;
    const step = (t) => {
      if (t0 === undefined) t0 = t;
      const p = Math.min(1, (t - t0) / ms);
      const eased = 1 - Math.pow(1 - p, 3);
      const v = start + (target - start) * eased;
      from.current = v;
      setValue(v);
      if (p < 1) raf = requestAnimationFrame(step);
      else from.current = target;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return value;
}

function motivator(d) {
  const top = d.byService[0];
  if (d.month.count === 0) {
    return d.allTime.count > 0
      ? "Quiet month so far. Your reminders keep going out, and each rebooking lands here."
      : "";
  }
  if (top && d.month.priced > 1 && top.share >= 40) {
    return `${top.name} is your money maker: ${top.share}% of what PawDue brought back this month.`;
  }
  if (d.deltaPct !== null && d.deltaPct > 0) return `Up ${d.deltaPct}% on last month. Keep the reminders on.`;
  if (d.month.count > 0) return `${d.month.count === 1 ? "1 owner" : `${d.month.count} owners`} booked through your PawDue reminder links this month, with no chasing from you.`;
  return "";
}

export default function RecoveredHero({ stats, refreshKey = 0, onOpenServices, onAddDogs }) {
  const [d, setD] = useState(null);
  const [grown, setGrown] = useState(false);

  useEffect(() => {
    let live = true;
    fetch("/api/stats/revenue-recovered", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((x) => live && x && setD(x))
      .catch(() => {});
    return () => { live = false; };
  }, [refreshKey]);

  // Bars and rows grow in once, after the first data arrives.
  useEffect(() => {
    if (!d || grown) return undefined;
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setGrown(true)));
    return () => cancelAnimationFrame(id);
  }, [d, grown]);

  const total = useCountUp(d ? d.month.revenue : 0);
  const count = useCountUp(d ? d.month.count : 0, 800);

  if (!d) return <div className="pd-rec pd-rec-loading" aria-busy="true" />;

  const symbol = currencySymbol(d.currency);
  const money = (n) => `${symbol}${Math.round(n).toLocaleString()}`;
  const hasMoney = d.month.priced > 0;
  const brandNew = d.allTime.count === 0;

  // Biggest earners first; the long tail is grouped so the card stays tidy.
  const rows = d.byService.slice(0, MAX_ROWS).map((s) => ({ key: s.name, label: s.name, revenue: s.revenue, count: s.count }));
  const rest = d.byService.slice(MAX_ROWS);
  if (rest.length) rows.push({ key: "__rest", label: "Other services", revenue: rest.reduce((t, s) => t + s.revenue, 0), count: rest.reduce((t, s) => t + s.count, 0) });
  if (d.addons.count > 0) rows.push({ key: "__addons", label: "Add-ons", revenue: d.addons.revenue, count: d.addons.count, addon: true });
  const max = Math.max(1, ...rows.map((r) => r.revenue));
  const weekMax = Math.max(1, ...d.weeks.map((w) => (hasMoney || d.allTime.revenue > 0 ? w.revenue : w.count)));
  const weekUsesMoney = hasMoney || d.allTime.revenue > 0;
  const note = motivator(d);

  return (
    <section className={`pd-rec${grown ? " is-grown" : ""}`} aria-label="What PawDue brought back">
      <div className="pd-rec-top">
        <div className="pd-rec-main">
          <div className="pd-rec-kicker"><span className="pd-rec-live" aria-hidden="true" />{brandNew ? "PawDue is ready to bring dogs back" : "PawDue brought back this month"}</div>
          {brandNew ? (
            <div className="pd-rec-empty">
              <div className="pd-rec-empty-title">Your first rebooking lands here</div>
              <p>Add your dogs, PawDue reminds their owners, and each owner picks a service and books. You will see exactly which service brought in how much.</p>
              {onAddDogs && <button className="pd-rec-cta" onClick={onAddDogs}>Add your dogs</button>}
            </div>
          ) : (
            <>
              <div className="pd-rec-total" translate="no">{hasMoney || d.month.count === 0 ? money(total) : Math.round(count)}</div>
              <div className="pd-rec-sub">
                {d.month.count === 0
                  ? "no rebookings yet this month"
                  : hasMoney
                    ? <>from <b translate="no">{d.month.count}</b> {d.month.count === 1 ? "dog" : "dogs"} that rebooked</>
                    : <>{d.month.count === 1 ? "dog" : "dogs"} rebooked through PawDue</>}
                {d.deltaPct !== null && d.month.count > 0 && hasMoney && (
                  <span className={`pd-rec-delta ${d.deltaPct >= 0 ? "is-up" : "is-down"}`} translate="no">{d.deltaPct >= 0 ? "▲" : "▼"} {Math.abs(d.deltaPct)}% vs last month</span>
                )}
              </div>
            </>
          )}
        </div>

        {!brandNew && (
          <div className="pd-rec-weeks" aria-label="Last 8 weeks">
            <div className="pd-rec-weeks-bars" translate="no">
              {d.weeks.map((w, i) => {
                const v = weekUsesMoney ? w.revenue : w.count;
                return (
                  <div key={i} className="pd-rec-week" title={weekUsesMoney ? money(w.revenue) : `${w.count} bookings`}>
                    <i style={{ "--h": `${v > 0 ? Math.max(8, (v / weekMax) * 100) : 4}%`, "--d": `${i * 70}ms` }} className={i === 7 ? "is-now" : ""} />
                  </div>
                );
              })}
            </div>
            <div className="pd-rec-weeks-cap">Last 8 weeks</div>
          </div>
        )}
      </div>

      {!brandNew && (
        <div className="pd-rec-body">
          <div className="pd-rec-break">
            <div className="pd-rec-h">Where it came from</div>
            {hasMoney ? (
              <div className="pd-rec-rows">
                {rows.map((r, i) => (
                  <div key={r.key} className="pd-rec-row" style={{ "--d": `${200 + i * 110}ms` }}>
                    <div className="pd-rec-name" translate="no">{r.label}</div>
                    <div className="pd-rec-track"><div className={`pd-rec-fill${r.addon ? " is-addon" : ""}`} style={{ "--w": `${Math.max(4, (r.revenue / max) * 100)}%` }} /></div>
                    <div className="pd-rec-val" translate="no"><b>{money(r.revenue)}</b> <span>{r.count}x</span></div>
                  </div>
                ))}
                {d.month.unpriced > 0 && (
                  <p className="pd-rec-fine">{d.month.unpriced} {d.month.unpriced === 1 ? "booking" : "bookings"} had no service picked, so no money is counted for {d.month.unpriced === 1 ? "it" : "them"}.</p>
                )}
              </div>
            ) : d.month.count > 0 ? (
              <div className="pd-rec-nudge">
                <p>These bookings have no service, so there is no price to add up yet. Add your services and prices, and every new booking will show what it brought in.</p>
                {onOpenServices && <button className="pd-rec-cta" onClick={onOpenServices}>Add services and prices</button>}
              </div>
            ) : (
              <p className="pd-rec-fine" style={{ margin: 0 }}>When an owner books, the service and the money show up here.</p>
            )}
          </div>

          <div className="pd-rec-chips">
            <div className="pd-rec-chip">
              <b translate="no">{d.allTime.revenue > 0 ? money(d.allTime.revenue) : d.allTime.count}</b>
              <span>{d.allTime.revenue > 0 ? `brought back in total, ${d.allTime.count} ${d.allTime.count === 1 ? "booking" : "bookings"}` : `${d.allTime.count === 1 ? "booking" : "bookings"} in total`}</span>
            </div>
            <div className="pd-rec-chip">
              <b translate="no">{d.upcoming.revenue > 0 ? money(d.upcoming.revenue) : d.upcoming.count}</b>
              <span>{d.upcoming.revenue > 0 ? `already booked, next 7 days (${d.upcoming.count} ${d.upcoming.count === 1 ? "dog" : "dogs"})` : `${d.upcoming.count === 1 ? "dog" : "dogs"} booked in the next 7 days`}</span>
            </div>
            <div className="pd-rec-chip">
              <b translate="no">{stats.booked}</b>
              <span>{stats.booked === 1 ? "new booking" : "new bookings"} this week, {stats.reminded} {stats.reminded === 1 ? "dog" : "dogs"} reminded</span>
            </div>
          </div>
        </div>
      )}

      {note && <div className="pd-rec-note">{note}</div>}
    </section>
  );
}
