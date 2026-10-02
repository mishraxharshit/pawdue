import { LANGUAGES } from "../lib/i18n/translations";
import { useLanguage } from "../lib/i18n/LanguageContext";

export default function LanguageSwitcher({ className = "" }) {
  const { lang, setLang } = useLanguage();

  return (
    <select
      className={`pd-lang-switcher ${className}`}
      value={lang}
      onChange={(e) => setLang(e.target.value)}
      aria-label="Language"
    >
      {LANGUAGES.map((l) => (
        <option key={l.code} value={l.code}>{l.label}</option>
      ))}
    </select>
  );
}
