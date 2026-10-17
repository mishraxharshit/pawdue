import { useEffect, useRef, useState } from "react";
import { IconPaw, IconCheck } from "./icons";

// An auto-playing, clickable walkthrough of the whole journey: sign up, set
// up, add the first dog, the reminder going out, the owner booking, and the
// groomer seeing the result. It mirrors the real screens (register form, add
// dog modal, booking page, dashboard) with sample data only. Every number on
// screen is an example and is labelled that way. Motion respects
// prefers-reduced-motion: no auto-advance, no typing effect; the visitor
// steps through manually.
const STEP_MS = 6500;

const STEPS = [
  { tab: "Sign up", title: "Create your account", text: "Business name, email, password. About two minutes, no card." },
  { tab: "Set up", title: "Set your price and timezone", text: "PawDue uses them for send timing and to estimate the revenue you bring back." },
  { tab: "Add a dog", title: "Add your first dog", text: "Pick the breed and PawDue sets the rebook cycle. You can change it for any dog." },
  { tab: "The clock", title: "PawDue watches the calendar", text: "Every dog moves from On track to Due soon to Overdue on its own." },
  { tab: "The email", title: "The owner gets an email", text: "A friendly reminder with a link to book. No app for the owner to download." },
  { tab: "Booking", title: "The owner picks a time", text: "Open slots from your availability. One tap to confirm." },
  { tab: "Your dashboard", title: "You see the booking", text: "It lands on your dashboard, with an estimate of the revenue recovered." },
];

function Type({ text, delay = 0, className = "" }) {
  return (
    <span className={`pd-type ${className}`} style={{ animationDelay: `${delay}ms`, animationTimingFunction: `steps(${Math.max(text.length, 1)}, end)` }}>
      {text}
    </span>
  );
}

function Field({ label, children }) {
  return (
    <div className="pd-t-field">
      <span className="pd-t-label">{label}</span>
      <span className="pd-t-input">{children}</span>
    </div>
  );
}

function Screen({ step }) {
  if (step === 0) {
    return (
      <div className="pd-t-card pd-t-narrow">
        <div className="pd-t-logo">Paw<span>Due</span></div>
        <Field label="Business name (optional)"><Type text="Happy Tails Grooming" delay={300} /></Field>
        <Field label="Email"><Type text="hello@happytails.example" delay={1300} /></Field>
        <Field label="Password"><Type text="••••••••••" delay={2400} /></Field>
        <div className="pd-t-btn pd-t-press" style={{ animationDelay: "3600ms" }}>Create account</div>
        <div className="pd-t-done" style={{ animationDelay: "4300ms" }}><IconCheck width={14} height={14} /> Account created</div>
      </div>
    );
  }
  if (step === 1) {
    return (
      <div className="pd-t-card">
        <div className="pd-t-title">Business settings</div>
        <Field label="Typical price per groom"><Type text="$55" delay={400} /></Field>
        <Field label="Timezone"><Type text="America/Chicago" delay={1500} /></Field>
        <div className="pd-t-done" style={{ animationDelay: "2800ms" }}><IconCheck width={14} height={14} /> Saved. Revenue is estimated at $55 per visit.</div>
      </div>
    );
  }
  if (step === 2) {
    return (
      <div className="pd-t-card">
        <div className="pd-t-title">Add a dog</div>
        <Field label="Dog's name"><Type text="Nova" delay={300} /></Field>
        <Field label="Owner email (used for reminders)"><Type text="owner@example.com" delay={1000} /></Field>
        <Field label="Breed"><Type text="Poodle (Standard/Mini/Toy)" delay={2000} /></Field>
        <div className="pd-t-chip" style={{ animationDelay: "3300ms" }}>Rebook cycle: every 5 weeks</div>
        <div className="pd-t-btn pd-t-press" style={{ animationDelay: "4300ms" }}>Save dog</div>
      </div>
    );
  }
  if (step === 3) {
    return (
      <div className="pd-t-card">
        <div className="pd-t-title">Due list</div>
        <div className="pd-t-skip">Five weeks later...</div>
        <div className="pd-t-row">
          <span className="pd-t-avatar"><IconPaw width={14} height={14} /></span>
          <span className="pd-t-info"><b>Nova</b><i>Poodle</i></span>
          <span className="pd-t-badge pd-t-swap">
            <span className="pd-t-b1">On track</span>
            <span className="pd-t-b2">Due soon</span>
          </span>
        </div>
        <div className="pd-t-row">
          <span className="pd-t-avatar"><IconPaw width={14} height={14} /></span>
          <span className="pd-t-info"><b>Biscuit</b><i>Labradoodle</i></span>
          <span className="pd-t-badge pd-t-overdue">Overdue</span>
        </div>
        <div className="pd-t-note" style={{ animationDelay: "3400ms" }}>PawDue queues a reminder for Nova</div>
      </div>
    );
  }
  if (step === 4) {
    return (
      <div className="pd-t-card pd-t-email">
        <div className="pd-t-meta"><span>From PawDue</span><span>Example email</span></div>
        <div className="pd-t-subject">Nova is due for a groom</div>
        <p className="pd-t-body">Hi! It has been a few weeks since Nova&apos;s last groom at Happy Tails Grooming. Pick a time that suits you.</p>
        <div className="pd-t-btn pd-t-press" style={{ animationDelay: "2600ms" }}>Pick a time</div>
        <div className="pd-t-sent" style={{ animationDelay: "500ms" }}><IconCheck width={13} height={13} /> Sent by email</div>
      </div>
    );
  }
  if (step === 5) {
    return (
      <div className="pd-t-card pd-t-narrow">
        <div className="pd-t-logo">Paw<span>Due</span></div>
        <div className="pd-t-small">Book a slot for</div>
        <div className="pd-t-dog"><b>Nova</b> <i>· Poodle</i></div>
        <div className="pd-t-day">Saturday</div>
        <div className="pd-t-slots">
          <span>9:00 AM</span>
          <span className="pd-t-pick" style={{ animationDelay: "1500ms" }}>10:30 AM</span>
          <span>1:00 PM</span>
        </div>
        <div className="pd-t-btn pd-t-press" style={{ animationDelay: "3000ms" }}>Confirm</div>
        <div className="pd-t-done" style={{ animationDelay: "3700ms" }}><IconCheck width={14} height={14} /> Booked for Saturday, 10:30 AM</div>
      </div>
    );
  }
  return (
    <div className="pd-t-card">
      <div className="pd-t-title">Your dashboard</div>
      <div className="pd-t-booking" style={{ animationDelay: "400ms" }}>
        <span className="pd-t-avatar"><IconPaw width={14} height={14} /></span>
        <span className="pd-t-info"><b>Nova booked</b><i>Saturday, 10:30 AM</i></span>
        <span className="pd-t-badge pd-t-ok">Booked</span>
      </div>
      <div className="pd-t-revenue" style={{ animationDelay: "1500ms" }}>
        <span>Recovered this month (estimate)</span>
        <b>$55</b>
        <i>Based on $55 per visit. Sample data.</i>
      </div>
    </div>
  );
}

export default function ProductTour() {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [inView, setInView] = useState(false);
  const [hover, setHover] = useState(false);
  const rootRef = useRef(null);
  const touched = useRef(false); // once the visitor takes control, autoplay never restarts by itself

  useEffect(() => {
    const r = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setReduced(r);
    const el = rootRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return undefined;
    const io = new IntersectionObserver(
      ([e]) => {
        setInView(e.isIntersecting);
        if (e.isIntersecting && !r && !touched.current) setPlaying(true);
      },
      { threshold: 0.35 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const running = playing && inView && !hover && !reduced;

  useEffect(() => {
    if (!running) return undefined;
    const id = setTimeout(() => setStep((s) => (s + 1) % STEPS.length), STEP_MS);
    return () => clearTimeout(id);
  }, [running, step]);

  function go(i) {
    touched.current = true;
    setStep(i);
    setPlaying(false); // a manual choice stops autoplay until Play is pressed
  }

  const s = STEPS[step];

  return (
    <div className="pd-tour" ref={rootRef} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <div className="pd-tour-tabs" role="tablist" aria-label="Product walkthrough steps">
        {STEPS.map((t, i) => (
          <button
            key={t.tab}
            role="tab"
            aria-selected={i === step}
            className={`pd-tour-tab ${i === step ? "is-active" : ""} ${i < step ? "is-done" : ""}`}
            onClick={() => go(i)}
          >
            <span className="pd-tour-num">{i + 1}</span>
            <span className="pd-tour-tabname">{t.tab}</span>
          </button>
        ))}
      </div>

      <div className="pd-tour-stage">
        <div className="pd-tour-copy">
          <div className="pd-tour-step">Step {step + 1} of {STEPS.length}</div>
          <h3>{s.title}</h3>
          <p>{s.text}</p>
          <div className="pd-tour-controls">
            <button className="pd-tour-ctl" onClick={() => go((step + STEPS.length - 1) % STEPS.length)} aria-label="Previous step">&larr;</button>
            <button className="pd-tour-ctl" onClick={() => (reduced ? go((step + 1) % STEPS.length) : (touched.current = true, setPlaying((p) => !p)))} aria-label={playing ? "Pause walkthrough" : "Play walkthrough"}>
              {reduced ? "Next" : playing ? "Pause" : "Play"}
            </button>
            <button className="pd-tour-ctl" onClick={() => go((step + 1) % STEPS.length)} aria-label="Next step">&rarr;</button>
          </div>
          <div className="pd-tour-bar" aria-hidden="true">
            <span key={`${step}-${running}`} className={running ? "is-running" : ""} style={{ animationDuration: `${STEP_MS}ms` }} />
          </div>
        </div>
        <div className="pd-tour-screen" aria-hidden="true">
          <div className="pd-tour-chrome"><i /><i /><i /><span>pawdue.pet</span></div>
          <div className="pd-tour-body" key={step}>
            <Screen step={step} />
          </div>
        </div>
      </div>
      <p className="pd-tour-foot">All names and numbers in this walkthrough are examples.</p>
    </div>
  );
}
