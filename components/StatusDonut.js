const SEGMENTS = [
  { key: "overdue", label: "Overdue", color: "var(--overdue)" },
  { key: "soon", label: "Due soon", color: "var(--warn)" },
  { key: "ok", label: "On track", color: "var(--ok)" },
];

export default function StatusDonut({ counts }) {
  const total = counts.overdue + counts.soon + counts.ok;
  const radius = 46;
  const circumference = 2 * Math.PI * radius;

  let offset = 0;
  const arcs = total === 0 ? [] : SEGMENTS.map((seg) => {
    const value = counts[seg.key];
    const length = (value / total) * circumference;
    const arc = { ...seg, value, length, offset };
    offset += length;
    return arc;
  });

  return (
    <div className="pd-chart-card">
      <div className="pd-chart-head">
        <h3>Dogs by status</h3>
        <span className="pd-chart-sub">{total} tracked</span>
      </div>
      <div className="pd-donut-wrap">
        <svg viewBox="0 0 120 120" className="pd-donut-svg">
          <circle cx="60" cy="60" r={radius} fill="none" stroke="var(--line)" strokeWidth="16" />
          {arcs.map((arc) => (
            <circle
              key={arc.key}
              cx="60" cy="60" r={radius} fill="none" stroke={arc.color} strokeWidth="16"
              strokeDasharray={`${arc.length} ${circumference - arc.length}`}
              strokeDashoffset={-arc.offset}
              transform="rotate(-90 60 60)"
            />
          ))}
          <text x="60" y="56" textAnchor="middle" className="pd-donut-total">{total}</text>
          <text x="60" y="72" textAnchor="middle" className="pd-donut-total-label">dogs</text>
        </svg>
        <div className="pd-donut-legend">
          {SEGMENTS.map((seg) => (
            <div className="pd-donut-legend-item" key={seg.key}>
              <span className="pd-donut-dot" style={{ background: seg.color }} />
              {seg.label} <b>{counts[seg.key]}</b>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
