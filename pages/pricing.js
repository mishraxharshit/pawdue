import { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { createSupabaseServerClient } from "../lib/supabase/server";
import MarketingNav from "../components/MarketingNav";
import SiteFooter from "../components/SiteFooter";
import Faq from "../components/Faq";
import { IconCheck } from "../components/icons";

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
    a: "No. The Free plan covers up to 10 dogs with no card required. Add a card only when you upgrade to Starter or Pro.",
  },
  {
    q: "What happens if I go over my dog limit?",
    a: "You'll get a heads-up in your dashboard before you hit the ceiling, and existing dogs keep getting reminders either way — you just won't be able to add new ones until you upgrade or remove one.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. Cancel from your dashboard whenever you like — there's no long-term contract, and you keep access until the end of the billing period you already paid for.",
  },
  {
    q: "Which reminder channels are included?",
    a: "Every plan sends by email today, since that works instantly with no approval wait. WhatsApp and SMS are optional backup channels you can connect any time — once added, they slot into the send order automatically. No per-message fees on any plan.",
  },
];

export default function Pricing({ isLoggedIn }) {
  const router = useRouter();
  const [loadingPlan, setLoadingPlan] = useState(null);
  const [error, setError] = useState("");

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
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not start checkout");
      window.location.href = data.url;
    } catch (err) {
      setError(err.message);
      setLoadingPlan(null);
    }
  }

  return (
    <div className="pd-landing">
      <div className="pd-shell">
        <MarketingNav isLoggedIn={isLoggedIn} />

        <div className="pd-band" style={{ paddingBottom: 10 }}>
          <div className="pd-section-head pd-center">
            <div className="pd-eyebrow">Pricing</div>
            <h1 className="pd-display">Simple, per-dog pricing</h1>
            <p>Start free, upgrade only once the client list actually grows. Cancel anytime.</p>
          </div>

          <div className="pd-trust-strip pd-center">
            <span className="pd-trust-item"><IconCheck width={16} height={16} /> Email reminders on every plan</span>
            <span className="pd-trust-item"><IconCheck width={16} height={16} /> Owner self-booking link included</span>
            <span className="pd-trust-item"><IconCheck width={16} height={16} /> No card required to start</span>
          </div>

          {error && (
            <div className="error" style={{ maxWidth: 480, margin: "0 auto 20px", textAlign: "center" }}>
              {error}
            </div>
          )}

          <div className="pd-price-grid">
            <div className="pd-price-card">
              <div className="pd-price-name">Free</div>
              <div className="pd-price-amount">$0</div>
              <p className="pd-price-sub">Try it with a handful of clients.</p>
              <ul className="pd-price-feats">
                <li>Up to 10 dogs</li>
                <li>Email reminders (WhatsApp/SMS optional)</li>
                <li>Daily automatic sends</li>
                <li>Owner self-booking link</li>
              </ul>
              <Link className="pd-btn pd-btn-ghost" href="/register">
                {isLoggedIn ? "Your current plan" : "Start free"}
              </Link>
            </div>

            <div className="pd-price-card pd-price-highlight">
              <div className="pd-price-ribbon">Most popular</div>
              <div className="pd-price-name">Starter</div>
              <div className="pd-price-amount">$29 <span>/mo</span></div>
              <p className="pd-price-sub">For most solo groomers.</p>
              <ul className="pd-price-feats">
                <li>Up to 75 dogs</li>
                <li>Email reminders (WhatsApp/SMS optional)</li>
                <li>Daily automatic sends</li>
                <li>Owner self-booking link</li>
                <li>Priority message delivery</li>
              </ul>
              <button className="pd-btn pd-btn-primary" onClick={() => handleChoosePlan("starter")} disabled={loadingPlan === "starter"}>
                {loadingPlan === "starter" ? "Redirecting…" : "Choose Starter"}
              </button>
            </div>

            <div className="pd-price-card">
              <div className="pd-price-name">Pro</div>
              <div className="pd-price-amount">$49 <span>/mo</span></div>
              <p className="pd-price-sub">For busy or multi-location groomers.</p>
              <ul className="pd-price-feats">
                <li>Unlimited dogs</li>
                <li>Email reminders (WhatsApp/SMS optional)</li>
                <li>Daily automatic sends</li>
                <li>Owner self-booking link</li>
                <li>Priority message delivery</li>
                <li>Custom reminder timing (soon)</li>
              </ul>
              <button className="pd-btn pd-btn-ghost" onClick={() => handleChoosePlan("pro")} disabled={loadingPlan === "pro"}>
                {loadingPlan === "pro" ? "Redirecting…" : "Choose Pro"}
              </button>
            </div>
          </div>

          <p className="sub" style={{ marginTop: 20, textAlign: "center" }}>
            Prices in USD. Cancel anytime from your dashboard — no long-term contract.
          </p>
        </div>

        {/* ---------- Feature-by-feature breakdown ----------
            Replaces three overlapping bullet lists with one table, so the
            actual differences between plans (dog limit, delivery priority)
            are easy to scan instead of re-reading near-identical lists. */}
        <div className="pd-band">
          <div className="pd-section-head pd-center">
            <div className="pd-eyebrow">Compare plans</div>
            <h2 className="pd-display">What each plan actually unlocks</h2>
          </div>
          <div className="pd-price-compare">
            <div className="pd-pc-row pd-pc-head">
              <div>Feature</div>
              <div>Free</div>
              <div>Starter</div>
              <div>Pro</div>
            </div>
            <div className="pd-pc-row">
              <div>Dogs tracked</div>
              <div>Up to 10</div>
              <div>Up to 75</div>
              <div>Unlimited</div>
            </div>
            <div className="pd-pc-row">
              <div>Email reminders (WhatsApp/SMS optional)</div>
              <div>✓</div>
              <div>✓</div>
              <div>✓</div>
            </div>
            <div className="pd-pc-row">
              <div>Owner self-booking link</div>
              <div>✓</div>
              <div>✓</div>
              <div>✓</div>
            </div>
            <div className="pd-pc-row">
              <div>Daily automatic sends</div>
              <div>✓</div>
              <div>✓</div>
              <div>✓</div>
            </div>
            <div className="pd-pc-row">
              <div>Priority message delivery</div>
              <div>—</div>
              <div>✓</div>
              <div>✓</div>
            </div>
            <div className="pd-pc-row">
              <div>Custom reminder timing</div>
              <div>—</div>
              <div>—</div>
              <div>Coming soon</div>
            </div>
          </div>
        </div>

        {/* ---------- FAQ ---------- */}
        <div className="pd-band">
          <div className="pd-section-head pd-center">
            <div className="pd-eyebrow">Questions</div>
            <h2 className="pd-display">Pricing FAQ</h2>
          </div>
          <Faq items={FAQ_ITEMS} />
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
