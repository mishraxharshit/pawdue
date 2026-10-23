import Head from "next/head";
import Link from "next/link";
import SiteFooter from "../../components/SiteFooter";
import Reveal from "../../components/Reveal";
import LandingNav from "../../components/landing/LandingNav";
import { POSTS, SITE, formatDate } from "../../lib/blog/posts";
import s from "../../styles/landing.module.css";
import b from "../../styles/blog.module.css";

export async function getStaticProps() {
  // Only card data goes to the browser, not the full article bodies.
  const posts = POSTS.map(({ slug, title, excerpt, category, date, readMinutes, hero }) => ({
    slug, title, excerpt, category, date, readMinutes, hero,
  }));
  return { props: { posts } };
}

const TITLE = "Dog Grooming Business Blog | PawDue";
const DESC =
  "Practical, honest guides for dog groomers: keeping regulars coming back, rebooking reminder templates, grooming intervals and more.";

export default function BlogIndex({ posts }) {
  const jsonld = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Blog",
    name: "PawDue Blog",
    url: `${SITE}/blog`,
    description: DESC,
    publisher: { "@type": "Organization", name: "PawDue", url: SITE },
    blogPost: posts.map((p) => ({ "@type": "BlogPosting", headline: p.title, url: `${SITE}/blog/${p.slug}`, datePublished: p.date })),
  });
  const [first, ...rest] = posts;

  const Card = ({ p, featured }) => (
    <Link href={`/blog/${p.slug}`} className={`${b.card} ${featured ? b.featured : ""}`}>
      <div className={b.thumb}>
        <img
          src={`/media/${p.hero.name}-${featured ? 1600 : 800}.jpg`}
          alt={p.hero.alt}
          loading={featured ? "eager" : "lazy"}
        />
      </div>
      <div className={b.cardBody}>
        <div className={b.cat}>{p.category}</div>
        <h2 className={b.cardTitle}>{p.title}</h2>
        <p className={b.excerpt}>{p.excerpt}</p>
        <div className={b.meta}>{formatDate(p.date)} &middot; {p.readMinutes} min read</div>
      </div>
    </Link>
  );

  return (
    <div className={s.page}>
      <Head>
        <title>{TITLE}</title>
        <meta name="description" content={DESC} />
        <link rel="canonical" href={`${SITE}/blog`} />
        <link rel="alternate" type="application/rss+xml" title="PawDue Blog" href={`${SITE}/blog/rss.xml`} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={TITLE} />
        <meta property="og:description" content={DESC} />
        <meta property="og:url" content={`${SITE}/blog`} />
        <meta property="og:image" content={`${SITE}/media/og.jpg`} />
        <meta name="twitter:card" content="summary_large_image" />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonld }} />
      </Head>
      <LandingNav />
      <main>
        <div className={s.wrap}>
          <section className={b.head}>
            <span className={s.eyebrow}>PawDue blog</span>
            <h1 className={s.h1s}>Notes for <em>dog groomers</em></h1>
            <p className={s.lead}>Practical, honest guides on keeping regulars coming back, written with groomers in mind.</p>
          </section>
          <div className={b.grid}>
            {first && <Reveal className={b.featured} style={{ display: "contents" }}><Card p={first} featured /></Reveal>}
            {rest.map((p, i) => (
              <Reveal key={p.slug} delay={(i % 2) * 90} style={{ display: "contents" }}><Card p={p} /></Reveal>
            ))}
          </div>
          <p className={b.note} style={{ textAlign: "center", marginTop: 40 }}>Photos and footage on this site are illustrative stock, not PawDue customers.</p>
        </div>
        <section style={{ padding: "90px 0 100px" }}>
          <div className={s.final}>
            <h2 className={s.h2}>Let PawDue do the remembering.</h2>
            <p className={s.p}>Free for up to 30 dogs. No credit card.</p>
            <div className={s.ctaRow}>
              <Link className={`${s.pill} ${s.pillBrass}`} href="/register">Start free</Link>
            </div>
          </div>
        </section>
      </main>
      <div className="pd-landing" style={{ fontFamily: "inherit" }}><SiteFooter /></div>
    </div>
  );
}
