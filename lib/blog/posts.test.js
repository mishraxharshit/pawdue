import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { POSTS, getPost, relatedPosts } from "./posts";

const pub = (p) => path.join(process.cwd(), "public", p);
const ROUTES = new Set(["/", "/pricing", "/blog", "/help", "/register", "/login", "/tools", "/tools/lapsed-client-calculator", "/tools/grooming-price-calculator"]);

function textOf(post) {
  const out = [post.title, post.description, post.excerpt];
  for (const b of post.blocks) {
    if (b.text) out.push(b.text);
    if (b.items) out.push(...b.items.map((i) => (typeof i === "string" ? i : `${i.q} ${i.a}`)));
    if (Array.isArray(b.rows)) out.push(...b.rows.flat());
  }
  return out.join("\n");
}

describe("blog data", () => {
  it("has unique slugs and sensible meta lengths", () => {
    expect(new Set(POSTS.map((p) => p.slug)).size).toBe(POSTS.length);
    for (const p of POSTS) {
      expect(p.title.length, p.slug).toBeLessThanOrEqual(80);
      expect(p.description.length, p.slug).toBeGreaterThanOrEqual(90);
      expect(p.description.length, p.slug).toBeLessThanOrEqual(175);
    }
  });

  it("every internal link points at a real page", () => {
    const slugs = new Set(POSTS.map((p) => `/blog/${p.slug}`));
    for (const p of POSTS) {
      for (const m of textOf(p).matchAll(/\]\((\/[^)#\s]*)\)/g)) {
        const href = m[1];
        const ok = ROUTES.has(href) || slugs.has(href) || fs.existsSync(pub(href));
        expect(ok, `${p.slug} -> ${href}`).toBe(true);
      }
    }
  });

  it("images and social cards exist", () => {
    for (const p of POSTS) {
      expect(fs.existsSync(pub(p.og)), `${p.slug} og`).toBe(true);
      expect(fs.existsSync(pub(`/media/${p.hero.name}-1600.jpg`)), `${p.slug} hero`).toBe(true);
    }
  });

  it("follows the writing rules: no em dashes, no invented statistics", () => {
    for (const p of POSTS) {
      const t = textOf(p);
      expect(t.includes("—"), `${p.slug} em dash`).toBe(false);
      expect(/\b\d{2,3}\s?%\s+of (groomers|clients|dogs|owners)/i.test(t), `${p.slug} stat`).toBe(false);
    }
  });

  it("FAQ blocks are complete", () => {
    for (const p of POSTS) {
      for (const b of p.blocks.filter((x) => x.type === "faq")) {
        expect(b.items.length).toBeGreaterThan(0);
        for (const f of b.items) { expect(f.q.endsWith("?")).toBe(true); expect(f.a.length).toBeGreaterThan(40); }
      }
    }
  });

  it("related posts never include the post itself", () => {
    for (const p of POSTS) {
      const r = relatedPosts(p.slug, 2);
      expect(r).toHaveLength(2);
      expect(r.every((x) => x.slug !== p.slug)).toBe(true);
    }
    expect(getPost("nope")).toBeNull();
  });
});
