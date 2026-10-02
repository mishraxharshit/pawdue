import { useLanguage } from "../lib/i18n/LanguageContext";

export default function ClientStatusCard({ status, dogName, breed }) {
  const { translate, locale } = useLanguage();
  const copy = {
    overdue: { label: translate("status.overdueLabel"), note: translate("status.overdueNote") },
    soon: { label: translate("status.soonLabel"), note: translate("status.soonNote") },
    ok: { label: translate("status.okLabel"), note: translate("status.okNote") },
  }[status.state] || { label: translate("status.okLabel"), note: translate("status.okNote") };

  const dueStr = new Date(status.dueDate).toLocaleDateString(locale, { month: "short", day: "numeric" });
  const lastStr = new Date(status.lastGroomDate).toLocaleDateString(locale, { month: "short", day: "numeric" });

  return (
    <div className="client-status">
      <div className="client-status-head">
        <div>
          <div className="client-status-dog">{dogName}</div>
          <div className="client-status-breed">{breed}</div>
        </div>
        <span className={`badge ${status.state}`}>{copy.label}</span>
      </div>

      <div className="client-status-bar-track">
        <div className={`client-status-bar-fill client-status-${status.state}`} style={{ width: `${status.progressPct}%` }} />
      </div>

      <div className="client-status-dates">
        <div>
          <div className="client-status-label">{translate("status.lastGroomed")}</div>
          <div className="client-status-value">{lastStr}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div className="client-status-label">{translate("status.nextDue")}</div>
          <div className="client-status-value">{dueStr}</div>
        </div>
      </div>

      <p className="client-status-note">{copy.note}</p>
    </div>
  );
}
