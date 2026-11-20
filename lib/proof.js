// Social proof content for the landing page.
//
// RULES (so the page stays honest):
//  - Only add a message here if a real groomer actually sent it to you.
//    Ask permission before showing their name or salon.
//  - Never invent names, quotes, numbers or photos.
//  - While MESSAGES is empty, the "Groomer messages" block is hidden
//    automatically. Nothing fake is ever shown.

// A real message from a groomer. Two ways to show it:
//   text only:  { name: "Sam", salon: "Paws Place", place: "Austin, TX", text: "..." }
//   optional: stars: 5   (1 to 5, only if the groomer actually gave that rating)
//   screenshot: { name: "Sam", salon: "Paws Place", place: "Austin, TX", image: "/proof/sam.jpg", alt: "WhatsApp message from Sam" }
// Put screenshot files in public/proof/. Blur phone numbers first.
export const MESSAGES = [];

// Short vertical videos (reels / TikToks).
//   local file: { title: "Bath day", name: "bath" }   uses /media/bath.mp4 and /media/bath-poster.jpg
//   link out:   { title: "My first week", name: "bath", href: "https://www.tiktok.com/@you/video/123" }
//               shows the poster with a Watch button that opens the link in a new tab.
// "kind" is shown as a small label. Use "Customer" only for videos a real
// customer made or allowed you to post. Otherwise use "PawDue".
export const REELS = [
  { title: "Bath day, handled", name: "bath", kind: "PawDue" },
  { title: "Clippers out, rebooking in", name: "clippers", kind: "PawDue" },
  { title: "Fresh cut, happy paws", name: "paws", kind: "PawDue" },
  { title: "Scissor finish", name: "scissors", kind: "PawDue" },
];

const NAME_OK = /^[a-z0-9-]+$/;

export function isSafeHref(h) {
  return typeof h === "string" && /^https:\/\//i.test(h);
}

export function cleanStars(n) {
  return Number.isInteger(n) && n >= 1 && n <= 5 ? n : 0;
}

export function cleanMessages(list) {
  return (Array.isArray(list) ? list : []).filter((m) => {
    if (!m || typeof m !== "object") return false;
    const hasText = typeof m.text === "string" && m.text.trim().length > 0;
    const hasImg = typeof m.image === "string" && m.image.startsWith("/proof/");
    return typeof m.name === "string" && m.name.trim() && (hasText || hasImg);
  });
}

export function cleanReels(list) {
  return (Array.isArray(list) ? list : []).filter((r) => {
    if (!r || typeof r !== "object") return false;
    if (typeof r.name !== "string" || !NAME_OK.test(r.name)) return false;
    if (typeof r.title !== "string" || !r.title.trim()) return false;
    if (r.href !== undefined && !isSafeHref(r.href)) return false;
    return true;
  });
}
