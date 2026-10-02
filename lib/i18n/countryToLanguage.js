// Only countries where we'd suggest a *non-English* language - no point
// suggesting "switch to English" for US/UK/etc. since that's the default
// already. Add a country here only once its language is in translations.js.
export const COUNTRY_TO_LANGUAGE = {
  IN: "hi",

  ES: "es", MX: "es", AR: "es", CO: "es", PE: "es", CL: "es", VE: "es",
  EC: "es", GT: "es", CU: "es", BO: "es", DO: "es", HN: "es", PY: "es",
  SV: "es", NI: "es", CR: "es", PA: "es", UY: "es", GQ: "es",
};
