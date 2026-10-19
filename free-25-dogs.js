// Run from your project root:  node free-25-dogs.js
// Raises the Free plan from 10 to 25 dogs everywhere (limit + all copy).
// Safe to run twice. Prints any file it could not find.
const fs = require("fs");

const R = {
  "lib/plans.js": [['priceLabel: "$0", limit: 10', 'priceLabel: "$0", limit: 25']],
  "pages/pricing.js": [
    ["The Free plan covers up to 10 dogs", "The Free plan covers up to 25 dogs"],
    ["<li>Up to 10 dogs</li>", "<li>Up to 25 dogs</li>"],
    ["<div>Up to 10</div>", "<div>Up to 25</div>"],
  ],
  "pages/terms.js": [["The Free plan is limited to 10 dogs", "The Free plan is limited to 25 dogs"]],
  "pages/index.js": [
    ["The free plan covers up to 10 dogs", "The free plan covers up to 25 dogs"],
    ["Free for up to 10 dogs", "Free for up to 25 dogs"],
    ["Up to 10 dogs on the house", "Up to 25 dogs on the house"],
  ],
  "README.md": [["Free (10 dogs)", "Free (25 dogs)"]],
};

let changed = 0;
for (const [file, pairs] of Object.entries(R)) {
  if (!fs.existsSync(file)) { console.log("skip (not found):", file); continue; }
  let s = fs.readFileSync(file, "utf8");
  const before = s;
  for (const [a, b] of pairs) s = s.split(a).join(b);
  if (s !== before) { fs.writeFileSync(file, s); changed++; console.log("updated:", file); }
}
console.log(`\n${changed} file(s) changed.`);

// Sweep for anything we missed.
const left = [];
function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (["node_modules", ".next", ".git"].includes(e.name)) continue;
    const p = dir === "." ? e.name : `${dir}/${e.name}`;
    if (e.isDirectory()) walk(p);
    else if (/\.(js|jsx|md)$/.test(e.name)) {
      fs.readFileSync(p, "utf8").split("\n").forEach((line, i) => {
        if (/(up to|first|free[^.]{0,20}\(?)\s*10\s*(dogs|\))/i.test(line) || /limit:\s*10\b/.test(line)) left.push(`${p}:${i + 1}: ${line.trim().slice(0, 100)}`);
      });
    }
  }
}
walk(".");
console.log(left.length ? "Check these by hand:\n" + left.join("\n") : "No other '10 dogs' mentions found.");
