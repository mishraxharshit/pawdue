import Link from "next/link";
import Logo from "./Logo";
import { useLanguage } from "../lib/i18n/LanguageContext";

// Language is detected from the browser only (see LanguageContext) - no
// manual picker or IP-based suggestion, by design.
export default function MarketingNav({ isLoggedIn = false }) {
  const { translate } = useLanguage();

  return (
    <nav className="pd-nav">
      <Link href="/" className="pd-nav-logo">
        <Logo />
      </Link>
      <div className="pd-nav-links">
        <Link className="pd-navlink" href="/pricing">{translate("nav.pricing")}</Link>
        <Link className="pd-navlink" href="/help">{translate("nav.help")}</Link>
        <Link className="pd-navlink" href={isLoggedIn ? "/dashboard" : "/login"}>
          {isLoggedIn ? translate("nav.dashboard") : translate("nav.login")}
        </Link>
        <Link className="pd-nav-cta" href={isLoggedIn ? "/dashboard" : "/register"}>
          {isLoggedIn ? translate("nav.dashboard") : translate("nav.startFree")}
        </Link>
      </div>
    </nav>
  );
}
