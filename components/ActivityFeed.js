function timeAgo(iso) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

export default function ActivityFeed({ dogs, bookings }) {
  const reminderEvents = dogs
    .filter((d) => d.last_reminder_sent_at)
    .map((d) => ({
      type: "reminder",
      at: d.last_reminder_sent_at,
      text: `Reminder ${d.last_reminder_result === "failed" ? "failed to send" : "sent"} to ${d.dog_name}'s owner`,
      sub: d.last_reminder_result === "failed" ? "delivery failed" : `via ${d.last_reminder_channel || "email"}`,
      failed: d.last_reminder_result === "failed",
    }));

  const bookingEvents = bookings.map((b) => ({
    type: "booking",
    at: b.created_at,
    text: `New booking from ${b.dogs?.owner_name || "an owner"}`,
    sub: `for ${b.dogs?.dog_name || "their dog"}`,
    failed: false,
  }));

  const events = [...reminderEvents, ...bookingEvents]
    .sort((a, b) => new Date(b.at) - new Date(a.at))
    .slice(0, 8);

  return (
    <div className="pd-chart-card">
      <div className="pd-chart-head">
        <h3>Recent activity</h3>
        <span className="pd-chart-sub pd-live-dot">live</span>
      </div>
      {events.length === 0 ? (
        <div className="pd-tempty" style={{ padding: "20px 0" }}>Nothing yet — activity shows up here as reminders send and bookings come in.</div>
      ) : (
        <div className="pd-activity-list">
          {events.map((e, i) => (
            <div className="pd-activity-item" key={i}>
              <span className={`pd-activity-dot ${e.failed ? "failed" : e.type}`} />
              <div className="pd-activity-text">
                <div>{e.text}</div>
                <div className="pd-activity-sub">{e.sub}</div>
              </div>
              <div className="pd-activity-time">{timeAgo(e.at)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
