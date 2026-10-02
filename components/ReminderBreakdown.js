const CHANNEL_LABEL = { email: "Email", whatsapp: "WhatsApp", sms: "SMS" };
const CHANNEL_COLOR = { email: "var(--accent)", whatsapp: "#3c7a57", sms: "#4a7fb0" };

function Bar({ label, value, total, color }) {
  const pct = total === 0 ? 0 : Math.round((value / total) * 100);
  return (
    <div className="pd-breakdown-row">
      <div className="pd-breakdown-label">{label}</div>
      <div className="pd-breakdown-track">
        <div className="pd-breakdown-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <div className="pd-breakdown-value">{value}</div>
    </div>
  );
}

export default function ReminderBreakdown({ dogs }) {
  const attempted = dogs.filter((d) => d.last_reminder_result);
  const sent = attempted.filter((d) => d.last_reminder_result === "sent").length;
  const failed = attempted.filter((d) => d.last_reminder_result === "failed").length;
  const notYet = dogs.length - attempted.length;

  const channelCounts = { email: 0, whatsapp: 0, sms: 0 };
  attempted.filter((d) => d.last_reminder_result === "sent").forEach((d) => {
    if (channelCounts[d.last_reminder_channel] !== undefined) channelCounts[d.last_reminder_channel] += 1;
  });

  return (
    <div className="pd-chart-card">
      <div className="pd-chart-head">
        <h3>Reminder delivery</h3>
        <span className="pd-chart-sub">most recent attempt per dog</span>
      </div>

      <div className="pd-breakdown-group">
        <Bar label="Sent" value={sent} total={dogs.length} color="var(--ok)" />
        <Bar label="Failed" value={failed} total={dogs.length} color="var(--overdue)" />
        <Bar label="Not sent yet" value={notYet} total={dogs.length} color="var(--line)" />
      </div>

      {sent > 0 && (
        <>
          <div className="pd-breakdown-divider" />
          <div className="pd-breakdown-group">
            {Object.entries(channelCounts).filter(([, v]) => v > 0).map(([ch, v]) => (
              <Bar key={ch} label={CHANNEL_LABEL[ch]} value={v} total={sent} color={CHANNEL_COLOR[ch]} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
