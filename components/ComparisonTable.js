const ROWS = [
  { label: "Knows each breed's grooming cycle", pd: true, sheet: false, notes: false },
  { label: "Sends the reminder automatically", pd: true, sheet: false, notes: false },
  { label: "Sends by email instantly, WhatsApp/SMS optional add-ons", pd: true, sheet: false, notes: false },
  { label: "Owner can rebook from the message", pd: true, sheet: false, notes: false },
  { label: "Works if you forget to check it", pd: true, sheet: false, notes: false },
  { label: "Free to start", pd: true, sheet: true, notes: true },
];

function Cell({ ok }) {
  return (
    <span className={`pd-cmp-cell ${ok ? "yes" : "no"}`} aria-label={ok ? "Yes" : "No"}>
      {ok ? "✓" : "—"}
    </span>
  );
}

export default function ComparisonTable() {
  return (
    <div className="pd-cmp">
      <div className="pd-cmp-row pd-cmp-head">
        <div className="pd-cmp-label" />
        <div className="pd-cmp-col pd-cmp-col-pd">PawDue</div>
        <div className="pd-cmp-col">Spreadsheet</div>
        <div className="pd-cmp-col">Sticky notes</div>
      </div>
      {ROWS.map((row) => (
        <div className="pd-cmp-row" key={row.label}>
          <div className="pd-cmp-label">{row.label}</div>
          <div className="pd-cmp-col pd-cmp-col-pd"><Cell ok={row.pd} /></div>
          <div className="pd-cmp-col"><Cell ok={row.sheet} /></div>
          <div className="pd-cmp-col"><Cell ok={row.notes} /></div>
        </div>
      ))}
    </div>
  );
}
