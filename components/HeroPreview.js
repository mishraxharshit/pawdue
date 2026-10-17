import { useEffect, useState } from "react";
import { IconPaw, IconBell, IconCheck } from "./icons";

// An animated, non-functional mirror of the real dashboard due-list. It loops
// through the product's whole job in about 9 seconds: a dog comes due, the
// owner is emailed, the owner books. Visitors see what PawDue does without
// reading anything. Users who prefer reduced motion get the final, static
// frame instead of a loop.
const STAGES = [
  { badge: "soon", label: "Due soon", due: "in 2 days", note: "PawDue spotted Nova is almost due", tone: "info" },
  { badge: "soon", label: "Due soon", due: "in 2 days", note: "Sending reminder email to Nova's owner...", tone: "info" },
  { badge: "soon", label: "Due soon", due: "in 2 days", note: "Reminder sent to Nova's owner via email", tone: "ok" },
  { badge: "ok", label: "Booked", due: "Sat 10:30", note: "Nova's owner booked from the link", tone: "ok" },
];

const OTHER_ROWS = [
  { name: "Biscuit", breed: "Cockapoo", status: "overdue", label: "Overdue", due: "3 days ago" },
  { name: "Tank", breed: "Bernedoodle", status: "ok", label: "On track", due: "in 3 weeks" },
];

export default function HeroPreview() {
  const [stage, setStage] = useState(STAGES.length - 1);

  useEffect(() => {
    const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return undefined;
    setStage(0);
    const id = setInterval(() => setStage((s) => (s + 1) % STAGES.length), 2300);
    return () => clearInterval(id);
  }, []);

  const s = STAGES[stage];

  return (
    <div className="pd-preview" role="img" aria-label="Animated preview of the PawDue dashboard: a dog comes due, the owner is emailed, and the owner books a time">
      <div className="pd-preview-bar">
        <span className="pd-preview-dot" />
        <span className="pd-preview-dot" />
        <span className="pd-preview-dot" />
        <span className="pd-preview-bar-title">Today&apos;s due list</span>
        <span className="pd-preview-bell"><IconBell width={14} height={14} /></span>
      </div>
      <div className="pd-preview-body">
        <div className={`pd-preview-row ${OTHER_ROWS[0].status === "overdue" ? "" : ""}`}>
          <span className="pd-preview-avatar"><IconPaw width={14} height={14} /></span>
          <span className="pd-preview-info">
            <span className="pd-preview-name">{OTHER_ROWS[0].name}</span>
            <span className="pd-preview-breed">{OTHER_ROWS[0].breed}</span>
          </span>
          <span className={`pd-preview-badge pd-preview-${OTHER_ROWS[0].status}`}>{OTHER_ROWS[0].label}</span>
          <span className="pd-preview-due">{OTHER_ROWS[0].due}</span>
        </div>
        <div className={`pd-preview-row pd-preview-focus stage-${stage}`}>
          <span className="pd-preview-avatar"><IconPaw width={14} height={14} /></span>
          <span className="pd-preview-info">
            <span className="pd-preview-name">Nova</span>
            <span className="pd-preview-breed">Standard Poodle</span>
          </span>
          <span key={s.label} className={`pd-preview-badge pd-preview-${s.badge} pd-preview-pop`}>{s.label}</span>
          <span className="pd-preview-due">{s.due}</span>
        </div>
        <div className="pd-preview-row">
          <span className="pd-preview-avatar"><IconPaw width={14} height={14} /></span>
          <span className="pd-preview-info">
            <span className="pd-preview-name">{OTHER_ROWS[1].name}</span>
            <span className="pd-preview-breed">{OTHER_ROWS[1].breed}</span>
          </span>
          <span className={`pd-preview-badge pd-preview-${OTHER_ROWS[1].status}`}>{OTHER_ROWS[1].label}</span>
          <span className="pd-preview-due">{OTHER_ROWS[1].due}</span>
        </div>
        <div key={stage} className={`pd-preview-sent pd-preview-note-${s.tone}`} aria-live="off">
          <IconCheck width={13} height={13} />
          {s.note}
        </div>
      </div>
    </div>
  );
}
