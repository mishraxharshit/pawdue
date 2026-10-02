import { IconPaw, IconBell, IconCheck } from "./icons";

// A stylized, non-functional preview of the actual dashboard, used in the
// hero instead of a mascot illustration. Buyers evaluating a SaaS tool
// convert better when the first thing they see is the interface they'd
// actually use, not a decorative graphic - so this mirrors the real
// due-list layout (see pages/dashboard.js) at a glance: a name, a status,
// a due date, done.
const ROWS = [
  { name: "Biscuit", breed: "Cockapoo", status: "overdue", due: "3 days ago" },
  { name: "Nova", breed: "Standard Poodle", status: "soon", due: "in 2 days" },
  { name: "Tank", breed: "Bernedoodle", status: "ok", due: "in 3 weeks" },
];

const STATUS_LABEL = { overdue: "Overdue", soon: "Due soon", ok: "On track" };

export default function HeroPreview() {
  return (
    <div className="pd-preview" role="img" aria-label="Preview of the PawDue dashboard showing three dogs and their grooming due dates">
      <div className="pd-preview-bar">
        <span className="pd-preview-dot" />
        <span className="pd-preview-dot" />
        <span className="pd-preview-dot" />
        <span className="pd-preview-bar-title">Today's due list</span>
        <span className="pd-preview-bell"><IconBell width={14} height={14} /></span>
      </div>
      <div className="pd-preview-body">
        {ROWS.map((row) => (
          <div className="pd-preview-row" key={row.name}>
            <span className="pd-preview-avatar"><IconPaw width={14} height={14} /></span>
            <span className="pd-preview-info">
              <span className="pd-preview-name">{row.name}</span>
              <span className="pd-preview-breed">{row.breed}</span>
            </span>
            <span className={`pd-preview-badge pd-preview-${row.status}`}>{STATUS_LABEL[row.status]}</span>
            <span className="pd-preview-due">{row.due}</span>
          </div>
        ))}
        <div className="pd-preview-sent">
          <IconCheck width={13} height={13} />
          Reminder sent to Nova's owner via email
        </div>
      </div>
    </div>
  );
}
