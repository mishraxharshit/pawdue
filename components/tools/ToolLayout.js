import Head from "next/head";
import Link from "next/link";
import SiteFooter from "../SiteFooter";
import LandingNav from "../landing/LandingNav";
import { SITE } from "../../lib/blog/posts";
import s from "../../styles/landing.module.css";
import b from "../../styles/blog.module.css";
import t from "../../styles/tools.module.css";

// Shared page frame for the free tools: SEO tags, structured data
// (WebApplication, breadcrumbs, FAQ), explanation text, FAQ and a calm CTA.
export default function ToolLayout({ path, title, description, h1, intro, faq = [], related = [], children, about }) {
  const url = `${SITE}${path}`;
  const og = `${SITE}/media/og-tools.jpg`;
  const graph = [
    {
      "@type": "WebApplication",
      name: h1,
      description,
      url,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Any",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      publisher: { "@type": "Organization", name: "PawDue", url: SITE },
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE },
        { "@type": "ListItem", position: 2, name: "Free tools", item: `${SITE}/tools` },
        { "@type": "ListItem", position: 3, name: h1, item: url },
      ],
    },
  ];
  if (faq.length) {
    graph.push({
      "@type": "FAQPage",
      mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
    });
  }

  return (
    <div className={s.page}>
      <Head>
        <title>{`${title} | PawDue`}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={url} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={url} />
        <meta property="og:image" content={og} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:image" content={og} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@graph": graph }) }} />
      </Head>
      <LandingNav />
      <main>
        <div className={s.wrap}>
          <nav className={b.crumbs} aria-label="Breadcrumb">
            <Link href="/">Home</Link> / <Link href="/tools">Free tools</Link>
          </nav>
        </div>
        <header className={t.head}>
          <div className={t.kick}>Free tool for dog groomers</div>
          <h1>{h1}</h1>
          <p>{intro}</p>
        </header>

        {children}

        {about && <section className={t.prose}>{about}</section>}

        {faq.length > 0 && (
          <section className={t.faq} aria-label="Frequently asked questions">
            <h2 style={{ fontSize: "1.6rem", letterSpacing: "-0.03em", margin: "0 0 6px" }}>Questions groomers ask</h2>
            {faq.map((f) => (
              <details key={f.q}>
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </section>
        )}

        <div className={t.ctaWrap}>
          <div className={t.cta}>
            <h2>Keep this off your mind</h2>
            <p>PawDue keeps your client list, emails owners a friendly rebooking reminder with a link to book, and shows who has gone quiet. Free for up to 30 dogs, no card needed.</p>
            <Link href="/register" className={`${s.pill} ${s.pillMain}`}>Start free</Link>
          </div>
        </div>

        {related.length > 0 && (
          <section className={t.related}>
            <div className={t.kick}>Keep going</div>
            <div className={t.relGrid}>
              {related.map((r) => (
                <Link key={r.href} href={r.href} className={t.relCard}>
                  <div className={t.kick}>{r.kind}</div>
                  <h3>{r.title}</h3>
                  <p>{r.text}</p>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
      <div className="pd-landing" style={{ fontFamily: "inherit" }}><SiteFooter /></div>
    </div>
  );
}
