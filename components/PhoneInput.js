import { useEffect, useState } from "react";
import { COUNTRIES, DEFAULT_COUNTRY } from "../lib/countries";
import { flagFor, parsePhone } from "../lib/phone";

export default function PhoneInput({ value, onChange, required }) {
  const [countryCode, setCountryCode] = useState(DEFAULT_COUNTRY);
  const [local, setLocal] = useState("");
  const [initialized, setInitialized] = useState(false);

  // Only parse the incoming value once (on mount / first time it's non-empty)
  // rather than on every keystroke - otherwise re-deriving from the combined
  // value while typing would fight with the user's own input.
  useEffect(() => {
    if (!initialized && value) {
      const parsed = parsePhone(value);
      setCountryCode(parsed.countryCode);
      setLocal(parsed.local);
      setInitialized(true);
    }
  }, [value, initialized]);

  function emit(nextCountryCode, nextLocal) {
    const country = COUNTRIES.find((c) => c.code === nextCountryCode);
    const digits = nextLocal.replace(/[^\d]/g, "");
    onChange(digits ? `+${country.dial}${digits}` : "");
  }

  function handleCountryChange(e) {
    setCountryCode(e.target.value);
    setInitialized(true);
    emit(e.target.value, local);
  }

  function handleLocalChange(e) {
    setLocal(e.target.value);
    setInitialized(true);
    emit(countryCode, e.target.value);
  }

  const selected = COUNTRIES.find((c) => c.code === countryCode) || COUNTRIES[0];

  return (
    <div className="pd-phone-input">
      <select value={countryCode} onChange={handleCountryChange} className="pd-phone-country" aria-label="Country">
        {COUNTRIES.map((c) => (
          <option key={c.code} value={c.code}>
            {flagFor(c.code)} {c.name} (+{c.dial})
          </option>
        ))}
      </select>
      <div className="pd-phone-local-wrap">
        <span className="pd-phone-prefix">+{selected.dial}</span>
        <input
          type="tel"
          inputMode="numeric"
          className="pd-phone-local"
          placeholder="9876543210"
          value={local}
          onChange={handleLocalChange}
          required={required}
        />
      </div>
    </div>
  );
}
