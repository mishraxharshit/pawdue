import { useMemo, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import SiteFooter from "../components/SiteFooter";
import Faq from "../components/Faq";
import Reveal from "../components/Reveal";
import LandingNav from "../components/landing/LandingNav";
import { LAPSED_AFTER_DAYS } from "../lib/reminderPlan";
import s from "../styles/landing.module.css";

const TOPICS = [
  { title: "Adding your first dog", body: "Log the dog's name, breed, owner contact and last groom date. PawDue starts it on a typical cycle for its breed. Have a list already? Import it as a CSV from the dashboard." },
  { title: "How reminders are sent", body: "Every morning at your local time, PawDue emails the owner of each dog that is due, with a link to book. There are at most three reminders per cycle, and they stop as soon as the owner books." },
  { title: "Changing a due date", body: "Open a dog from your dashboard and change its interval in weeks or its last groom date at any time." },
  { title: "The booking link", body: "Every reminder has a link where the owner picks one of the open times you set in your availability settings. The booking then shows up on your dashboard." },
  { title: "Lapsed clients and the Message button", body: `A dog that is more than ${LAPSED_AFTER_DAYS} days overdue moves to your Lapsed list and stops getting automatic emails. The Message button opens WhatsApp with a note already written. You send it yourself, from your own number.` },
  { title: "Plans and billing", body: "See what each plan includes on the pricing page, and manage your subscription from the dashboard.", href: "/pricing", cta: "See pricing" },
];

const FAQ_ITEMS = [
  {
    q: "A reminder did not go out. What happened?",
    a: `A few normal reasons: the owner already booked, three reminders were already sent for this cycle, the dog is more than ${LAPSED_AFTER_DAYS} days overdue (it is on your Lapsed list instead), the owner has no email on file, or the owner opted out. Check the dog's record on your dashboard for a delivery note. If none of these fit, send us a message from the feedback page.`,
  },
  {
    q: "Why does the Message button say the phone number is missing?",
    a: "The button needs the owner's number with the country code, for example +1 and then the number. Open the dog, add the number in that format, and the button will open WhatsApp.",
  },
  {
    q: "Can I use my own interval instead of the breed default?",
    a: "Yes. When adding or editing a dog, set your own number of weeks and it replaces the breed's typical default.",
  },
  {
    q: "How do I stop reminders for one dog without deleting it?",
    a: "Use the opt-out option on that dog's record. It keeps the dog's history but stops future reminders.",
  },
  {
    q: "Does PawDue send WhatsApp or SMS automatically?",
    a: "Not yet. Reminders go out by email. For owners you would rather text, the Message button opens WhatsApp with your note ready, and you tap send.",
  },
  {
    q: "I found a bug or have a feature request. Where does it go?",
    a: "The feedback page goes straight to the founder and is the fastest way to report something or suggest an improvement.",
  },
];

export default function Help() {
  const [q, setQ] = useState("");
  const term = q.trim().toLowerCase();

  const topics = useMemo(
    () => (term ? TOPICS.filter((t) => (t.title + " " + t.body).toLowerCase().includes(term)) : TOPICS),
    [term]
  );
  const faqs = useMemo(
    () => (term ? FAQ_ITEMS.filter((f) => (f.q + " " + f.a).toLowerCase().includes(term)) : FAQ_ITEMS),
    [term]
  );

  return (
    <div className={s.page}>
      <Head>
        <title>Help | PawDue</title>
        <meta name="description" content="Answers about adding dogs, how reminders are sent, the booking link, lapsed clients and billing." />
        <link rel="canonical" href="https://pawdue.pet/help" />
      </Head>
      <LandingNav />

      <main className={s.pbody}>
        <div className={s.wrap}>
          <section className={s.phead}>
            <span className={s.eyebrow}>Help center</span>
            <h1 className={s.h1s}>How can we <em>help?</em></h1>
            <p className={s.lead}>Quick answers about setting up PawDue and keeping reminders running.</p>
            <label className={s.search}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
              <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search, for example: reminder, booking, WhatsApp" aria-label="Search help" />
            </label>
          </section>

          {topics.length > 0 && (
            <div className={s.topics}>
              {topics.map((t, i) => (
                <Reveal className={s.topic} key={t.title} delay={(i % 3) * 80}>
                  <div className={s.topicNum}>{i + 1}</div>
                  <h3>{t.title}</h3>
                  <p>{t.body}</p>
                  {t.href && <p style={{ marginTop: 12 }}><Link href={t.href}>{t.cta} &rarr;</Link></p>}
                </Reveal>
              ))}
            </div>
          )}

          {faqs.length > 0 && (
            <div className={s.faqWrap}>
              <div className={s.center}>
                <div className={s.kicker}>Common questions</div>
                <h2 className={s.h2}>Quick answers</h2>
              </div>
              <div className="pd-landing" style={{ background: "transparent", marginTop: 32, fontFamily: "inherit" }}>
                <Faq key={term} items={faqs} />
              </div>
            </div>
          )}

          {topics.length === 0 && faqs.length === 0 && (
            <p className={s.empty}>Nothing matches &quot;{q}&quot;. Try a shorter word, or write to us below.</p>
          )}

          <div className={s.contact}>
            <h3>Still stuck? Write to us.</h3>
            <p>Your message goes straight to the founder, and every one gets read.</p>
            <div className={s.ctaRow}>
              <Link className={`${s.pill} ${s.pillBrass}`} href="/feedback">Send a message</Link>
            </div>
          </div>
        </div>
      </main>

      <div className="pd-landing" style={{ fontFamily: "inherit" }}><SiteFooter /></div>
    </div>
  );
}
