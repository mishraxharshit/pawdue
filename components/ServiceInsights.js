// Insights tab, top section: what the groomer's services actually earn.
// Everything here comes from the bookings clients made from the menu.
import { useEffect, useState } from "react";
import { moneyText } from "../lib/bookingDetails";

const RANGES = [["30", "30 days"], ["90", "90 days"], ["all", "All time"]];

function Kpi({ label, value, sub }) {
  return (
    <div className="pd-ins-kpi">
      <div className="pd-ins-kpi-value" translate="no">{value}</div>
      <div className="pd-ins-kpi-label">{label}</div>
      {sub && <div className="pd-ins-kpi-sub">{sub}</div>}
    </div>
  );
}

function Bars({ rows, valueText }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="pd-ins-bars">
      {rows.map((r) => (
        <div key={r.key} className="pd-ins-bar-row">
          <div className="pd-ins-bar-label" translate="no">{r.label}</div>
          <div className="pd-ins-bar-track"><div className="pd-ins-bar-fill" style={{ width: `${Math.max(3, (r.value / max) * 100)}%` }} /></div>
          <div className="pd-ins-bar-value" translate="no">{valueText(r)}</div>
        </div>
      ))}
    </div>
  );
}

export default function ServiceInsights({ refreshKey = 0, onOpenBookings, onOpenServices }) {
  const [range, setRange] = useState("30");
  const [d, setD] = useState(null);

  useEffect(() => {
    let live = true;
    fetch(`/api/stats/insights?range=${range}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((x) => live && setD(x))
      .catch(() => {});
    return () => { live = false; };
  }, [range, refreshKey]);

  if (!d || d.error) return <div className="pd-chart-card pd-chart-loading pd-ins-wide" />;

  const money = (n, starting = false) => moneyText(n, d.currency, starting);
  const rangeLabel = RANGES.find(([k]) => k === range)[1].toLowerCase();

  return (
    <div className="pd-chart-card pd-ins-wide">
      <div className="pd-chart-head">
        <h3>Your services, in numbers</h3>
        <div className="pd-ins-range" role="tablist" aria-label="Time range">
          {RANGES.map(([k, label]) => (
            <button key={k} role="tab" aria-selected={range === k} className={range === k ? "is-on" : ""} onClick={() => setRange(k)}>{label}</button>
          ))}
        </div>
      </div>

      {d.bookings === 0 ? (
        <p className="sub" style={{ margin: "10px 0 0" }}>No bookings received in this time yet. They show up here as clients book from your reminders.</p>
      ) : (
        <>
          <div className="pd-ins-kpis">
            <Kpi label={d.range === "all" ? "Bookings received" : `Bookings, last ${rangeLabel}`} value={d.bookings} />
            <Kpi label="Booked value" value={d.priced ? money(d.bookedValue, d.hasStarting) : "-"} sub={d.hasStarting ? "includes starting prices" : null} />
            <Kpi label="Average per visit" value={d.avgTicket === null ? "-" : money(d.avgTicket)} />
            <Kpi label="Marked as paid" value={money(d.collected.amount)} sub={d.paymentsReady === false ? "needs add-payments.sql" : `${d.collected.count} ${d.collected.count === 1 ? "booking" : "bookings"}`} />
          </div>

          {d.awaiting.count > 0 && (
            <button className="pd-ins-nudge" onClick={onOpenBookings}>
              <span translate="no"><b>{d.awaiting.count}</b> past {d.awaiting.count === 1 ? "appointment is" : "appointments are"} not marked paid{d.awaiting.amount > 0 ? ` (${money(d.awaiting.amount)})` : ""}.</span> <span className="link">Review</span>
            </button>
          )}

          {d.priced === 0 ? (
            <p className="sub" style={{ margin: "14px 0 0" }}>
              These bookings were made without a menu, so there are no prices to analyse yet.{" "}
              <button className="link" style={{ background: "none", border: "none", padding: 0, font: "inherit" }} onClick={onOpenServices}>Add your services and prices</button>
            </p>
          ) : (
            <div className="pd-ins-cols">
              <div>
                <h4 className="pd-ins-h">Earnings by service</h4>
                <Bars
                  rows={d.byService.map((s) => ({ key: s.name, label: s.name, value: s.revenue, ...s }))}
                  valueText={(r) => `${money(r.revenue)} · ${r.count}x`}
                />
                {d.addonRate !== null && (
                  <p className="pd-ins-note">
                    {d.addonRate}% of bookings include an add-on
                    {d.addons.length > 0 && <span translate="no"> (<b>{money(d.addons.reduce((t, a) => t + a.revenue, 0))}</b> extra, shown on top of the bars above). Most popular: <b>{d.addons[0].name}</b>, {d.addons[0].count}x</span>}.
                  </p>
                )}
              </div>
              <div>
                <h4 className="pd-ins-h">Busiest days{d.busiest ? `: ${d.busiest}` : ""}</h4>
                <Bars
                  rows={d.weekdays.filter((w) => w.count > 0).map((w) => ({ key: w.name, label: w.name.slice(0, 3), value: w.count, ...w }))}
                  valueText={(r) => String(r.count)}
                />
                {(d.sizes.small + d.sizes.medium + d.sizes.large) > 0 && (
                  <p className="pd-ins-note" translate="no">
                    Dog sizes: {["small", "medium", "large"].filter((k) => d.sizes[k] > 0).map((k) => `${d.sizes[k]} ${k}`).join(", ")}
                  </p>
                )}
              </div>
            </div>
          )}

          {(d.unpriced > 0 || d.otherCurrency > 0) && (
            <p className="pd-ins-note">
              {d.unpriced > 0 && <>{d.unpriced} {d.unpriced === 1 ? "booking was" : "bookings were"} made without a service, so {d.unpriced === 1 ? "it has" : "they have"} no price here. </>}
              {d.otherCurrency > 0 && <>{d.otherCurrency} {d.otherCurrency === 1 ? "booking is" : "bookings are"} in another currency and not added up.</>}
            </p>
          )}
        </>
      )}
    </div>
  );
}
