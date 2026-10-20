// Input checks for dog records. Used by the API routes so bad or oversized
// data is rejected on the server, not just in the browser form.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^[+\d][\d\s().-]{4,29}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function text(v, max) {
  return typeof v === "string" ? v.trim().slice(0, max + 1) : "";
}

function validDate(s) {
  if (!DATE_RE.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== s) return false;
  // Allow up to one day ahead so a groomer in a timezone ahead of UTC can log "today".
  return d.getTime() <= Date.now() + 36 * 3600 * 1000;
}

/**
 * Validates the fields that are present. With { partial: true } (PATCH) missing
 * fields are fine; with partial false (create) the required ones must exist.
 * Returns { error } or { values } where values holds the cleaned fields.
 */
export function validateDogInput(body, { partial = false } = {}) {
  const b = body || {};
  const v = {};
  const has = (k) => b[k] !== undefined;

  const required = ["dogName", "ownerName", "phone", "breed", "lastGroomDate", "ownerEmail"];
  if (!partial) {
    for (const k of required) if (!b[k]) return { error: `${k} is required` };
  }

  if (has("dogName") && b.dogName !== "" ) {
    v.dogName = text(b.dogName, 80);
    if (!v.dogName || v.dogName.length > 80) return { error: "Dog name must be 1 to 80 characters." };
  }
  if (has("ownerName") && b.ownerName !== "") {
    v.ownerName = text(b.ownerName, 80);
    if (!v.ownerName || v.ownerName.length > 80) return { error: "Owner name must be 1 to 80 characters." };
  }
  if (has("breed") && b.breed !== "") {
    v.breed = text(b.breed, 80);
    if (!v.breed || v.breed.length > 80) return { error: "Breed must be 1 to 80 characters." };
  }
  if (has("phone") && b.phone !== "") {
    v.phone = text(b.phone, 30);
    if (!PHONE_RE.test(v.phone)) return { error: "Phone number does not look right." };
  }
  if (has("ownerEmail")) {
    const e = text(b.ownerEmail, 254);
    if (e) {
      if (e.length > 254 || !EMAIL_RE.test(e)) return { error: "Owner email does not look right." };
      v.ownerEmail = e;
    } else if (!partial) {
      return { error: "ownerEmail is required" };
    } else {
      v.ownerEmail = null;
    }
  }
  if (has("notes")) {
    const n = typeof b.notes === "string" ? b.notes.trim() : "";
    if (n.length > 1000) return { error: "Notes can be at most 1000 characters." };
    v.notes = n || null;
  }
  if (has("lastGroomDate") && b.lastGroomDate !== "") {
    const d = String(b.lastGroomDate).slice(0, 10);
    if (!validDate(d)) return { error: "Last groom date must be a real date that is not in the future." };
    v.lastGroomDate = d;
  }
  const weeksRaw = has("customWeeks") ? b.customWeeks : has("intervalWeeks") ? b.intervalWeeks : undefined;
  if (weeksRaw !== undefined && weeksRaw !== "" && weeksRaw !== null) {
    const w = Number(weeksRaw);
    if (!Number.isInteger(w) || w < 1 || w > 52) return { error: "Weeks between grooms must be a whole number from 1 to 52." };
    v.intervalWeeks = w;
  }
  return { values: v };
}
