// A practical list of countries (not the full ISO-3166 set) covering the
// markets PawDue is realistically used in. Flag is derived from the ISO
// code at render time (see flagFor in PhoneInput.js) rather than stored
// here, so this list stays short and easy to extend.
export const COUNTRIES = [
  { code: "US", name: "United States", dial: "1" },
  { code: "CA", name: "Canada", dial: "1" },
  { code: "GB", name: "United Kingdom", dial: "44" },
  { code: "IN", name: "India", dial: "91" },
  { code: "AU", name: "Australia", dial: "61" },
  { code: "NZ", name: "New Zealand", dial: "64" },
  { code: "IE", name: "Ireland", dial: "353" },
  { code: "DE", name: "Germany", dial: "49" },
  { code: "FR", name: "France", dial: "33" },
  { code: "ES", name: "Spain", dial: "34" },
  { code: "IT", name: "Italy", dial: "39" },
  { code: "NL", name: "Netherlands", dial: "31" },
  { code: "PT", name: "Portugal", dial: "351" },
  { code: "MX", name: "Mexico", dial: "52" },
  { code: "BR", name: "Brazil", dial: "55" },
  { code: "AR", name: "Argentina", dial: "54" },
  { code: "ZA", name: "South Africa", dial: "27" },
  { code: "NG", name: "Nigeria", dial: "234" },
  { code: "AE", name: "United Arab Emirates", dial: "971" },
  { code: "SA", name: "Saudi Arabia", dial: "966" },
  { code: "PK", name: "Pakistan", dial: "92" },
  { code: "BD", name: "Bangladesh", dial: "880" },
  { code: "LK", name: "Sri Lanka", dial: "94" },
  { code: "SG", name: "Singapore", dial: "65" },
  { code: "MY", name: "Malaysia", dial: "60" },
  { code: "PH", name: "Philippines", dial: "63" },
  { code: "ID", name: "Indonesia", dial: "62" },
  { code: "TH", name: "Thailand", dial: "66" },
  { code: "VN", name: "Vietnam", dial: "84" },
  { code: "JP", name: "Japan", dial: "81" },
  { code: "KR", name: "South Korea", dial: "82" },
  { code: "CN", name: "China", dial: "86" },
];

export const DEFAULT_COUNTRY = "US";
