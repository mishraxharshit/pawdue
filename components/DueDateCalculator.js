import { useMemo, useState } from "react";
import { BREED_INTERVALS, defaultIntervalFor, computeStatus } from "../lib/breedIntervals";

const BREEDS = Object.keys(BREED_INTERVALS);

function todayISO() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

// A three-week-ago default so the widget opens already "mid-cycle" and
// visibly demonstrates a status, rather than sitting at "just groomed".
function threeWeeksAgoISO() {
  const d = new Date();
  d.setDate(d.getDate() - 21);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

export default function DueDateCalculator() {
  const [breed, setBreed] = useState(BREEDS[0]);
  const [lastGroom, setLastGroom] = useState(threeWeeksAgoISO());

  const result = useMemo(() => {
    const interval = defaultIntervalFor(breed);
    const dog = { last_groom_date: lastGroom, interval_weeks: interval };
    const comp = computeStatus(dog);
    const elapsedDays = Math.round((new Date() - new Date(lastGroom)) / 86400000);
    const totalDays = interval * 7;
    const pct = Math.max(0, Math.min(100, Math.round((elapsedDays / totalDays) * 100)));
    return { interval, comp, pct };
  }, [breed, lastGroom]);

  const { comp, interval, pct } = result;
  const dueStr = comp.due.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  const statusCopy = {
    ok: "Nothing to send yet — quietly tracked in the background.",
    soon: "This is the window PawDue sends the WhatsApp reminder in.",
    overdue: "This is exactly the client PawDue would have already nudged.",
  };

  return (
    <div className="pd-calc">
      <div className="pd-calc-inputs">
        <label>
          <span>Breed</span>
          <select value={breed} onChange={(e) => setBreed(e.target.value)}>
            {BREEDS.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </label>
        <label>
          <span>Last groomed</span>
          <input
            type="date"
            value={lastGroom}
            max={todayISO()}
            onChange={(e) => setLastGroom(e.target.value)}
          />
        </label>
      </div>

      <div className={`pd-calc-result pd-calc-${comp.status}`}>
        <div className="pd-calc-bar-track">
          <div className="pd-calc-bar-fill" style={{ width: `${pct}%` }} />
        </div>
        <div className="pd-calc-readout">
          <div>
            <div className="pd-calc-label">Typical interval</div>
            <div className="pd-calc-value">every {interval} weeks</div>
          </div>
          <div>
            <div className="pd-calc-label">Next due</div>
            <div className="pd-calc-value">{dueStr}</div>
          </div>
          <div className={`pd-calc-badge pd-calc-badge-${comp.status}`}>
            {comp.status === "overdue" ? "Overdue" : comp.status === "soon" ? "Due soon" : "On track"}
          </div>
        </div>
        <p className="pd-calc-note">{statusCopy[comp.status]}</p>
      </div>
    </div>
  );
}
