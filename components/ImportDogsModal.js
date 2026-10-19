import { useMemo, useState } from "react";
import Link from "next/link";
import { IconX } from "./icons";
import { parseCsvObjects, toCsv } from "../lib/csv";
import { mapHeaders, normalizeRecords, MAX_IMPORT_ROWS } from "../lib/importDogs";

const TEMPLATE_HEADERS = ["Dog Name", "Owner Name", "Owner Email", "Phone", "Breed", "Last Groom Date", "Weeks", "Notes"];
const TEMPLATE_ROWS = [
  { "Dog Name": "Nova", "Owner Name": "Sam Rivera", "Owner Email": "sam@example.com", Phone: "+1 555 010 2030", Breed: "Poodle", "Last Groom Date": "2026-09-01", Weeks: "", Notes: "Nervous with clippers" },
  { "Dog Name": "Biscuit", "Owner Name": "Alex Chen", "Owner Email": "alex@example.com", Phone: "", Breed: "Labradoodle", "Last Groom Date": "2026-08-12", Weeks: "6", Notes: "" },
];

export default function ImportDogsModal({ onClose, onDone }) {
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState("");
  const [dateOrder, setDateOrder] = useState("mdy");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const parsed = useMemo(() => {
    if (!text.trim()) return null;
    const { headers, records } = parseCsvObjects(text);
    const fields = mapHeaders(headers);
    const missing = ["dogName", "ownerName", "lastGroomDate"].filter((f) => !fields[f]);
    if (missing.length) return { headers, fields, missing, ok: [], problems: [] };
    const { ok, problems } = normalizeRecords(records, fields, { dateOrder });
    return { headers, fields, missing: [], ok, problems, total: records.length };
  }, [text, dateOrder]);

  const FIELD_LABEL = { dogName: "Dog Name", ownerName: "Owner Name", lastGroomDate: "Last Groom Date" };
  const warningCount = parsed ? parsed.ok.filter((r) => r.warnings.length).length : 0;

  async function onFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    if (/\.xlsx?$/i.test(file.name)) {
      setError("That looks like an Excel file. In Excel or Google Sheets, choose File > Save as / Download > CSV, then pick that file.");
      return;
    }
    try {
      setText(await file.text());
      setFileName(file.name);
    } catch {
      setError("Could not read that file.");
    }
  }

  function downloadTemplate() {
    const blob = new Blob(["﻿" + toCsv(TEMPLATE_HEADERS, TEMPLATE_ROWS)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "pawdue-import-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function runImport() {
    if (!parsed?.ok.length) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/dogs/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: parsed.ok.map((r) => r.dog) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Import failed");
      setResult(data);
    } catch (err) {
      setError(err.message);
    }
    setBusy(false);
  }

  return (
    <div className="pd-modal-overlay" onMouseDown={onClose}>
      <div className="pd-modal" style={{ maxWidth: 680, maxHeight: "90vh", overflowY: "auto" }} onMouseDown={(e) => e.stopPropagation()}>
        <div className="pd-modal-head">
          <h2>Import your clients</h2>
          <button className="pd-modal-close" onClick={result ? onDone : onClose} aria-label="Close"><IconX /></button>
        </div>

        {result ? (
          <div>
            <p style={{ fontSize: "1.05rem", fontWeight: 700, marginTop: 0 }}>
              {result.imported} dog{result.imported === 1 ? "" : "s"} imported.
            </p>
            <ul className="sub" style={{ lineHeight: 1.7, paddingLeft: 18 }}>
              {result.skippedDuplicates > 0 && <li>{result.skippedDuplicates} skipped because they are already in your list.</li>}
              {result.problems.length > 0 && <li>{result.problems.length} row(s) had problems and were not imported.</li>}
              {result.skippedOverLimit > 0 && (
                <li>
                  {result.skippedOverLimit} not imported because your plan allows {result.limit} dogs.{" "}
                  <Link className="link" href="/pricing">Upgrade to add more</Link>.
                </li>
              )}
            </ul>
            <div className="pd-modal-actions"><button onClick={onDone}>Done</button></div>
          </div>
        ) : (
          <>
            <p className="sub" style={{ marginTop: 0 }}>
              Bring your client list from a spreadsheet. Save it as CSV, then pick the file or paste the rows below.
              Needed columns: <b>Dog Name</b>, <b>Owner Name</b>, <b>Last Groom Date</b>, plus an <b>email or phone</b>. Breed, Weeks and Notes are optional.
            </p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
              <label className="small ghost" style={{ cursor: "pointer", padding: "8px 14px", border: "1px solid var(--line)", borderRadius: 100, display: "inline-block", margin: 0 }}>
                Choose CSV file
                <input type="file" accept=".csv,.txt,text/csv" onChange={onFile} style={{ display: "none" }} />
              </label>
              <button type="button" className="small ghost" onClick={downloadTemplate}>Download template</button>
              {fileName && <span className="sub">{fileName}</span>}
            </div>
            <textarea
              value={text}
              onChange={(e) => { setText(e.target.value); setFileName(""); }}
              placeholder={"Dog Name,Owner Name,Owner Email,Phone,Breed,Last Groom Date\nNova,Sam Rivera,sam@example.com,,Poodle,2026-09-01"}
              rows={5}
              style={{ width: "100%", fontFamily: "monospace", fontSize: ".8rem" }}
              aria-label="Paste CSV rows"
            />
            <div style={{ margin: "10px 0" }}>
              <label style={{ display: "inline-flex", gap: 8, alignItems: "center", margin: 0 }}>
                Dates like 04/05/2026 mean
                <select value={dateOrder} onChange={(e) => setDateOrder(e.target.value)} style={{ width: "auto" }}>
                  <option value="mdy">April 5 (month first)</option>
                  <option value="dmy">May 4 (day first)</option>
                </select>
              </label>
            </div>

            {parsed && parsed.missing.length > 0 && (
              <div className="error">
                Could not find the column{parsed.missing.length > 1 ? "s" : ""}: {parsed.missing.map((m) => FIELD_LABEL[m]).join(", ")}.
                Found: {parsed.headers.join(", ") || "none"}.
              </div>
            )}

            {parsed && parsed.missing.length === 0 && (
              <div>
                <p style={{ fontWeight: 700, margin: "6px 0" }}>
                  {parsed.ok.length} ready to import
                  {parsed.problems.length > 0 && `, ${parsed.problems.length} with problems`}
                  {warningCount > 0 && `, ${warningCount} with notes`}
                </p>
                {parsed.ok.length > 0 && (
                  <div style={{ overflowX: "auto", border: "1px solid var(--line)", borderRadius: 10 }}>
                    <table style={{ width: "100%", fontSize: ".8rem", borderCollapse: "collapse" }}>
                      <thead>
                        <tr style={{ textAlign: "left", background: "var(--paper, #f6f5f0)" }}>
                          <th style={{ padding: "6px 10px" }}>Dog</th><th>Owner</th><th>Breed</th><th>Last groom</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parsed.ok.slice(0, 5).map((r) => (
                          <tr key={r.row} style={{ borderTop: "1px solid var(--line)" }}>
                            <td style={{ padding: "6px 10px" }}>{r.dog.dogName}</td>
                            <td>{r.dog.ownerName}</td>
                            <td>{r.dog.breed}</td>
                            <td>{r.dog.lastGroomDate}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {parsed.ok.length > 5 && <div className="sub" style={{ padding: "6px 10px" }}>and {parsed.ok.length - 5} more</div>}
                  </div>
                )}
                {warningCount > 0 && (
                  <p className="sub" style={{ margin: "8px 0 0" }}>
                    Notes: {parsed.ok.filter((r) => r.warnings.length).slice(0, 3).map((r) => `row ${r.row}: ${r.warnings[0]}`).join(" | ")}
                    {warningCount > 3 && ` | and ${warningCount - 3} more`}
                  </p>
                )}
                {parsed.problems.length > 0 && (
                  <div className="error" style={{ marginTop: 10 }}>
                    <b>These rows will be skipped:</b>
                    <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
                      {parsed.problems.slice(0, 5).map((p) => <li key={p.row}>Row {p.row}: {p.error}</li>)}
                      {parsed.problems.length > 5 && <li>and {parsed.problems.length - 5} more</li>}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {error && <div className="error" style={{ marginTop: 10 }}>{error}</div>}

            <div className="pd-modal-actions" style={{ marginTop: 14 }}>
              <button type="button" className="ghost" onClick={onClose}>Cancel</button>
              <button type="button" onClick={runImport} disabled={busy || !parsed?.ok.length}>
                {busy ? "Importing..." : parsed?.ok.length ? `Import ${parsed.ok.length} dog${parsed.ok.length === 1 ? "" : "s"}` : "Import"}
              </button>
            </div>
            <p className="sub" style={{ fontSize: ".74rem", marginBottom: 0 }}>Up to {MAX_IMPORT_ROWS} rows per file. Dogs already in your list are skipped.</p>
          </>
        )}
      </div>
    </div>
  );
}
