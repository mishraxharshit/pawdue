// Small, dependency-free CSV reader/writer.
// Reader: handles quoted fields, escaped quotes (""), commas and newlines
// inside quotes, CRLF/LF, a UTF-8 BOM, and semicolon or tab separators
// (spreadsheets in some countries export those instead of commas).
// Writer: quotes fields as needed and neutralises spreadsheet formulas, so a
// client named "=HYPERLINK(...)" can't run code when the export is opened.

function detectDelimiter(text) {
  const firstLine = text.split(/\r?\n/, 1)[0] || "";
  const counts = [",", ";", "\t"].map((d) => [d, firstLine.split(d).length - 1]);
  counts.sort((a, b) => b[1] - a[1]);
  return counts[0][1] > 0 ? counts[0][0] : ",";
}

export function parseCsv(input) {
  let text = String(input ?? "");
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  if (!text.trim()) return [];
  const delim = detectDelimiter(text);
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === delim) {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += c;
    }
  }
  row.push(field);
  rows.push(row);

  // Drop rows that are completely empty (blank lines at the end, etc.)
  return rows.filter((r) => r.some((cell) => String(cell).trim() !== ""));
}

// Returns [{header: value}] using the first row as headers (trimmed).
export function parseCsvObjects(input) {
  const rows = parseCsv(input);
  if (rows.length === 0) return { headers: [], records: [] };
  const headers = rows[0].map((h) => String(h).trim());
  const records = rows.slice(1).map((r) => {
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = r[i] !== undefined ? String(r[i]).trim() : "";
    });
    return obj;
  });
  return { headers, records };
}

function safeCell(value) {
  let s = value === null || value === undefined ? "" : String(value);
  // Neutralise spreadsheet formula injection: a leading = + - @ (or tab/CR)
  // would be executed as a formula by Excel/Sheets. Phone numbers that start
  // with "+" are the one legitimate case, so those are left alone.
  if (/^[=@\t\r]/.test(s) || (/^[+-]/.test(s) && !/^\+?[\d\s().-]+$/.test(s))) s = `'${s}`;
  if (/[",\r\n]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function toCsv(headers, rows) {
  const lines = [headers.map(safeCell).join(",")];
  for (const r of rows) lines.push(headers.map((h) => safeCell(r[h])).join(","));
  return lines.join("\r\n") + "\r\n";
}
