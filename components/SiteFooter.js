import Link from "next/link";
import Logo from "./Logo";
import { useLanguage } from "../lib/i18n/LanguageContext";

export default function SiteFooter() {
  const year = new Date().getFullYear();
  const { translate } = useLanguage();

  return (
    <footer className="pd-sitefooter">
      <div className="pd-shell pd-sitefooter-inner">
        <div className="pd-sitefooter-top">
          <div className="pd-sitefooter-brand">
            <Logo size={32} />
            <p>{translate("footer.tagline")}</p>
          </div>

          <div className="pd-sitefooter-col">
            <div className="pd-sitefooter-heading">Product</div>
            <Link href="/">Overview</Link>
            <Link href="/pricing">Pricing</Link>
            <Link href="/register">Start free</Link>
            <Link href="/login">Log in</Link>
          </div>

          <div className="pd-sitefooter-col">
            <div className="pd-sitefooter-heading">Support</div>
            <Link href="/help">Help center</Link>
            <Link href="/feedback">Send feedback</Link>
            <a href="mailto:hello@pawdue.app">hello@pawdue.app</a>
          </div>

          <div className="pd-sitefooter-col">
            <div className="pd-sitefooter-heading">Legal</div>
            <Link href="/privacy">Privacy policy</Link>
            <Link href="/terms">Terms &amp; conditions</Link>
          </div>
        </div>

        <div className="pd-sitefooter-bottom">
          <span>© {year} PawDue. All rights reserved.</span>
          <span className="pd-sitefooter-tagline">Made for groomers who&apos;d rather groom than chase rebookings.</span>
        </div>
      </div>
    </footer>
  );
}
