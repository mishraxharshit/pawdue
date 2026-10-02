import { useEffect, useState } from "react";

function formatMoney(n) {
  return `$${Math.round(n).toLocaleString()}`;
}

export default function RevenueChart() {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch("/api/stats/revenue-timeseries")
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
  }, []);

  if (!data) return <div className="pd-chart-card pd-chart-loading" />;

  const max = Math.max(1, ...data.weeks.map((w) => w.revenue));
  const chartHeight = 140;
  const barWidth = 28;
  const gap = 14;
  const width = data.weeks.length * (barWidth + gap);

  return (
    <div className="pd-chart-card">
      <div className="pd-chart-head">
        <h3>Revenue recovered, last 8 weeks</h3>
        <span className="pd-chart-sub">based on ${data.pricePerVisit}/visit</span>
      </div>
      <svg viewBox={`0 0 ${width} ${chartHeight + 30}`} className="pd-chart-svg" preserveAspectRatio="xMidYMid meet">
        {data.weeks.map((w, i) => {
          const barHeight = Math.max(2, (w.revenue / max) * chartHeight);
          const x = i * (barWidth + gap);
          const y = chartHeight - barHeight;
          const label = new Date(w.weekStart).toLocaleDateString("en-US", { month: "short", day: "numeric" });
          const isLast = i === data.weeks.length - 1;
          return (
            <g key={w.weekStart}>
              <rect
                x={x} y={y} width={barWidth} height={barHeight} rx="5"
                fill={isLast ? "var(--accent)" : "var(--line)"}
              />
              {w.revenue > 0 && (
                <text x={x + barWidth / 2} y={y - 6} textAnchor="middle" className="pd-chart-value">
                  {formatMoney(w.revenue)}
                </text>
              )}
              <text x={x + barWidth / 2} y={chartHeight + 20} textAnchor="middle" className="pd-chart-axis-label">
                {label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
