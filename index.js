import Link from "next/link";
import { createSupabaseServerClient } from "../lib/supabase/server";
import MarketingNav from "../components/MarketingNav";
import SiteFooter from "../components/SiteFooter";
import DueDateCalculator from "../components/DueDateCalculator";
import ComparisonTable from "../components/ComparisonTable";
import HeroPreview from "../components/HeroPreview";
import ProblemSection from "../components/ProblemSection";
import Reveal from "../components/Reveal";
import ProductTour from "../components/ProductTour";
import Faq from "../components/Faq";
import { IconCheck, IconCalendar, IconMessage, IconInbox, IconLink, IconEnvelope } from "../components/icons";

const FEATURES = [
  {
    icon: IconMessage,
    tone: "coral",
    title: "Reminders that send themselves",
    body: "Every morning at your local time, PawDue emails the owner of each dog that is due. You do not have to remember who to message. A WhatsApp backup for owners without email is coming soon.",
  },
  {
    icon: IconLink,
    tone: "sky",
    title: "Owners rebook without calling you",
    body: "Every reminder has a booking link. The owner picks one of the open times you set, and the booking shows up on your dashboard. No app for the owner to download.",
  },
  {
    icon: IconCalendar,
    tone: "teal",
    title: "Breed-aware due dates",
    body: "Pick the breed and PawDue starts that dog on a typical cycle for it (a Poodle is not a Lab). It is a starting point, and you can change the weeks for any dog.",
  },
  {
    icon: IconInbox,
    tone: "yellow",
    title: "One list, every client",
    body: "See who is on track, due soon or overdue in one list. Add dogs one by one or import your existing list from a CSV file.",
  },
];

const FAQ_ITEMS = [
  {
    q: "Is PawDue new? Who is behind it?",
    a: "Yes, PawDue is new. It is built by a solo founder and shaped by feedback from working groomers. That is why there are no customer logos or reviews on this page: we only show what is real. If something is missing or confusing, tell us from the feedback page and it gets read.",
  },
  {
    q: "Does PawDue take payments or run my whole salon?",
    a: "No. PawDue does one job: knowing who is due and reminding them to rebook. It does not take payments from your clients, send invoices, or replace your full salon software. Your account is one login for now (no separate staff logins).",
  },
  {
    q: "Do I need a credit card to start?",
    a: "No. The free plan covers up to 30 dogs with no card on file. You only add billing details if you upgrade.",
  },
  {
    q: "Does this cost extra per message?",
    a: "Reminders go out by email today, and there is no per-message charge on any plan. WhatsApp and SMS backups are coming soon. We will tell you before anything about pricing changes.",
  },
  {
    q: "Can I bring in my existing client list?",
    a: "Yes. Add dogs one at a time from the dashboard, or upload a CSV file if you're moving a larger book of clients (in Excel or Google Sheets, choose Save as CSV). We can help with the import if you get stuck.",
  },
  {
    q: "What happens if I cancel?",
    a: "You keep access until the end of your billing period and can export your client list at any time. No contracts, no cancellation fee.",
  },
];

export async function getServerSideProps({ req, res }) {
  const supabase = createSupabaseServerClient(req, res);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    return { redirect: { destination: "/dashboard", permanent: false } };
  }
  return { props: {} };
}

export default function Landing() {
  return (
    <div className="pd-landing">
      <div className="pd-shell">
        <MarketingNav />

        {/* ---------- Hero ----------
            Headline names the specific outcome (rebookings, not "organized"),
            the visual is the actual product layout rather than a mascot, and
            the trust strip under the CTAs kills the three biggest objections
            (cost, setup effort, "will owners actually see it") before anyone
            scrolls. */}
        <section className="pd-hero">
          <div>
            <h1 className="pd-display">Stop losing regulars because nobody remembered to ask.</h1>
            <p>
              PawDue keeps track of when each dog is due for its next groom and emails
              the owner a friendly reminder with a link to book. Each dog starts on a
              typical cycle for its breed, and you can change it. You log the groom,
              PawDue does the chasing.
            </p>
            <div className="pd-cta-row">
              <Link className="pd-btn pd-btn-primary" href="/register">Start free</Link>
              <Link className="pd-btn pd-btn-ghost" href="/pricing">See pricing</Link>
            </div>
            <div className="pd-trust-strip">
              <span className="pd-trust-item"><IconCheck width={16} height={16} /> Free for up to 30 dogs</span>
              <span className="pd-trust-item"><IconCheck width={16} height={16} /> No credit card</span>
              <span className="pd-trust-item"><IconCheck width={16} height={16} /> Set up in a few minutes</span>
            </div>
          </div>
          <div className="pd-hero-art">
            <div className="pd-blob pd-blob-1" />
            <div className="pd-blob pd-blob-2" />
            <HeroPreview />
          </div>
        </section>
      </div>

      {/* ---------- Capability strip ----------
          No invented customer counts or logos - those get replaced the day
          real numbers exist. This is a plain statement of what the product
          actually does, right where a logo bar would normally sit. */}
      <div className="pd-band pd-band-tint pd-capstrip">
        <div className="pd-shell">
          <p className="pd-capstrip-text">
            New and built with groomer feedback. Made for solo groomers, mobile vans and small shops who are tired of tracking rebookings from memory.
          </p>
        </div>
      </div>

      <div className="pd-shell">
        {/* ---------- Problem: the why, before the what ---------- */}
        <div className="pd-band">
          <ProblemSection />
        </div>

        {/* ---------- Whole journey, animated ---------- */}
        <div className="pd-band pd-band-tint">
          <div className="pd-section-head pd-center">
            <div className="pd-eyebrow">The whole journey</div>
            <h2 className="pd-display">From sign-up to a booked groom, in seven steps</h2>
          </div>
          <ProductTour />
        </div>

        {/* ---------- Features ---------- */}
        <div className="pd-band">
          <div className="pd-section-head pd-center">
            <div className="pd-eyebrow">What it does</div>
            <h2 className="pd-display">After you log a groom, the follow-up happens on its own</h2>
          </div>
          <div className="pd-feature-grid">
            {FEATURES.map((f, i) => (
              <Reveal className="pd-feature-card" delay={i * 90} key={f.title}>
                <div className={`pd-icon-badge ${f.tone}`}><f.icon width={22} height={22} /></div>
                <h3>{f.title}</h3>
                <p>{f.body}</p>
              </Reveal>
            ))}
          </div>

          {/* ---------- The fallback chain gets its own visual, not just a
              bullet point, because it's the single most concrete claim on
              the page: this is a real behavior in the code, not marketing
              language, and it deserves to look like one. ---------- */}
          <div className="pd-flow">
            <div className="pd-flow-step">
              <div className="pd-flow-icon"><IconEnvelope width={22} height={22} /></div>
              <div className="pd-flow-label">Email</div>
              <div className="pd-flow-sub">Sent first</div>
            </div>
            <div className="pd-flow-arrow">&rarr;</div>
            <div className="pd-flow-step">
              <div className="pd-flow-icon"><IconMessage width={22} height={22} /></div>
              <div className="pd-flow-label">WhatsApp</div>
              <div className="pd-flow-sub">Coming soon</div>
            </div>
            <div className="pd-flow-arrow">&rarr;</div>
            <div className="pd-flow-step">
              <div className="pd-flow-icon"><IconMessage width={22} height={22} /></div>
              <div className="pd-flow-label">SMS</div>
              <div className="pd-flow-sub">Coming soon</div>
            </div>
          </div>
          <p className="pd-flow-caption">
            Email works from day one. WhatsApp and SMS backups are not switched on yet. The
            order above is how they will be used once they are: email first, then the others
            only if email cannot reach the owner.
          </p>
        </div>

        {/* ---------- Proof, right after the features: watch the actual
            product logic run instead of reading more claims. ---------- */}
        <div className="pd-band pd-band-tint">
          <div className="pd-section-head pd-center">
            <div className="pd-eyebrow">See it work</div>
            <h2 className="pd-display">A real due date, calculated right now</h2>
            <p>Pick a breed and a last-groom date. This is the same date math PawDue uses for every dog.</p>
          </div>
          <DueDateCalculator />
        </div>

        {/* ---------- How it works ---------- */}
        <div className="pd-band">
          <div className="pd-section-head pd-center">
            <div className="pd-eyebrow">Three steps</div>
            <h2 className="pd-display">From new client to booked again</h2>
          </div>
          <div className="pd-steps-row">
            <div className="pd-step-card">
              <div className="pd-step-num">1</div>
              <h3>Log a groom</h3>
              <p>Dog&apos;s name, owner, breed, and today&apos;s date. Ten seconds, done.</p>
            </div>
            <div className="pd-step-card">
              <div className="pd-step-num">2</div>
              <h3>We set the clock</h3>
              <p>That breed&apos;s typical cycle becomes this dog&apos;s due date. You can set your own number of weeks for any dog.</p>
            </div>
            <div className="pd-step-card">
              <div className="pd-step-num">3</div>
              <h3>The reminder sends itself</h3>
              <p>The owner gets an email in the morning (your local time) with a booking link. A WhatsApp backup is coming soon.</p>
            </div>
          </div>
        </div>

        {/* ---------- Why switch: comparison table, with its own CTA right
            underneath. This is the strongest differentiation moment on the
            page, so it's also the best place to ask again - not just at
            the very bottom, five sections later. ---------- */}
        <div className="pd-band pd-band-tint">
          <div className="pd-section-head pd-center">
            <div className="pd-eyebrow">Why switch</div>
            <h2 className="pd-display">PawDue vs. how you&apos;re tracking it now</h2>
          </div>
          <ComparisonTable />
          <div className="pd-midcta">
            <Link className="pd-btn pd-btn-primary" href="/register">Start free in 2 minutes</Link>
            <p className="pd-midcta-note">Up to 30 dogs on the house. No card required.</p>
          </div>
        </div>

        {/* ---------- Honest scope: what it does and what it does not. ---------- */}
        <div className="pd-band">
          <div className="pd-section-head pd-center">
            <div className="pd-eyebrow">Straight answer</div>
            <h2 className="pd-display">What PawDue does, and what it does not</h2>
          </div>
          <div className="pd-feature-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", maxWidth: 820, margin: "0 auto" }}>
            <div className="pd-feature-card">
              <h3>PawDue does</h3>
              <ul className="pd-problem-list">
                <li>Tracks when every dog is due, from its breed or your own weeks</li>
                <li>Emails owners a reminder with a booking link, every morning at your local time</li>
                <li>Lets owners pick from the open times you set</li>
                <li>Imports and exports your client list as CSV</li>
                <li>Gives you a calendar feed of your bookings</li>
              </ul>
            </div>
            <div className="pd-feature-card">
              <h3>PawDue does not (yet)</h3>
              <ul className="pd-problem-list">
                <li>Take payments or send invoices</li>
                <li>Replace your full salon or POS software</li>
                <li>Have separate staff logins</li>
                <li>Send WhatsApp or SMS yet: reminders go by email for now</li>
                <li>Come as a phone app: it runs in your browser</li>
              </ul>
            </div>
          </div>
        </div>

        {/* ---------- FAQ: objection handling right before the final ask. ---------- */}
        <div className="pd-band pd-band-tint">
          <div className="pd-section-head pd-center">
            <div className="pd-eyebrow">Questions</div>
            <h2 className="pd-display">Before you start</h2>
          </div>
          <Faq items={FAQ_ITEMS} />
        </div>

        {/* ---------- Final CTA ---------- */}
        <div className="pd-band">
          <div className="pd-final">
            <h2 className="pd-display">Stop chasing rebookings by memory.</h2>
            <p>Free to start. No credit card.</p>
            <div className="pd-cta-row" style={{ justifyContent: "center" }}>
              <Link className="pd-btn pd-btn-primary" href="/register">Create your account</Link>
              <Link className="pd-btn pd-btn-ghost" href="/login">Log in</Link>
            </div>
            <p className="pd-final-reassure">Cancel anytime. No contracts, no setup fees.</p>
          </div>
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
