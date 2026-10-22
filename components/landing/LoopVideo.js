import { useEffect, useRef, useState } from "react";

// Muted looping clip that only loads and plays while on screen, and never
// autoplays for people who asked their device for reduced motion (they get
// the still poster instead). Without JavaScript the poster still shows.
export default function LoopVideo({ name, label, className = "", eager = false }) {
  const ref = useRef(null);
  const [play, setPlay] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return undefined;
    if (typeof IntersectionObserver === "undefined") {
      setPlay(true);
      return undefined;
    }
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => setPlay(e.isIntersecting)),
      { threshold: 0.25 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (play) {
      const p = v.play();
      if (p && p.catch) p.catch(() => {});
    } else {
      v.pause();
    }
  }, [play]);

  return (
    <video
      ref={ref}
      className={className}
      poster={`/media/${name}-poster.jpg`}
      muted
      loop
      playsInline
      preload={eager ? "auto" : "none"}
      aria-label={label}
      role="img"
    >
      <source src={`/media/${name}.mp4`} type="video/mp4" />
    </video>
  );
}
