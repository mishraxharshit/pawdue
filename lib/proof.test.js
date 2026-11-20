import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { MESSAGES, REELS, cleanMessages, cleanReels, isSafeHref, cleanStars } from "./proof";

describe("proof data", () => {
  it("only accepts https links", () => {
    expect(isSafeHref("https://www.tiktok.com/@a/video/1")).toBe(true);
    expect(isSafeHref("http://x.com")).toBe(false);
    expect(isSafeHref("javascript:alert(1)")).toBe(false);
  });
  it("drops broken messages", () => {
    const out = cleanMessages([
      { name: "A", text: "hi" },
      { name: "", text: "hi" },
      { name: "B" },
      { name: "C", image: "/proof/c.jpg" },
      { name: "D", image: "https://evil.com/x.jpg" },
      null,
    ]);
    expect(out.map((m) => m.name)).toEqual(["A", "C"]);
  });
  it("stars only 1 to 5", () => {
    expect([cleanStars(5), cleanStars(0), cleanStars(6), cleanStars(4.5), cleanStars("5")]).toEqual([5, 0, 0, 0, 0]);
  });
  it("drops broken reels", () => {
    const out = cleanReels([
      { title: "ok", name: "bath" },
      { title: "bad name", name: "../x" },
      { title: "bad link", name: "bath", href: "javascript:1" },
      { title: "", name: "bath" },
    ]);
    expect(out).toHaveLength(1);
  });
  it("shipped data is valid and files exist", () => {
    expect(cleanMessages(MESSAGES)).toHaveLength(MESSAGES.length);
    expect(cleanReels(REELS)).toHaveLength(REELS.length);
    for (const r of REELS) {
      expect(fs.existsSync(path.join(process.cwd(), "public/media", `${r.name}.mp4`))).toBe(true);
      expect(fs.existsSync(path.join(process.cwd(), "public/media", `${r.name}-poster.jpg`))).toBe(true);
    }
  });
});
