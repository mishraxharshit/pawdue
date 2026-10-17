import Reveal from "./Reveal";

// The "why" before the "what": an illustration of a week with empty slots,
// and the one insight the whole product is built on. Illustration only - the
// slot pattern is not real data and is labelled as such.
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const SLOTS = [
  [1, 1, 1, 0],
  [1, 0, 1, 1],
  [1, 1, 0, 0],
  [0, 1, 1, 0],
  [1, 0, 0, 1],
];

export default function ProblemSection() {
  return (
    <div className="pd-problem">
      <Reveal className="pd-problem-copy">
        <div className="pd-eyebrow">The problem</div>
        <h2 className="pd-display">The owner isn&apos;t ignoring you. <span className="pd-accent">They just forgot.</span></h2>
        <p>
          A full day of dogs leaves no time to chase rebookings. So regulars drift,
          the calendar gets gaps, and you never see it happen.
        </p>
        <ul className="pd-problem-list">
          <li><strong>Memory doesn&apos;t scale.</strong> A Poodle and a Lab need different schedules.</li>
          <li><strong>Manual texts get skipped.</strong> Busy week, forgotten follow-up.</li>
          <li><strong>PawDue does it for you.</strong> It emails the owner when the dog is due, with a booking link.</li>
        </ul>
      </Reveal>
      <Reveal delay={120} className="pd-problem-art">
        <div className="pd-week" role="img" aria-label="Illustration of a week calendar with several empty appointment slots">
          {DAYS.map((d, i) => (
            <div className="pd-week-col" key={d}>
              <div className="pd-week-day">{d}</div>
              {SLOTS[i].map((filled, j) => (
                <div className={`pd-week-slot ${filled ? "is-filled" : "is-open"}`} key={j} style={{ transitionDelay: `${(i * 4 + j) * 40}ms` }} />
              ))}
            </div>
          ))}
        </div>
        <div className="pd-week-legend">
          <span><i className="is-filled" /> Booked</span>
          <span><i className="is-open" /> Open</span>
          <span className="pd-week-note">Illustration, not real data</span>
        </div>
      </Reveal>
    </div>
  );
}
