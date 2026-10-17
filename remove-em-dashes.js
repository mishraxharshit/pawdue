// Run from your project root:  node remove-em-dashes.js
// Replaces every em dash in user-facing text with ordinary punctuation.
// Safe to run twice. It prints any spot it could not find (your file may
// already be changed) and finishes by listing any em dash still left.
const fs = require("fs");
const path = require("path");

const R = {
  "pages/pricing.js": [["either way — you just", "either way. You just"], ["whenever you like — there's", "whenever you like. There's"], ["any time — once added", "any time. Once added"], ["dashboard — no long-term", "dashboard. No long-term"], ["<div>—</div>", "<div>✕</div>"]],
  "pages/terms.js": [["you add — typically", "you add, typically"]],
  "pages/api/settings/setup-status.js": [["yet — they won't", "yet, so they won't"]],
  "pages/api/feedback.js": [["` — ${category}`", "`: ${category}`"], ["just now — please", "just now. Please"]],
  "pages/help.js": [["didn't go out — what happened?", "didn't go out. What happened?"], ["email first — it needs no approval and works immediately.", "email first, since it needs no approval and works immediately."], ["Yes — when adding", "Yes. When adding"], ["feature request — where does", "feature request. Where does"], ["record — it keeps", "record. It keeps"]],
  "pages/privacy.js": [["account — never sold", "account, never sold"]],
  "pages/index.js": [["rebook &mdash; automatically", "rebook, automatically"], ["automatically &mdash; on every plan", "automatically, on every plan"], ["last-groom date &mdash; this is", "last-groom date. This is"], ["Start free &mdash; takes 2 minutes", "Start free in 2 minutes"]],
  "pages/dashboard.js": [["yet — they&apos;ll", "yet. They&apos;ll"], ["account &mdash; not just", "account, not just"], ["setting &mdash;\n              there&apos;s no undo.", "setting.\n              There&apos;s no undo."]],
  "pages/feedback.js": [["thought — it goes", "thought. It goes"], ["Thanks — got it.", "Thanks, got it."]],
  "components/RevenueBanner.js": [["month &mdash; {thisMonth.count}", "month: {thisMonth.count}"], ["/visit \\u2014 set your real price", "/visit. Set your real price"]],
  "components/ComparisonTable.js": [['"✓" : "—"', '"✓" : "✕"']],
  "components/DueDateCalculator.js": [["yet — quietly", "yet. Quietly"]],
  "components/DogModal.js": [["connected &mdash; the phone", "connected. The phone"]],
  "components/ActivityFeed.js": [["Nothing yet — activity", "Nothing yet. Activity"]],
  "lib/i18n/translations.js": [["weeks — please", "weeks. Please"], ["semanas — contacta", "semanas. Contacta"], ["है — कृपया", "है। कृपया"]],
};

let changed = 0;
for (const [file, pairs] of Object.entries(R)) {
  if (!fs.existsSync(file)) { console.log("skip (not found):", file); continue; }
  let s = fs.readFileSync(file, "utf8");
  const before = s;
  for (const [a, b] of pairs) {
    if (!s.includes(a)) continue;
    s = s.split(a).join(b);
  }
  if (s !== before) { fs.writeFileSync(file, s); changed++; console.log("updated:", file); }
}

// Docs and CSS comments: not user-facing, so a plain hyphen is enough.
for (const f of ["README.md", "styles/globals.css"]) {
  if (!fs.existsSync(f)) continue;
  const t = fs.readFileSync(f, "utf8");
  const u = t.replace(/ — /g, " - ").replace(/—/g, "-");
  if (u !== t) { fs.writeFileSync(f, u); changed++; console.log("updated:", f); }
}

// Final sweep: report anything left (we do not guess at replacements).
const left = [];
function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (["node_modules", ".next", ".git"].includes(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.(js|jsx|css|md|html)$/.test(e.name)) {
      fs.readFileSync(p, "utf8").split("\n").forEach((line, i) => {
        if (/—|&mdash;|\\u2014|&#8212;/.test(line)) left.push(`${p}:${i + 1}: ${line.trim().slice(0, 100)}`);
      });
    }
  }
}
walk(".");
console.log(`\n${changed} file(s) changed.`);
console.log(left.length ? "Em dashes still present (edit by hand):\n" + left.join("\n") : "No em dashes left.");
