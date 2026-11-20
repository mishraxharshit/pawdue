import { useState } from "react";
import Link from "next/link";
import ToolLayout from "../../components/tools/ToolLayout";
import { TOOL_CURRENCIES, symbolFor, minimumPrice } from "../../lib/tools";
import t from "../../styles/tools.module.css";

const FAQ = [
  {
    q: "How much should I charge for a dog groom?",
    a: "It depends on how long the groom takes, what you want to earn per hour, your costs and what is normal where you work. This calculator gives you your floor: the lowest price that pays you, your supplies, your overheads and card fees. Check what other local groomers charge, then price above your floor.",
  },
  {
    q: "Should I price by time or by dog size?",
    a: "Most groomers price by size and coat as a simple menu, but they check that each price still covers the time it really takes. Work out the floor for a small, medium and large groom separately using the hours each one takes, then set a price for each size.",
  },
  {
    q: "What counts as overhead?",
    a: "Costs you pay whether or not a dog is on the table: rent or van costs, insurance, software, phone, tools being replaced, marketing and admin time. Add them up for a month and enter the total.",
  },
  {
    q: "Why include card fees?",
    a: "Card payments cost a small percentage of every sale. Because the fee comes out of what the client pays, the price needs to be a little higher to leave you the amount you actually need. Use your own processor's rate.",
  },
  {
    q: "Is this a price recommendation?",
    a: "No. It is a calculator using your numbers. It does not know your area, your skill or your competitors, so treat the result as a minimum and decide the final price yourself.",
  },
];

const RELATED = [
  { href: "/blog/dog-grooming-price-list-template", kind: "Guide", title: "Dog grooming price list template", text: "How to lay out your prices by size, add-ons and starting prices." },
  { href: "/tools/lapsed-client-calculator", kind: "Free tool", title: "Lapsed client calculator", text: "What your quiet regulars are worth each year." },
  { href: "/blog/dog-grooming-cancellation-policy-template", kind: "Guide", title: "Cancellation policy template", text: "Protect your time and your income, kindly." },
];

export default function GroomingPriceCalculator() {
  const [cur, setCur] = useState("USD");
  const [hours, setHours] = useState(2);
  const [hourly, setHourly] = useState(30);
  const [supplies, setSupplies] = useState(4);
  const [overhead, setOverhead] = useState(400);
  const [perMonth, setPerMonth] = useState(80);
  const [fee, setFee] = useState(3);

  const sym = symbolFor(cur);
  const money = (n) => `${sym}${(Math.round(n * 100) / 100).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  const whole = (n) => `${sym}${Math.round(n).toLocaleString("en-US")}`;
  const r = minimumPrice({ hours, hourly, supplies, monthlyOverhead: overhead, groomsPerMonth: perMonth, feePct: fee });

  return (
    <ToolLayout
      path="/tools/grooming-price-calculator"
      title="Dog Grooming Price Calculator: What Should You Charge?"
      description="Free calculator for dog groomers: work out the lowest price per groom that still pays your time, supplies, overheads and card fees. Uses only your own numbers."
      h1="Dog Grooming Price Calculator"
      intro="Find the lowest price per groom that still pays you properly, after your time, supplies, overheads and card fees."
      faq={FAQ}
      related={RELATED}
      about={
        <>
          <h2>How the price is worked out</h2>
          <p>
            Your price per groom has to cover four things: your time (hours times what you want to earn per hour), supplies used on that dog, a share of your monthly overheads and the card fee. Add them up and you have a floor. Anything below it means you are paying to groom the dog.
          </p>
          <h2>Using it for every size</h2>
          <p>
            Run the calculator once for each size you groom, changing only the hours. A small dog that takes 1.5 hours and a large dog that takes 3.5 hours should not share one price. When you are happy, lay the prices out clearly with the <Link href="/blog/dog-grooming-price-list-template">price list template</Link>.
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
            <span>Hours for this groom (bath, dry, cut, cleanup)</span>
            <div className={t.field}><input type="number" inputMode="decimal" min="0.25" step="0.25" value={hours} onChange={(e) => setHours(e.target.value)} /></div>
          </label>
          <label>
            <span>What you want to earn per hour</span>
            <div className={t.field}><b>{sym}</b><input type="number" inputMode="decimal" min="0" value={hourly} onChange={(e) => setHourly(e.target.value)} /></div>
          </label>
          <label>
            <span>Supplies used per groom</span>
            <div className={t.field}><b>{sym}</b><input type="number" inputMode="decimal" min="0" value={supplies} onChange={(e) => setSupplies(e.target.value)} /></div>
            <small>Shampoo, conditioner, blades, towels, ear cleaner.</small>
          </label>
          <label>
            <span>Monthly overheads</span>
            <div className={t.field}><b>{sym}</b><input type="number" inputMode="decimal" min="0" value={overhead} onChange={(e) => setOverhead(e.target.value)} /></div>
            <small>Rent or van costs, insurance, software, phone, marketing.</small>
          </label>
          <label>
            <span>Grooms you do per month</span>
            <div className={t.field}><input type="number" inputMode="numeric" min="1" value={perMonth} onChange={(e) => setPerMonth(e.target.value)} /></div>
          </label>
          <label>
            <span>Card fee (%)</span>
            <div className={t.field}><input type="number" inputMode="decimal" min="0" max="20" step="0.1" value={fee} onChange={(e) => setFee(e.target.value)} /><b>%</b></div>
            <small>Use your payment provider's rate. Enter 0 if you only take cash.</small>
          </label>
        </div>

        <div className={t.out} aria-live="polite">
          <div className={t.small}>Your floor price for this groom</div>
          <div className={t.big} translate="no">{money(r.minimum)}</div>
          <div className={t.line} translate="no">Rounded up to a menu price: <b>{money(r.suggested)}</b></div>
          <div className={t.rows} translate="no">
            <div><span>Your time ({r.hours}h)</span><b>{money(r.labour)}</b></div>
            <div><span>Supplies</span><b>{money(r.supplies)}</b></div>
            <div><span>Share of overheads</span><b>{money(r.overheadPer)}</b></div>
            <div><span>Card fees</span><b>{money(r.fees)}</b></div>
            <div className={t.total}><span>Minimum price</span><b>{money(r.minimum)}</b></div>
          </div>
          <hr className={t.sep} />
          <div className={t.line} translate="no">
            At {money(r.minimum)} per groom and {Math.round(Number(perMonth) || 0)} grooms a month, that is about <b>{whole(r.perMonth)}</b> a month, or <b>{whole(r.perWeek)}</b> a week, before tax.
          </div>
          <p className={t.note}>A calculator, not advice. Check what is normal where you work and set the final price yourself.</p>
          <div className={t.actions}>
            <Link href="/blog/dog-grooming-price-list-template" className={t.btn}>Build your price list</Link>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
