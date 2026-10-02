// Scope note: this covers the public booking page (what a dog owner
// actually sees - the real "client convenience" surface) and the marketing
// nav/footer, in full. It does NOT yet cover the groomer-facing dashboard,
// which is a much bigger surface and lower priority since groomers are
// PawDue's direct customers, not the "client" this request was about.
// Adding a new language is one new entry in LANGUAGES + one object below.

export const LANGUAGES = [
  { code: "en", label: "English", locale: "en-US" },
  { code: "es", label: "Español", locale: "es-ES" },
  { code: "hi", label: "हिन्दी", locale: "hi-IN" },
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
      noSlots: "No open slots in the next two weeks — please contact your groomer directly.",
      confirmSlot: "Confirm this slot",
      booking: "Booking…",
      confirmed: "You're booked! 🎉 See you for {dog}'s groom on {when}.",
      stopRemindersQuestion: "Don't want grooming reminders for {dog}?",
      stopReminders: "Stop reminders",
      processing: "Processing…",
      couldNotLoad: "Could not load this booking link",
      couldNotBook: "Could not book that slot",
    },
  },
  es: {
    nav: { pricing: "Precios", help: "Ayuda", login: "Iniciar sesión", startFree: "Empezar gratis", dashboard: "Panel" },
    footer: { tagline: "Recordatorios de aseo según la raza, para peluqueros caninos independientes o con equipo pequeño." },
    status: {
      overdueLabel: "Aseo atrasado",
      overdueNote: "Ya pasó la fecha para reservar de nuevo.",
      soonLabel: "Próximo a vencer",
      soonNote: "Se acerca en los próximos días.",
      okLabel: "Al día",
      okNote: "No se necesita ninguna acción todavía.",
      lastGroomed: "Último aseo",
      nextDue: "Próxima fecha",
    },
    booking: {
      loading: "Cargando horarios disponibles…",
      optedOutMessage: "No recibirás más recordatorios de aseo para esta mascota. Si fue un error, contacta directamente a tu peluquero.",
      bookSlotFor: "Reserva un turno de aseo para",
      noSlots: "No hay turnos disponibles en las próximas dos semanas — contacta a tu peluquero directamente.",
      confirmSlot: "Confirmar este turno",
      booking: "Reservando…",
      confirmed: "¡Turno confirmado! 🎉 Nos vemos para el aseo de {dog} el {when}.",
      stopRemindersQuestion: "¿No quieres recordatorios de aseo para {dog}?",
      stopReminders: "Detener recordatorios",
      processing: "Procesando…",
      couldNotLoad: "No se pudo cargar este enlace de reserva",
      couldNotBook: "No se pudo reservar ese turno",
    },
  },
  hi: {
    nav: { pricing: "मूल्य", help: "सहायता", login: "लॉग इन करें", startFree: "मुफ़्त शुरू करें", dashboard: "डैशबोर्ड" },
    footer: { tagline: "स्वतंत्र और छोटी टीम वाले ग्रूमर्स के लिए, नस्ल के अनुसार ग्रूमिंग रिमाइंडर।" },
    status: {
      overdueLabel: "ग्रूमिंग की समय-सीमा निकल गई",
      overdueNote: "दोबारा बुकिंग का समय बीत चुका है।",
      soonLabel: "जल्द ही देय",
      soonNote: "अगले कुछ दिनों में आने वाला है।",
      okLabel: "समय पर",
      okNote: "अभी कोई कार्रवाई ज़रूरी नहीं है।",
      lastGroomed: "पिछली ग्रूमिंग",
      nextDue: "अगली तारीख",
    },
    booking: {
      loading: "उपलब्ध समय लोड हो रहा है…",
      optedOutMessage: "अब इस कुत्ते के लिए कोई ग्रूमिंग रिमाइंडर नहीं भेजा जाएगा। अगर यह गलती से हुआ है, तो सीधे अपने ग्रूमर से संपर्क करें।",
      bookSlotFor: "इसके लिए ग्रूमिंग स्लॉट बुक करें",
      noSlots: "अगले दो हफ़्तों में कोई खाली स्लॉट नहीं है — कृपया सीधे अपने ग्रूमर से संपर्क करें।",
      confirmSlot: "यह स्लॉट पक्का करें",
      booking: "बुक हो रहा है…",
      confirmed: "बुकिंग हो गई! 🎉 {dog} की ग्रूमिंग के लिए {when} को मिलते हैं।",
      stopRemindersQuestion: "क्या आप {dog} के लिए ग्रूमिंग रिमाइंडर बंद करना चाहते हैं?",
      stopReminders: "रिमाइंडर बंद करें",
      processing: "प्रोसेस हो रहा है…",
      couldNotLoad: "यह बुकिंग लिंक लोड नहीं हो सका",
      couldNotBook: "वह स्लॉट बुक नहीं हो सका",
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
