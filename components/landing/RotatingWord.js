import { useEffect, useState } from "react";
import s from "../../styles/landing.module.css";

// Cycles through who PawDue is for. All words sit in one grid cell, so the
// pill keeps the width of the longest word and the layout never jumps.
// Server render and reduced-motion users see the first word only.
export default function RotatingWord({ words }) {
  const [i, setI] = useState(0);

  useEffect(() => {
    const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return undefined;
    const t = setInterval(() => setI((n) => (n + 1) % words.length), 2500);
    return () => clearInterval(t);
  }, [words.length]);

  return (
    <span className={s.rot}>
      <span className={s.srOnly}>{words[0]}</span>
      {words.map((w, n) => (
        <span key={w} aria-hidden="true" className={`${s.rotWord} ${n === i ? s.rotOn : n === (i + words.length - 1) % words.length ? s.rotOut : ""}`}>
          {w}
        </span>
      ))}
    </span>
  );
}
