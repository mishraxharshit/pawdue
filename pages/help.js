import MarketingNav from "../components/MarketingNav";
import SiteFooter from "../components/SiteFooter";
import Faq from "../components/Faq";

const TOPICS = [
  { icon: "🐾", title: "Adding your first dog", body: "Log a dog's name, breed, owner contact, and last groom date to start tracking it." },
  { icon: "💬", title: "How reminders send", body: "A daily job emails every dog's owner automatically. WhatsApp and SMS are optional backup channels you can connect any time." },
  { icon: "📅", title: "Changing a due date", body: "Open a dog's record from your dashboard to adjust its interval or last-groom date any time." },
  { icon: "🔗", title: "The booking link", body: "Every reminder includes a link the owner can use to request a rebooking slot directly." },
  { icon: "💳", title: "Plans & billing", body: "See what's included on each plan and manage your subscription from the dashboard." },
  { icon: "🔒", title: "Your data", body: "Read how dog and owner information is stored and used in the privacy policy." },
];

const FAQ_ITEMS = [
  {
    q: "A reminder didn't go out — what happened?",
    a: "PawDue sends by email first — it needs no approval and works immediately. WhatsApp and SMS are optional backups you can connect any time; once added, they're used automatically if email fails. Check your dashboard for a delivery note on any dog, or reach out via the feedback page.",
  },
  {
    q: "Can I add a dog manually with a custom interval instead of the breed default?",
    a: "Yes — when adding or editing a dog you can set your own interval in weeks instead of using the breed's typical default.",
  },
  {
    q: "How do I stop reminders for one dog without deleting it?",
    a: "Use the opt-out option on that dog's record — it keeps the dog's history but stops future reminders from going out.",
  },
  {
    q: "I found a bug or have a feature request — where does it go?",
    a: "The feedback page goes straight to the team and is the fastest way to report something or suggest an improvement.",
  },
];

export default function Help() {
  return (
    <div className="pd-landing">
      <div className="pd-shell">
        <MarketingNav />

        <div className="pd-band" style={{ paddingBottom: 10 }}>
          <div className="pd-section-head pd-center">
            <div className="pd-eyebrow">Help center</div>
            <h1 className="pd-display">How can we help?</h1>
            <p>Common questions about setting up PawDue and keeping reminders running.</p>
          </div>

          <div className="pd-help-grid">
            {TOPICS.map((t) => (
              <div className="pd-help-card" key={t.title}>
                <div className="pd-icon-badge teal" style={{ width: 40, height: 40, fontSize: "1.1rem" }}>{t.icon}</div>
                <h3>{t.title}</h3>
                <p>{t.body}</p>
              </div>
            ))}
          </div>

          <Faq items={FAQ_ITEMS} />

          <p className="sub" style={{ textAlign: "center", marginTop: 30 }}>
            Still stuck? <a className="link" href="/feedback">Send us a message</a> and we'll get back to you.
          </p>
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
