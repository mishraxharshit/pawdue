import { POSTS, SITE } from "../../lib/blog/posts";

const esc = (t) => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export async function getServerSideProps({ res }) {
  const items = POSTS.map(
    (p) => `  <item>
    <title>${esc(p.title)}</title>
    <link>${SITE}/blog/${p.slug}</link>
    <guid>${SITE}/blog/${p.slug}</guid>
    <pubDate>${new Date(`${p.date}T12:00:00Z`).toUTCString()}</pubDate>
    <description>${esc(p.description)}</description>
  </item>`
  ).join("\n");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
  <title>PawDue Blog</title>
  <link>${SITE}/blog</link>
  <description>Practical guides for dog groomers on keeping regulars coming back.</description>
${items}
</channel>
</rss>`;
  res.setHeader("Content-Type", "application/rss+xml; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
  res.write(xml);
  res.end();
  return { props: {} };
}

export default function Rss() {
  return null;
}
