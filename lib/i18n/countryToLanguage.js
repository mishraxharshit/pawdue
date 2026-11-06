// Only countries where we'd suggest a *non-English* language - no point
// suggesting "switch to English" for US/UK/etc. since that's the default
// already. The product is English-only for now, so this is empty and no
// language prompt is ever shown. Add a country here only once its language is
// in translations.js.
export const COUNTRY_TO_LANGUAGE = {};
