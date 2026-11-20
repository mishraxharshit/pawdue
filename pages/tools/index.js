import Head from "next/head";
import Link from "next/link";
import SiteFooter from "../../components/SiteFooter";
import LandingNav from "../../components/landing/LandingNav";
import { SITE } from "../../lib/blog/posts";
import s from "../../styles/landing.module.css";
import b from "../../styles/blog.module.css";
import t from "../../styles/tools.module.css";

const TOOLS = [
  {
    href: "/tools/lapsed-client-calculator",
    title: "Lapsed Client Calculator",
    text: "See what regulars who stopped booking are worth each year, and what winning some back could mean.",
  },
  {
    href: "/tools/grooming-price-calculator",
    title: "Grooming Price Calculator",
    text: "Find the lowest price per groom that still pays your time, supplies, overheads and card fees.",
  },
];

export default function Tools() {
  const url = `${SITE}/tools`;
  const title = "Free Tools for Dog Groomers";
  const description = "Free calculators for dog groomers: lapsed client value and price per groom. No sign-up, no card, just your own numbers.";
  const ld = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        name: title,
        description,
        url,
        hasPart: TOOLS.map((x) => ({ "@type": "WebApplication", name: x.title, url: `${SITE}${x.href}` })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE },
          { "@type": "ListItem", position: 2, name: "Free tools", item: url },
        ],
      },
    ],
  };
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
        <meta property="og:image" content={`${SITE}/media/og-tools.jpg`} />
        <meta name="twitter:card" content="summary_large_image" />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      </Head>
      <LandingNav />
      <main>
        <div className={s.wrap}>
          <nav className={b.crumbs} aria-label="Breadcrumb"><Link href="/">Home</Link> / Free tools</nav>
        </div>
        <header className={t.head}>
          <div className={t.kick}>Free tools</div>
          <h1>Free tools for dog groomers</h1>
          <p>Simple calculators that use only your own numbers. No sign-up, no card.</p>
        </header>
        <div className={t.hubGrid}>
          {TOOLS.map((x) => (
            <Link key={x.href} href={x.href} className={t.relCard}>
              <div className={t.kick}>Free tool</div>
              <h3>{x.title}</h3>
              <p>{x.text}</p>
            </Link>
          ))}
        </div>
        <div style={{ height: 80 }} />
      </main>
      <div className="pd-landing" style={{ fontFamily: "inherit" }}><SiteFooter /></div>
    </div>
  );
}
