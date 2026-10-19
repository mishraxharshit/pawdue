import { BREED_INTERVALS } from "./breedIntervals";

// Turns a spreadsheet row (any reasonable column names) into a dog record.
// Shared by the browser (live preview with row-by-row problems) and the
// server (which re-checks everything: the client is never trusted).

export const MAX_IMPORT_ROWS = 500;
export const FALLBACK_BREED = "Mixed / Unknown breed";

// Header aliases, lower-cased with punctuation removed.
const ALIASES = {
  dogName: ["dog", "dogname", "dogsname", "pet", "petname", "name", "nameofdog"],
  ownerName: ["owner", "ownername", "ownersname", "client", "clientname", "customer", "customername", "parent"],
  ownerEmail: ["email", "owneremail", "clientemail", "emailaddress", "customeremail"],
  phone: ["phone", "ownerphone", "mobile", "cell", "phonenumber", "telephone", "clientphone"],
  breed: ["breed", "dogbreed"],
  lastGroomDate: ["lastgroom", "lastgroomdate", "lastgroomed", "lastvisit", "lastappointment", "lastgroomingdate", "date"],
  customWeeks: ["weeks", "interval", "intervalweeks", "customweeks", "rebookweeks", "cycle"],
  notes: ["notes", "note", "comments", "comment"],
};

const norm = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");

export function mapHeaders(headers) {
  const map = {};
  headers.forEach((h) => {
    const n = norm(h);
    for (const [field, names] of Object.entries(ALIASES)) {
      if (!map[field] && names.includes(n)) map[field] = h;
    }
  });
  return map;
}

// Breed names people actually write -> the breeds PawDue has intervals for.
const BREED_HINTS = [
  [/doodle|cockapoo|cavapoo|maltipoo/, "Doodle (Goldendoodle/Labradoodle/etc)"],
  [/poodle/, "Poodle (Standard/Mini/Toy)"],
  [/shih\s*-?tzu/, "Shih Tzu"],
  [/maltese/, "Maltese"],
  [/bichon/, "Bichon Frise"],
  [/cocker/, "Cocker Spaniel"],
  [/yorkie|yorkshire/, "Yorkshire Terrier"],
  [/schnauzer/, "Schnauzer"],
  [/sheepdog/, "Old English Sheepdog"],
  [/golden\s*retriever|^golden$/, "Golden Retriever"],
  [/labrador|^lab$/, "Labrador Retriever"],
  [/german\s*shepherd|^gsd$/, "German Shepherd"],
  [/beagle/, "Beagle"],
  [/husky|malamute/, "Husky / Malamute"],
  [/chihuahua/, "Chihuahua"],
  [/\bpug\b/, "Pug"],
];

export function matchBreed(raw) {
  const s = String(raw || "").trim();
  if (!s) return { breed: FALLBACK_BREED, matched: false };
  const exact = Object.keys(BREED_INTERVALS).find((k) => k.toLowerCase() === s.toLowerCase());
  if (exact) return { breed: exact, matched: true };
  const lower = s.toLowerCase();
  for (const [re, breed] of BREED_HINTS) if (re.test(lower)) return { breed, matched: true };
  return { breed: FALLBACK_BREED, matched: false };
}

function isoOk(y, m, d) {
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}
const pad = (n) => String(n).padStart(2, "0");

// dateOrder: "mdy" (US: 03/25/2026) or "dmy" (03/25 -> 25/03/2026).
// ISO dates (2026-03-25) are always accepted. Returns "YYYY-MM-DD" or null.
export function parseDate(raw, dateOrder = "mdy") {
  const s = String(raw || "").trim();
  if (!s) return null;
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s].*)?$/);
  if (m) {
    const [y, mo, d] = [+m[1], +m[2], +m[3]];
    return isoOk(y, mo, d) ? `${y}-${pad(mo)}-${pad(d)}` : null;
  }
  m = s.match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{2}|\d{4})$/);
  if (m) {
    let [a, b, y] = [+m[1], +m[2], +m[3]];
    if (y < 100) y += 2000;
    const [mo, d] = dateOrder === "dmy" ? [b, a] : [a, b];
    return isoOk(y, mo, d) ? `${y}-${pad(mo)}-${pad(d)}` : null;
  }
  return null;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Returns { dog, warnings[], error } for a single record. `fields` maps our
// field names to the actual header names in the file (from mapHeaders).
export function normalizeRecord(record, fields, { dateOrder = "mdy", today = new Date() } = {}) {
  const get = (f) => (fields[f] ? String(record[fields[f]] ?? "").trim() : "");
  const warnings = [];

  const dogName = get("dogName");
  const ownerName = get("ownerName");
  if (!dogName) return { error: "Missing dog name" };
  if (!ownerName) return { error: "Missing owner name" };

  const lastGroomDate = parseDate(get("lastGroomDate"), dateOrder);
  if (!lastGroomDate) return { error: `Last groom date "${get("lastGroomDate")}" is missing or not a valid date` };
  if (new Date(`${lastGroomDate}T00:00:00Z`) > new Date(today.getTime() + 24 * 3600 * 1000)) {
    return { error: `Last groom date ${lastGroomDate} is in the future` };
  }

  const ownerEmail = get("ownerEmail").toLowerCase();
  if (ownerEmail && !EMAIL_RE.test(ownerEmail)) return { error: `"${get("ownerEmail")}" is not a valid email` };
  if (!ownerEmail) warnings.push("No email, so email reminders can't reach this owner");

  const phone = get("phone");
  if (!ownerEmail && !phone) return { error: "Needs at least an email or a phone number" };

  const { breed, matched } = matchBreed(get("breed"));
  if (!matched) warnings.push(get("breed") ? `Breed "${get("breed")}" not recognised, using "${FALLBACK_BREED}"` : `No breed, using "${FALLBACK_BREED}"`);

  let customWeeks = null;
  if (get("customWeeks")) {
    const w = Number(get("customWeeks"));
    if (!Number.isInteger(w) || w < 1 || w > 52) return { error: `Weeks "${get("customWeeks")}" must be a whole number from 1 to 52` };
    customWeeks = w;
  }

  return {
    dog: {
      dogName: dogName.slice(0, 80),
      ownerName: ownerName.slice(0, 80),
      ownerEmail: ownerEmail || "",
      phone: phone.slice(0, 40),
      breed,
      lastGroomDate,
      customWeeks,
      notes: get("notes").slice(0, 300),
    },
    warnings,
  };
}

// Whole-file helper. Rows beyond MAX_IMPORT_ROWS are rejected up front.
export function normalizeRecords(records, fields, opts) {
  const ok = [];
  const problems = [];
  const seen = new Set();
  records.slice(0, MAX_IMPORT_ROWS).forEach((rec, i) => {
    const r = normalizeRecord(rec, fields, opts);
    const rowNo = i + 2; // +1 for header, +1 for 1-based like a spreadsheet
    if (r.error) return problems.push({ row: rowNo, error: r.error });
    const key = `${r.dog.dogName.toLowerCase()}|${r.dog.ownerName.toLowerCase()}`;
    if (seen.has(key)) return problems.push({ row: rowNo, error: `Duplicate of an earlier row (${r.dog.dogName}, ${r.dog.ownerName})` });
    seen.add(key);
    ok.push({ row: rowNo, dog: r.dog, warnings: r.warnings });
  });
  if (records.length > MAX_IMPORT_ROWS) {
    problems.push({ row: MAX_IMPORT_ROWS + 2, error: `Only the first ${MAX_IMPORT_ROWS} rows can be imported at once. Import the rest in a second file.` });
  }
  return { ok, problems };
}
