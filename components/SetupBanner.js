import { useEffect, useState } from "react";

export default function SetupBanner() {
  const [issues, setIssues] = useState([]);
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return [];
    try {
      return JSON.parse(sessionStorage.getItem("pd-dismissed-setup-issues") || "[]");
    } catch {
      return [];
    }
  });

  useEffect(() => {
    fetch("/api/settings/setup-status")
      .then((r) => r.json())
      .then((data) => setIssues(data.issues || []))
      .catch(() => {});
  }, []);

  function dismiss(key) {
    const next = [...dismissed, key];
    setDismissed(next);
    try {
      sessionStorage.setItem("pd-dismissed-setup-issues", JSON.stringify(next));
    } catch {
      // sessionStorage unavailable - dismissal just won't persist, not critical
    }
  }

  const visible = issues.filter((i) => !dismissed.includes(i.key));
  if (visible.length === 0) return null;

  return (
    <div className="pd-setup-banner">
      {visible.map((issue) => (
        <div className={`pd-setup-issue pd-setup-${issue.severity}`} key={issue.key}>
          <span>{issue.message}</span>
          <button onClick={() => dismiss(issue.key)} aria-label="Dismiss">&times;</button>
        </div>
      ))}
    </div>
  );
}
