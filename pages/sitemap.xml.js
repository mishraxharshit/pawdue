import { POSTS, SITE } from "../lib/blog/posts";

const STATIC = [
  ["/", "1.0"],
  ["/pricing", "0.8"],
  ["/blog", "0.8"],
  ["/help", "0.6"],
  ["/privacy", "0.3"],
  ["/terms", "0.3"],
];

export async function getServerSideProps({ res }) {
  const urls = [
    ...STATIC.map(([p, pr]) => `  <url><loc>${SITE}${p === "/" ? "" : p}${p === "/" ? "/" : ""}</loc><priority>${pr}</priority></url>`),
    ...POSTS.map((p) => `  <url><loc>${SITE}/blog/${p.slug}</loc><lastmod>${p.date}</lastmod><priority>0.7</priority></url>`),
  ].join("\n");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;
  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
  res.write(xml);
  res.end();
  return { props: {} };
}

export default function Sitemap() {
  return null;
}
