import Link from "next/link";
import { Fragment } from "react";
import LoopVideo from "./LoopVideo";
import { BREED_INTERVALS } from "../../lib/breedIntervals";
import b from "../../styles/blog.module.css";

// Inline markup: **bold** and [label](/path or https://...)
function inline(text) {
  const out = [];
  const re = /(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g;
  let last = 0;
  let m;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith("**")) {
      out.push(<strong key={i++}>{tok.slice(2, -2)}</strong>);
    } else {
      const [, label, href] = tok.match(/\[([^\]]+)\]\(([^)]+)\)/);
      out.push(
        href.startsWith("/") ? <Link key={i++} href={href}>{label}</Link> : <a key={i++} href={href} rel="noopener noreferrer">{label}</a>
      );
    }
    last = m.index + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

function breedRows() {
  return Object.entries(BREED_INTERVALS)
    .sort((a, c) => a[1] - c[1] || a[0].localeCompare(c[0]))
    .map(([name, weeks]) => [name, `${weeks} weeks`]);
}

export default function BlogBody({ blocks }) {
  return (
    <div className={b.body}>
      {blocks.map((bl, idx) => {
        switch (bl.type) {
          case "h2":
            return <h2 key={idx} id={bl.id}>{bl.text}</h2>;
          case "h3":
            return <h3 key={idx}>{bl.text}</h3>;
          case "p":
            return <p key={idx}>{inline(bl.text)}</p>;
          case "ul":
            return <ul key={idx}>{bl.items.map((it, j) => <li key={j}>{inline(it)}</li>)}</ul>;
          case "ol":
            return <ol key={idx}>{bl.items.map((it, j) => <li key={j}>{inline(it)}</li>)}</ol>;
          case "quote":
            return <blockquote key={idx} className={b.quote}>{bl.text}</blockquote>;
          case "callout":
            return (
              <div key={idx} className={b.callout}>
                <div className={b.calloutTitle}>{bl.title}</div>
                <p>{inline(bl.text)}</p>
              </div>
            );
          case "img":
            return (
              <figure key={idx} className={b.fig}>
                <img
                  src={`/media/${bl.src}-1600.jpg`}
                  srcSet={`/media/${bl.src}-800.jpg 800w, /media/${bl.src}-1600.jpg 1600w`}
                  sizes="(max-width: 800px) 100vw, 720px"
                  alt={bl.alt}
                  loading="lazy"
                />
                {bl.caption && <figcaption>{bl.caption}</figcaption>}
              </figure>
            );
          case "video":
            return (
              <figure key={idx} className={b.fig}>
                <LoopVideo name={bl.name} label={bl.alt} />
                {bl.caption && <figcaption>{bl.caption}</figcaption>}
              </figure>
            );
          case "table": {
            const rows = bl.rows === "BREED_TABLE" ? breedRows() : bl.rows;
            return (
              <div key={idx} className={b.tableWrap}>
                <table>
                  <thead><tr>{bl.head.map((h) => <th key={h}>{h}</th>)}</tr></thead>
                  <tbody>{rows.map((r, j) => <tr key={j}>{r.map((c, k) => <Fragment key={k}><td>{c}</td></Fragment>)}</tr>)}</tbody>
                </table>
              </div>
            );
          }
          case "cta":
            return (
              <div key={idx} className={b.cta}>
                <h3>Keep your regulars without the chasing</h3>
                <p>PawDue tracks when each dog is due, reminds the owner to rebook, and shows who has gone quiet. Free for up to 30 dogs, no card.</p>
                <Link className={b.ctaBtn} href="/register">Start free</Link>
              </div>
            );
          default:
            return null;
        }
      })}
    </div>
  );
}
