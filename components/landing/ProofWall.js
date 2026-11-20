import Link from "next/link";
import s from "../../styles/landing.module.css";
import p from "../../styles/proof.module.css";
import LoopVideo from "./LoopVideo";
import { MESSAGES, REELS, cleanMessages, cleanReels, cleanStars } from "../../lib/proof";

function initials(name) {
  return name.trim().split(/\s+/).filter((w) => /^\p{L}/u.test(w)).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

function Message({ m }) {
  return (
    <figure className={p.msg}>
      {m.image ? (
        <img className={p.shot} src={m.image} alt={m.alt || `Message from ${m.name}`} loading="lazy" />
      ) : (
        <blockquote className={p.bubble}>{m.text}</blockquote>
      )}
      {cleanStars(m.stars) > 0 && (
        <div className={p.stars} role="img" aria-label={`${cleanStars(m.stars)} out of 5 stars`}>
          {"★".repeat(cleanStars(m.stars))}<span>{"★".repeat(5 - cleanStars(m.stars))}</span>
        </div>
      )}
      <figcaption className={p.who}>
        <span className={p.avatar} aria-hidden="true">{initials(m.name)}</span>
        <span>
          <strong>{m.name}</strong>
          {(m.salon || m.place) && <small>{[m.salon, m.place].filter(Boolean).join(" · ")}</small>}
        </span>
      </figcaption>
    </figure>
  );
}

function Reel({ r }) {
  const inner = (
    <>
      <div className={p.reelMedia}>
        <LoopVideo name={r.name} label={r.title} className={p.reelVideo} />
        <span className={p.kind}>{r.kind || "PawDue"}</span>
        {r.href && <span className={p.watch}>Watch</span>}
      </div>
      <span className={p.reelTitle}>{r.title}</span>
    </>
  );
  return r.href ? (
    <a className={p.reel} href={r.href} target="_blank" rel="noopener noreferrer">{inner}</a>
  ) : (
    <div className={p.reel}>{inner}</div>
  );
}

// Replaces the "gets better every week" roadmap section.
// Shows real groomer messages (only when you have added some in lib/proof.js)
// and short vertical reels. Hides any block that has nothing to show.
export default function ProofWall({ messages = MESSAGES, reels = REELS }) {
  const msgs = cleanMessages(messages);
  const vids = cleanReels(reels);
  if (!msgs.length && !vids.length) return null;
  const hasMsgs = msgs.length > 0;

  return (
    <section className={`${s.sec} ${s.secTint}`} id="proof" aria-labelledby="proof-h">
      <div className={s.wrap}>
        <div className={s.center}>
          <span className={s.kicker}>{hasMsgs ? "From real groomers" : "See it in action"}</span>
          <h2 className={s.h2} id="proof-h">
            {hasMsgs ? "Groomers are telling us it works." : "Less chasing. More dogs on the table."}
          </h2>
          <p className={s.p}>
            {hasMsgs
              ? "Messages we received, shared with permission."
              : "Short clips of the work PawDue is built to protect."}
          </p>
        </div>

        {hasMsgs && msgs.length < 4 && (
          <div className={p.msgs}>
            {msgs.map((m, i) => <Message key={i} m={m} />)}
          </div>
        )}
        {hasMsgs && msgs.length >= 4 && (
          <div className={p.marquee} aria-label="Groomer messages">
            <div className={p.track}>
              {[...msgs, ...msgs].map((m, i) => (
                <div className={p.slide} key={i} aria-hidden={i >= msgs.length ? "true" : undefined}><Message m={m} /></div>
              ))}
            </div>
          </div>
        )}

        {vids.length > 0 && (
          <div className={p.reels} role="list">
            {vids.map((r, i) => <div role="listitem" key={i} className={p.reelItem}><Reel r={r} /></div>)}
          </div>
        )}

        <div className={p.cta}>
          <Link className={`${s.pill} ${s.pillMain}`} href="/register">Start free</Link>
          <Link className={`${s.pill} ${s.pillGhost}`} href="/feedback">Tell us how it went</Link>
        </div>
      </div>
    </section>
  );
}
