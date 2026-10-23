import Link from "next/link";
import Logo from "./Logo";
import { useLanguage } from "../lib/i18n/LanguageContext";

const SOCIALS = [
  {
    label: "PawDue on X",
    href: "https://x.com/pawdue_pet",
    icon: <path d="M5 5l14 14M19 5L5 19" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />,
  },
  {
    label: "PawDue on Instagram",
    href: "https://www.instagram.com/pawdue.pet",
    icon: (
      <>
        <rect x="3.5" y="3.5" width="17" height="17" rx="5" fill="none" stroke="currentColor" strokeWidth="2" />
        <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="2" />
        <circle cx="17" cy="7" r="1.2" fill="currentColor" />
      </>
    ),
  },
  {
    label: "PawDue on Facebook",
    href: "https://www.facebook.com/profile.php?id=61595296317797",
    icon: <path fill="currentColor" d="M14 8h2V5h-2.5C11 5 10 6.5 10 8.5V10H8v3h2v6h3v-6h2.3l.5-3H13V8.7c0-.5.2-.7 1-.7z" />,
  },
  {
    label: "PawDue on LinkedIn",
    href: "https://www.linkedin.com/company/pawdue",
    icon: (
      <>
        <rect x="4" y="9" width="3" height="10" fill="currentColor" />
        <circle cx="5.5" cy="5.6" r="1.8" fill="currentColor" />
        <path fill="currentColor" d="M10 9h3v1.5c.6-1 1.7-1.7 3.2-1.7 2.8 0 3.8 1.8 3.8 4.4V19h-3v-5.2c0-1.4-.5-2.3-1.7-2.3S13 12.4 13 13.8V19h-3z" />
      </>
    ),
  },
];

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
            <div className="pd-social" aria-label="PawDue on social media">
              {SOCIALS.map((s) => (
                <a key={s.href} href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.label} title={s.label}>
                  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">{s.icon}</svg>
                </a>
              ))}
            </div>
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
            <a href="mailto:hello@pawdue.pet">hello@pawdue.pet</a>
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
