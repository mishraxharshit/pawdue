import { useEffect, useState } from "react";
import { useLanguage } from "../lib/i18n/LanguageContext";

// English only for now, so there is nothing to suggest. Add an entry per language
// (text, switch, no) when a second language is added to translations.js.
const PROMPT_COPY = {};

function readCookie(name) {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function writeCookie(name, value, days) {
  document.cookie = `${name}=${value}; path=/; max-age=${days * 24 * 60 * 60}`;
}

export default function LanguageSuggestionBanner() {
  const { lang, setLang } = useLanguage();
  const [suggested, setSuggested] = useState(null);

  useEffect(() => {
    // Middleware sets this cookie from the visitor's IP-detected country.
    // Only act on it once - if they've already decided anything, stay quiet.
    if (readCookie("pd-lang-decided")) return;
    const cookieLang = readCookie("pd-suggested-lang");
    if (cookieLang && cookieLang !== lang && PROMPT_COPY[cookieLang]) {
      setSuggested(cookieLang);
    }
  }, [lang]);

  function accept() {
    setLang(suggested);
    writeCookie("pd-lang-decided", "1", 365);
    setSuggested(null);
  }

  function decline() {
    writeCookie("pd-lang-decided", "1", 365);
    setSuggested(null);
  }

  if (!suggested) return null;
  const copy = PROMPT_COPY[suggested];

  return (
    <div className="pd-lang-suggest">
      <span>{copy.text}</span>
      <div className="pd-lang-suggest-actions">
        <button onClick={accept} className="pd-lang-suggest-accept">{copy.switch}</button>
        <button onClick={decline} className="pd-lang-suggest-decline">{copy.no}</button>
      </div>
    </div>
  );
}
