import localFont from "next/font/local";
import "../styles/globals.css";
import { LanguageProvider } from "../lib/i18n/LanguageContext";

// Plus Jakarta Sans (SIL Open Font License), served from our own repo instead of
// fetched from Google Fonts at build time. A build can no longer fail, or get
// slower, because Google answered oddly. One variable font file covers every
// weight from 200 to 800.
const bodyFont = localFont({
  src: [{ path: "../styles/fonts/plus-jakarta-sans-latin.woff2", weight: "200 800", style: "normal" }],
  variable: "--font-body",
  display: "swap",
});
const displayFont = localFont({
  src: [{ path: "../styles/fonts/plus-jakarta-sans-latin.woff2", weight: "200 800", style: "normal" }],
  variable: "--font-display",
  display: "swap",
});

// Language is detected from the browser only (navigator.language) - no
// manual picker, no IP-based suggestion. See lib/i18n/LanguageContext.js.
export default function App({ Component, pageProps }) {
  return (
    <LanguageProvider>
      <div className={`pd-app-shell ${bodyFont.variable} ${displayFont.variable}`}>
        <Component {...pageProps} />
      </div>
    </LanguageProvider>
  );
}
