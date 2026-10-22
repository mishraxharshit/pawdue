import Link from "next/link";
import { useEffect, useState } from "react";
import Logo from "../Logo";
import s from "../../styles/landing.module.css";

export default function LandingNav({ isLoggedIn = false, home = false }) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const f = () => setOn(window.scrollY > 8);
    f();
    window.addEventListener("scroll", f, { passive: true });
    return () => window.removeEventListener("scroll", f);
  }, []);
  return (
    <header className={`${s.nav} ${on ? s.navOn : ""}`}>
      <div className={`${s.wrap} ${s.navIn}`}>
        <Link href="/" aria-label="PawDue home"><Logo /></Link>
        <nav className={s.navLinks} aria-label="Main">
          <a href={home ? "#day" : "/#day"}>How it works</a>
          <Link href="/pricing">Pricing</Link>
          <Link href="/help">Help</Link>
          {!isLoggedIn && <Link href="/login">Log in</Link>}
          <Link className={`${s.pill} ${s.pillMain} ${s.pillSm}`} href={isLoggedIn ? "/dashboard" : "/register"}>{isLoggedIn ? "Dashboard" : "Start free"}</Link>
        </nav>
      </div>
    </header>
  );
}
