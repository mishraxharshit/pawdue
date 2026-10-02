import { NextResponse } from "next/server";
import { COUNTRY_TO_LANGUAGE } from "./lib/i18n/countryToLanguage";

// Deliberately does NOT switch the language itself - that's a UX decision
// (a VPN, a shared office connection, or a traveler could easily get the
// wrong guess from IP alone). This only leaves a hint for the client-side
// LanguageSuggestionBanner to show an actual opt-in prompt, same pattern
// Google's own "it looks like you're in X - switch to Y?" banner uses.
export function middleware(request) {
  const response = NextResponse.next();

  // Already asked (accepted, declined, or picked a language manually) -
  // don't recompute or ask again.
  if (request.cookies.get("pd-lang-decided")) return response;

  const country = request.geo?.country || request.headers.get("x-vercel-ip-country");
  if (!country) return response;

  const suggested = COUNTRY_TO_LANGUAGE[country];
  if (suggested) {
    response.cookies.set("pd-suggested-lang", suggested, {
      path: "/",
      maxAge: 60 * 60 * 24, // 1 day - re-evaluated on the next visit if still undecided
    });
  }

  return response;
}

export const config = {
  // Runs on normal pages only - skip API routes, static files, and images
  // so this doesn't add overhead to things that don't render UI.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
