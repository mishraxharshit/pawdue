import { useState } from "react";
import Link from "next/link";
import ToolLayout from "../../components/tools/ToolLayout";
import { TOOL_CURRENCIES, symbolFor, lapsedValue } from "../../lib/tools";
import t from "../../styles/tools.module.css";

const FAQ = [
  {
    q: "What counts as a lapsed grooming client?",
    a: "A regular who is well past their usual rebooking time and has not booked. A simple rule many groomers use is no visit for three months or more from a dog that normally comes every four to eight weeks. Use whatever rule fits your own clients.",
  },
  {
    q: "Is this an industry average?",
    a: "No. The calculator only multiplies the numbers you type: how many regulars have gone quiet, how often they normally come and what a groom costs you. It does not use industry statistics, and the win-back slider is a what-if you choose, not a prediction.",
  },
  {
    q: "How do I count my lapsed regulars?",
    a: "Open your booking history or client list and look for dogs whose last visit was more than three months ago, but who used to come regularly. Count the dogs, not the visits. If you do not keep a list, a simple spreadsheet with the dog, owner, last groom date and usual interval is enough to start.",
  },
  {
    q: "What is the best way to win lapsed clients back?",
    a: "A short, warm and personal message works better than a sales message. Mention the dog by name, say you have openings and make rebooking one tap. The guide on rebooking reminder messages has eight examples you can copy.",
  },
  {
    q: "Why do regular grooming clients stop booking?",
    a: "Usually not because of your work. They forget, life gets busy, or nobody asked them to rebook. That is why a reminder sent before the dog is overdue, and rebooking before the owner leaves, make such a difference.",
  },
];

const RELATED = [
  { href: "/blog/grooming-rebooking-reminder-message-examples", kind: "Guide", title: "8 rebooking messages to copy", text: "Short texts and emails you can send to quiet clients today." },
  { href: "/blog/why-grooming-clients-drift-away", kind: "Guide", title: "Why clients drift away", text: "The real reasons regulars disappear and six simple fixes." },
  { href: "/tools/grooming-price-calculator", kind: "Free tool", title: "Grooming price calculator", text: "Work out the lowest price that still pays you properly." },
];

export default function LapsedClientCalculator() {
  const [cur, setCur] = useState("USD");
  const [lapsed, setLapsed] = useState(15);
  const [weeks, setWeeks] = useState(6);
  const [price, setPrice] = useState(60);
  const [pct, setPct] = useState(25);
  const [copied, setCopied] = useState(false);

  const sym = symbolFor(cur);
  const money = (n) => `${sym}${Math.round(n).toLocaleString("en-US")}`;
  const r = lapsedValue({ lapsed, weeks, price, winBackPct: pct });

  const summary = `${r.lapsed} lapsed regulars are worth about ${money(r.yearly)} a year (${money(r.monthly)} a month) in repeat grooming income. Winning back ${r.winBackCount} of them would be about ${money(r.winBackYearly)} a year. Worked out with the free PawDue lapsed client calculator: https://pawdue.pet/tools/lapsed-client-calculator`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(summary);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  return (
    <ToolLayout
      path="/tools/lapsed-client-calculator"
      title="Lapsed Client Calculator for Dog Groomers"
      description="Free calculator: see how much income your lapsed grooming regulars are worth each year, and what winning some of them back could mean. Uses only your own numbers."
      h1="Lapsed Client Calculator for Dog Groomers"
      intro="Regulars who quietly stopped booking are income that was already yours. See what they are worth, using your own numbers."
      faq={FAQ}
      related={RELATED}
      about={
        <>
          <h2>How to use it</h2>
          <ol>
            <li>Count the regulars who used to come often but have not been in for three months or more.</li>
            <li>Enter how often they normally come, in weeks. Six is a common starting point for many coats, but use your own.</li>
            <li>Enter your average price per groom, then play with the what-if slider.</li>
          </ol>
          <h2>What the number means</h2>
          <p>
            A regular who comes every six weeks books about eight or nine times a year. If your average groom is {money(price)}, one regular is worth roughly {money(r.perDogYear)} a year. Multiply by everyone who drifted away and the total is usually bigger than people expect, which is why a weekly check of who has gone quiet is worth ten minutes. There is a simple routine in the guide on <Link href="/blog/weekly-routine-to-track-lapsed-grooming-clients">tracking lapsed grooming clients</Link>.
          </p>
        </>
      }
    >
      <div className={t.tool}>
        <div className={t.panel}>
          <label>
            <span>Currency</span>
            <div className={t.field}>
              <select value={cur} onChange={(e) => setCur(e.target.value)} aria-label="Currency">
                {TOOL_CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
              </select>
            </div>
          </label>
          <label>
            <span>Regulars who have gone quiet (3+ months)</span>
            <div className={t.field}><input type="number" inputMode="numeric" min="0" value={lapsed} onChange={(e) => setLapsed(e.target.value)} /></div>
            <small>Count dogs, not visits. Check your last-groom dates.</small>
          </label>
          <label>
            <span>They normally come every (weeks)</span>
            <div className={t.field}><input type="number" inputMode="numeric" min="1" max="52" value={weeks} onChange={(e) => setWeeks(e.target.value)} /></div>
          </label>
          <label>
            <span>Your average groom costs</span>
            <div className={t.field}><b>{sym}</b><input type="number" inputMode="decimal" min="0" value={price} onChange={(e) => setPrice(e.target.value)} /></div>
          </label>
          <label>
            <span>What if you won back {pct}% of them?</span>
            <input className={t.range} type="range" min="0" max="100" step="5" value={pct} onChange={(e) => setPct(e.target.value)} aria-label="Share you win back" />
            <div className={t.rangeRow}><span>0%</span><span>100%</span></div>
            <small>Your own what-if, not a prediction.</small>
          </label>
        </div>

        <div className={t.out} aria-live="polite">
          <div className={t.small}>One regular dog is worth about</div>
          <div className={t.big} translate="no">{money(r.perDogYear)}<small> a year</small></div>
          <hr className={t.sep} />
          <div className={t.small}>{r.lapsed} lapsed regulars are worth about</div>
          <div className={t.big} translate="no">{money(r.yearly)}<small> a year</small></div>
          <div className={t.line} translate="no">That is about <b>{money(r.monthly)}</b> every month of repeat income sitting unbooked.</div>
          <hr className={t.sep} />
          <div className={t.line} translate="no">
            Winning back <b>{r.winBackCount}</b> {r.winBackCount === 1 ? "dog" : "dogs"} would bring about <b>{money(r.winBackYearly)}</b> a year.
          </div>
          <p className={t.note}>Only your own numbers, multiplied. No industry averages and no promised results.</p>
          <div className={t.actions}>
            <button className={t.btn} onClick={copy}>{copied ? "Copied" : "Copy my result"}</button>
            <Link href="/register" className={`${t.btn} ${t.btnGhost}`}>Track them free</Link>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
