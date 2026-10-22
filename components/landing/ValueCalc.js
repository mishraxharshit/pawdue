import { useState } from "react";
import s from "../../styles/landing.module.css";

function clamp(n, lo, hi) {
  const x = Number(n);
  if (!Number.isFinite(x)) return lo;
  return Math.min(hi, Math.max(lo, x));
}

// Plain arithmetic the groomer can check in their head. No industry
// statistics, no promised uplift: it only multiplies the numbers they type.
export default function ValueCalc() {
  const [price, setPrice] = useState(65);
  const [visits, setVisits] = useState(8);
  const [lost, setLost] = useState(5);

  const p = clamp(price, 0, 1000);
  const v = clamp(visits, 1, 26);
  const l = clamp(lost, 0, 500);
  const perDog = p * v;
  const total = perDog * l;

  return (
    <div className={s.calc}>
      <div className={s.calcInputs}>
        <label>
          <span>Your average groom costs</span>
          <div className={s.field}><b>$</b><input type="number" inputMode="decimal" min="0" value={price} onChange={(e) => setPrice(e.target.value)} /></div>
        </label>
        <label>
          <span>A regular comes in this many times a year</span>
          <div className={s.field}><input type="number" inputMode="numeric" min="1" max="26" value={visits} onChange={(e) => setVisits(e.target.value)} /></div>
        </label>
        <label>
          <span>Regulars who quietly drifted away</span>
          <div className={s.field}><input type="number" inputMode="numeric" min="0" value={lost} onChange={(e) => setLost(e.target.value)} /></div>
        </label>
      </div>
      <div className={s.calcOut} aria-live="polite">
        <div className={s.calcSmall}>One regular dog is worth about</div>
        <div className={s.calcBig}>${perDog.toLocaleString("en-US")}<small> a year</small></div>
        <div className={s.calcLine}>
          {l} dogs who stopped coming is about <b>${total.toLocaleString("en-US")}</b> a year.
        </div>
        <p className={s.calcNote}>
          This is only your own numbers multiplied. PawDue does not promise to win every one back, it makes sure nobody is forgotten.
        </p>
      </div>
    </div>
  );
}
