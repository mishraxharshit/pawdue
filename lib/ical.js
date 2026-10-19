// Minimal RFC 5545 calendar feed builder. One-way: PawDue bookings show up in
// Google / Apple / Outlook calendar when they subscribe to the feed URL.

function esc(s) {
  return String(s ?? "").replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

function stamp(d) {
  return new Date(d).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

// Lines over 75 octets should be folded.
function fold(line) {
  const out = [];
  let rest = line;
  while (rest.length > 74) {
    out.push(rest.slice(0, 74));
    rest = " " + rest.slice(74);
  }
  out.push(rest);
  return out.join("\r\n");
}

/** bookings: [{id, slot_at, dogName, ownerName, phone, breed}] */
export function buildCalendar(bookings, { name = "PawDue bookings", slotMinutes = 60 } = {}) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//PawDue//Bookings//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${esc(name)}`,
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
    "X-PUBLISHED-TTL:PT1H",
  ];
  for (const b of bookings) {
    const start = new Date(b.slot_at);
    if (Number.isNaN(start.getTime())) continue;
    const end = new Date(start.getTime() + slotMinutes * 60000);
    const desc = [b.ownerName && `Owner: ${b.ownerName}`, b.phone && `Phone: ${b.phone}`, b.breed && `Breed: ${b.breed}`]
      .filter(Boolean)
      .join("\n");
    lines.push(
      "BEGIN:VEVENT",
      `UID:${b.id}@pawdue`,
      `DTSTAMP:${stamp(new Date())}`,
      `DTSTART:${stamp(start)}`,
      `DTEND:${stamp(end)}`,
      `SUMMARY:${esc(`Groom: ${b.dogName || "Dog"}`)}`,
      `DESCRIPTION:${esc(desc)}`,
      "END:VEVENT"
    );
  }
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}
