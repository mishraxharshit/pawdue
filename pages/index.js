import Link from "next/link";
import { createSupabaseServerClient } from "../lib/supabase/server";
import MarketingNav from "../components/MarketingNav";
import SiteFooter from "../components/SiteFooter";
import DueDateCalculator from "../components/DueDateCalculator";
import ComparisonTable from "../components/ComparisonTable";
import HeroPreview from "../components/HeroPreview";
import Testimonials from "../components/Testimonials";
import Faq from "../components/Faq";
import { IconCheck, IconCalendar, IconMessage, IconInbox, IconLink, IconEnvelope } from "../components/icons";

const FEATURES = [
  {
    icon: IconMessage,
    tone: "coral",
    title: "Reminders that always arrive",
    body: "Sends by email today, with WhatsApp and SMS as automatic backups the moment they're connected. Zero manual follow-up either way.",
  },
  {
    icon: IconLink,
    tone: "sky",
    title: "Owners rebook without calling you",
    body: "Every reminder includes a booking link. The owner picks a slot, it lands straight on your dashboard.",
  },
  {
    icon: IconCalendar,
    tone: "teal",
    title: "Breed-aware due dates",
    body: "Every dog gets its own clock based on its actual coat and breed cycle, not a flat \u201c6 weeks for everyone\u201d guess.",
  },
  {
    icon: IconInbox,
    tone: "yellow",
    title: "One list, every client",
    body: "Search, filter, and group by status so you can see who's overdue without scrolling a spreadsheet.",
  },
];

const FAQ_ITEMS = [
  {
    q: "Do I need a credit card to start?",
    a: "No. The free plan covers up to 10 dogs with no card on file. You only add billing details if you upgrade.",
  },
  {
    q: "Does this cost extra per message?",
    a: "No per-message fees on any plan - reminders are included. Email is the primary channel, with WhatsApp and SMS as automatic backups once those are connected.",
  },
  {
    q: "Can I bring in my existing client list?",
    a: "Yes - add dogs one at a time from the dashboard, or import a spreadsheet if you're moving a larger book of clients. We can help with the import if you get stuck.",
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
            <h1 className="pd-display">Stop losing rebookings because nobody remembered to ask.</h1>
            <p>
              PawDue tracks every dog&apos;s breed-specific grooming cycle and messages
              the owner the moment they&apos;re due for a rebook &mdash; automatically,
              by email, with WhatsApp and SMS as automatic backups.
            </p>
            <div className="pd-cta-row">
              <Link className="pd-btn pd-btn-primary" href="/register">Start free</Link>
              <Link className="pd-btn pd-btn-ghost" href="/pricing">See pricing</Link>
            </div>
            <div className="pd-trust-strip">
              <span className="pd-trust-item"><IconCheck width={16} height={16} /> Free for up to 10 dogs</span>
              <span className="pd-trust-item"><IconCheck width={16} height={16} /> No credit card</span>
              <span className="pd-trust-item"><IconCheck width={16} height={16} /> 2-minute setup</span>
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
            Built for solo groomers, mobile vans, and multi-chair salons who are done tracking rebookings by memory.
          </p>
        </div>
      </div>

      <div className="pd-shell">
        {/* ---------- Features ---------- */}
        <div className="pd-band">
          <div className="pd-section-head pd-center">
            <div className="pd-eyebrow">What it does</div>
            <h2 className="pd-display">Everything after &ldquo;log the groom&rdquo; happens on its own</h2>
          </div>
          <div className="pd-feature-grid">
            {FEATURES.map((f) => (
              <div className="pd-feature-card" key={f.title}>
                <div className={`pd-icon-badge ${f.tone}`}><f.icon width={22} height={22} /></div>
                <h3>{f.title}</h3>
                <p>{f.body}</p>
              </div>
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
              <div className="pd-flow-sub">Optional backup</div>
            </div>
            <div className="pd-flow-arrow">&rarr;</div>
            <div className="pd-flow-step">
              <div className="pd-flow-icon"><IconMessage width={22} height={22} /></div>
              <div className="pd-flow-label">SMS</div>
              <div className="pd-flow-sub">Optional backup</div>
            </div>
          </div>
          <p className="pd-flow-caption">
            Email works out of the box, no approval wait. Connect WhatsApp or SMS whenever
            you&apos;re ready and they slot in automatically &mdash; on every plan.
          </p>
        </div>

        {/* ---------- Proof, right after the features: watch the actual
            product logic run instead of reading more claims. ---------- */}
        <div className="pd-band pd-band-tint">
          <div className="pd-section-head pd-center">
            <div className="pd-eyebrow">See it work</div>
            <h2 className="pd-display">A real due date, calculated right now</h2>
            <p>Pick a breed and a last-groom date &mdash; this is the exact math PawDue runs for every dog, every day.</p>
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
              <p>That breed&apos;s typical coat cycle becomes this dog&apos;s personal due date, or set your own.</p>
            </div>
            <div className="pd-step-card">
              <div className="pd-step-num">3</div>
              <h3>The reminder sends itself</h3>
              <p>Sent by email automatically, with a booking link so the owner can rebook on the spot. WhatsApp/SMS optional.</p>
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
            <Link className="pd-btn pd-btn-primary" href="/register">Start free &mdash; takes 2 minutes</Link>
            <p className="pd-midcta-note">Up to 10 dogs on the house. No card required.</p>
          </div>
        </div>

        {/* ---------- Social proof ---------- */}
        <div className="pd-band">
          <div className="pd-section-head pd-center">
            <div className="pd-eyebrow">From groomers</div>
            <h2 className="pd-display">What changes day to day</h2>
          </div>
          <Testimonials />
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
