// Scope note: this covers the public booking page (what a dog owner
// actually sees - the real "client convenience" surface) and the marketing
// nav/footer, in full. It does NOT yet cover the groomer-facing dashboard,
// which is a much bigger surface and lower priority since groomers are
// PawDue's direct customers, not the "client" this request was about.
// English only for now (US, UK and Australia are the target markets). Adding a
// language later is one new entry in LANGUAGES + one object below, plus its
// countries in countryToLanguage.js.

export const LANGUAGES = [
  { code: "en", label: "English", locale: "en-US" },
];

export const DEFAULT_LANGUAGE = "en";

export const translations = {
  en: {
    nav: { pricing: "Pricing", help: "Help", login: "Log in", startFree: "Start free", dashboard: "Dashboard" },
    footer: { tagline: "Breed-aware grooming reminders for solo and small-team groomers." },
    status: {
      overdueLabel: "Overdue for a groom",
      overdueNote: "It's past time for a rebook.",
      soonLabel: "Due soon",
      soonNote: "Coming up in the next few days.",
      okLabel: "On track",
      okNote: "No action needed yet.",
      lastGroomed: "Last groomed",
      nextDue: "Next due",
    },
    booking: {
      loading: "Loading available times…",
      optedOutMessage: "You won't receive any more grooming reminders for this dog. If that was a mistake, just contact your groomer directly.",
      bookSlotFor: "Book a grooming slot for",
      noSlots: "No open slots in the next two weeks. Please contact your groomer directly.",
      confirmSlot: "Confirm this slot",
      booking: "Booking…",
      confirmed: "You're booked! 🎉 See you for {dog}'s groom on {when}.",
      stopRemindersQuestion: "Don't want grooming reminders for {dog}?",
      stopReminders: "Stop reminders",
      processing: "Processing…",
      couldNotLoad: "Could not load this booking link",
      couldNotBook: "Could not book that slot",
      chooseService: "What does {dog} need?",
      dogSize: "Dog size",
      addOns: "Add-ons (optional)",
      estimatedTotal: "Estimated total",
      startingNote: "Starting price: your groomer confirms the final price.",
      pickServiceFirst: "Please choose a service first.",
      yourTotal: "Your total",
      groomerNote: "Message from your groomer",
      sizeGuess: "We guessed this from the breed. Please change it if it is wrong.",
    },
  },
};

export function t(lang, path, vars = {}) {
  const dict = translations[lang] || translations[DEFAULT_LANGUAGE];
  const keys = path.split(".");
  let value = dict;
  for (const k of keys) value = value?.[k];
  if (value === undefined) {
    // Fall back to English rather than showing a raw key if a language is
    // missing a string - better an English word than "booking.confirmed".
    let fallback = translations[DEFAULT_LANGUAGE];
    for (const k of keys) fallback = fallback?.[k];
    value = fallback ?? path;
  }
  return Object.entries(vars).reduce((str, [k, v]) => str.replaceAll(`{${k}}`, v), value);
}
