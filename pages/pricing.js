import { useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import Link from "next/link";
import { createSupabaseServerClient } from "../lib/supabase/server";
import SiteFooter from "../components/SiteFooter";
import Faq from "../components/Faq";
import Reveal from "../components/Reveal";
import LandingNav from "../components/landing/LandingNav";
import { PLANS } from "../lib/plans";
import s from "../styles/landing.module.css";

export async function getServerSideProps({ req, res }) {
  const supabase = createSupabaseServerClient(req, res);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { props: { isLoggedIn: !!user } };
}

const FAQ_ITEMS = [
  {
    q: "Do I need a credit card to start free?",
    a: `No. The Free plan covers up to ${PLANS.free.limit} dogs with no card required. Add a card only when you upgrade to Starter or Pro.`,
  },
  {
    q: "What happens if I go over my dog limit?",
    a: "Your dashboard shows how many dogs you have used. Existing dogs keep getting reminders either way. You just will not be able to add new ones until you upgrade or archive one.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. Cancel from your dashboard whenever you like. There is no long-term contract, and you keep access until the end of the billing period you already paid for.",
  },
  {
    q: "Which reminder channels are included?",
    a: "Every plan sends by email, with no per-message charge. The Message button opens WhatsApp with your note already written, and you send it from your own number. Automatic WhatsApp and SMS are not switched on yet, and we will tell you before anything about pricing changes.",
  },
  {
    q: "What is priority delivery?",
    a: "On busy mornings, reminders for dogs on Starter and Pro accounts are sent first. It does not change what is sent, only the order.",
  },
];

function Row({ label, free, starter, pro }) {
  const cell = (v) => (v === true ? <span className={s.yes}>&#10003;</span> : v === false ? <span className={s.no}>&ndash;</span> : v);
  return (
    <div className={s.tr}>
      <div>{label}</div>
      <div>{cell(free)}</div>
      <div>{cell(starter)}</div>
      <div>{cell(pro)}</div>
    </div>
  );
}

export default function Pricing({ isLoggedIn }) {
  const router = useRouter();
  const [loadingPlan, setLoadingPlan] = useState(null);
  const [error, setError] = useState("");
  const [dogs, setDogs] = useState(45);

  const n = Math.max(0, Math.min(100000, Number(dogs) || 0));
  const rec = n <= PLANS.free.limit ? PLANS.free : n <= PLANS.starter.limit ? PLANS.starter : PLANS.pro;

  async function handleChoosePlan(plan) {
    if (!isLoggedIn) {
      router.push("/register");
      return;
    }
    setError("");
    setLoadingPlan(plan);
    try {
      const res = await fetch("/api/dodo/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      let data = {};
      try {
        data = await res.json();
      } catch (_) {
        throw new Error(`Could not start checkout (server error ${res.status}). Check the Vercel logs.`);
      }
      if (!res.ok) throw new Error(data.error || "Could not start checkout");
      window.location.href = data.url;
    } catch (err) {
      setError(err.message);
      setLoadingPlan(null);
    }
  }

  return (
    <div className={s.page}>
      <Head>
        <title>Pricing | PawDue</title>
        <meta name="description" content={`Start free for up to ${PLANS.free.limit} dogs. Starter ${PLANS.starter.priceLabel}, Pro ${PLANS.pro.priceLabel}. Cancel anytime.`} />
        <link rel="canonical" href="https://pawdue.pet/pricing" />
      </Head>
      <LandingNav isLoggedIn={isLoggedIn} />

      <main className={s.pbody}>
        <div className={s.wrap}>
          <section className={s.phead}>
            <span className={s.eyebrow}>Pricing</span>
            <h1 className={s.h1s}>Start free. <em>Pay only when your book grows.</em></h1>
            <p className={s.lead}>Priced by how many dogs you track, not by seats or messages. Cancel anytime.</p>
            <div className={s.checks}>
              <span>Email reminders on every plan</span>
              <span>Owner booking link included</span>
              <span>No card to start</span>
            </div>
          </section>

          {error && <div className={s.errBox}>{error}</div>}

          <div className={s.pgrid}>
            <Reveal className={s.pcard}>
              <div className={s.pname}>{PLANS.free.name}</div>
              <div className={s.pamount}>{PLANS.free.priceLabel}</div>
              <p className={s.psub}>Try it with your regulars. Nothing is locked.</p>
              <ul className={s.pfeats}>
                <li>Up to {PLANS.free.limit} dogs</li>
                <li>Up to 3 email reminders per cycle</li>
                <li>Sent every morning in your timezone</li>
                <li>Owner self-booking link</li>
                <li>Lapsed list and WhatsApp Message button</li>
                <li>CSV import and export</li>
                <li>Calendar feed for your bookings</li>
              </ul>
              <Link className={`${s.pill} ${s.pillGhost}`} href={isLoggedIn ? "/dashboard" : "/register"}>
                {isLoggedIn ? "Go to dashboard" : "Start free"}
              </Link>
            </Reveal>

            <Reveal className={`${s.pcard} ${s.pcardHot}`} delay={100}>
              <div className={s.pribbon}>Most popular</div>
              <div className={s.pname}>{PLANS.starter.name}</div>
              <div className={s.pamount}>{PLANS.starter.priceLabel.replace("/mo", "")}<small> /mo</small></div>
              <p className={s.psub}>For most solo groomers and small shops.</p>
              <ul className={s.pfeats}>
                <li>Up to {PLANS.starter.limit} dogs</li>
                <li>Everything in Free</li>
                <li>Priority delivery on busy mornings</li>
              </ul>
              <button className={`${s.pill} ${s.pillMain}`} onClick={() => handleChoosePlan("starter")} disabled={loadingPlan === "starter"}>
                {loadingPlan === "starter" ? "Redirecting..." : "Choose Starter"}
              </button>
            </Reveal>

            <Reveal className={s.pcard} delay={200}>
              <div className={s.pname}>{PLANS.pro.name}</div>
              <div className={s.pamount}>{PLANS.pro.priceLabel.replace("/mo", "")}<small> /mo</small></div>
              <p className={s.psub}>For busy salons with a big client list.</p>
              <ul className={s.pfeats}>
                <li>Unlimited dogs</li>
                <li>Everything in Starter</li>
              </ul>
              <button className={`${s.pill} ${s.pillGhost}`} onClick={() => handleChoosePlan("pro")} disabled={loadingPlan === "pro"}>
                {loadingPlan === "pro" ? "Redirecting..." : "Choose Pro"}
              </button>
            </Reveal>
          </div>
          <p className={s.pnote}>Prices in USD. Cancel anytime from your dashboard. No long-term contract.</p>

          <Reveal className={s.pick}>
            <div>
              <h3>Not sure which plan?</h3>
              <p>Tell us roughly how many dogs you see in a year.</p>
              <div className={s.field} style={{ marginTop: 16 }}>
                <input type="number" inputMode="numeric" min="0" value={dogs} onChange={(e) => setDogs(e.target.value)} aria-label="Number of dogs" />
              </div>
            </div>
            <div className={s.pickOut} aria-live="polite">
              <span style={{ marginTop: 0 }}>For {n.toLocaleString("en-US")} dogs, you fit on</span>
              <b>{rec.name} ({rec.priceLabel})</b>
              <span>
                {rec.id === "free" ? "No card needed. Start today." : rec.id === "starter" ? `Covers up to ${PLANS.starter.limit} dogs.` : "Unlimited dogs, so you never think about a limit."}
              </span>
            </div>
          </Reveal>
        </div>

        <section style={{ padding: "100px 0 0" }}>
          <div className={s.wrap}>
            <div className={s.center}>
              <div className={s.kicker}>Compare plans</div>
              <h2 className={s.h2}>What each plan actually unlocks</h2>
            </div>
            <div className={s.tbl}>
              <div className={`${s.tr} ${s.trHead}`}>
                <div>Feature</div><div>Free</div><div>Starter</div><div>Pro</div>
              </div>
              <Row label="Dogs tracked" free={`Up to ${PLANS.free.limit}`} starter={`Up to ${PLANS.starter.limit}`} pro="Unlimited" />
              <Row label="Email reminders (up to 3 per cycle)" free starter pro />
              <Row label="Owner self-booking link" free starter pro />
              <Row label="Lapsed list and WhatsApp Message button" free starter pro />
              <Row label="Sent every morning in your timezone" free starter pro />
              <Row label="CSV import and export" free starter pro />
              <Row label="Calendar feed for bookings" free starter pro />
              <Row label="Priority delivery on busy mornings" free={false} starter pro />
            </div>
          </div>
        </section>

        <section>
          <div className={s.wrap}>
            <div className={s.faqWrap}>
              <div className={s.center}>
                <div className={s.kicker}>Questions</div>
                <h2 className={s.h2}>Pricing FAQ</h2>
              </div>
              <div className="pd-landing" style={{ background: "transparent", marginTop: 32, fontFamily: "inherit" }}>
                <Faq items={FAQ_ITEMS} />
              </div>
            </div>
          </div>
        </section>
      </main>

      <div className="pd-landing" style={{ fontFamily: "inherit" }}><SiteFooter /></div>
    </div>
  );
}
