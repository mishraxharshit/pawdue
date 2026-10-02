import { createContext, useContext, useEffect, useState } from "react";
import { DEFAULT_LANGUAGE, LANGUAGES, t } from "./translations";

const LanguageContext = createContext(null);

const STORAGE_KEY = "pawdue-language";

// Language comes from the browser's own setting only (navigator.language) -
// no manual picker, no IP-based guess. Cached in localStorage purely so it
// doesn't have to re-read navigator.language on every single page load.
function detectInitialLanguage() {
  if (typeof window === "undefined") return DEFAULT_LANGUAGE;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored && LANGUAGES.some((l) => l.code === stored)) return stored;
  } catch {
    // localStorage unavailable (private browsing etc.) - fall through to detection
  }
  const browserLang = (navigator.language || "en").split("-")[0];
  return LANGUAGES.some((l) => l.code === browserLang) ? browserLang : DEFAULT_LANGUAGE;
}

export function LanguageProvider({ children }) {
  // Starts as DEFAULT_LANGUAGE on the server and first client render (so
  // SSR output matches hydration and React doesn't complain), then switches
  // to the browser-detected language right after mount.
  const [lang, setLang] = useState(DEFAULT_LANGUAGE);

  useEffect(() => {
    const detected = detectInitialLanguage();
    setLang(detected);
    try {
      window.localStorage.setItem(STORAGE_KEY, detected);
    } catch {
      // fine, it'll just re-detect from navigator.language next visit
    }
  }, []);

  const locale = LANGUAGES.find((l) => l.code === lang)?.locale || "en-US";

  return (
    <LanguageContext.Provider value={{ lang, locale, translate: (path, vars) => t(lang, path, vars) }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within a LanguageProvider");
  return ctx;
}
