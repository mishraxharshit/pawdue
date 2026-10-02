import { Plus_Jakarta_Sans } from "next/font/google";
import "../styles/globals.css";
import { LanguageProvider } from "../lib/i18n/LanguageContext";

const bodyFont = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-body",
});
const displayFont = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["700", "800"],
  variable: "--font-display",
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
