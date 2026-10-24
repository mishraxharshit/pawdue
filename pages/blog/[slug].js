import Head from "next/head";
import Link from "next/link";
import SiteFooter from "../../components/SiteFooter";
import LandingNav from "../../components/landing/LandingNav";
import BlogBody from "../../components/landing/BlogBody";
import { POSTS, SITE, AUTHOR, getPost, relatedPosts, formatDate } from "../../lib/blog/posts";
import s from "../../styles/landing.module.css";
import b from "../../styles/blog.module.css";

export async function getStaticPaths() {
  return { paths: POSTS.map((p) => ({ params: { slug: p.slug } })), fallback: false };
}

export async function getStaticProps({ params }) {
  const post = getPost(params.slug);
  if (!post) return { notFound: true };
  const related = relatedPosts(post.slug, 2).map(({ slug, title, excerpt, category, date, readMinutes, hero }) => ({
    slug, title, excerpt, category, date, readMinutes, hero,
  }));
  return { props: { post, related } };
}

export default function Post({ post, related }) {
  const url = `${SITE}/blog/${post.slug}`;
  const img = `${SITE}${post.og}`;
  const toc = post.blocks.filter((x) => x.type === "h2");

  const jsonld = JSON.stringify({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BlogPosting",
        headline: post.title,
        description: post.description,
        image: img,
        datePublished: post.date,
        dateModified: post.date,
        author: { "@type": "Organization", name: AUTHOR, url: SITE },
        publisher: { "@type": "Organization", name: "PawDue", url: SITE },
        mainEntityOfPage: { "@type": "WebPage", "@id": url },
        articleSection: post.category,
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE },
          { "@type": "ListItem", position: 2, name: "Blog", item: `${SITE}/blog` },
          { "@type": "ListItem", position: 3, name: post.title, item: url },
        ],
      },
    ],
  });

  return (
    <div className={s.page}>
      <Head>
        <title>{`${post.title} | PawDue`}</title>
        <meta name="description" content={post.description} />
        <link rel="canonical" href={url} />
        <meta property="og:type" content="article" />
        <meta property="og:title" content={post.title} />
        <meta property="og:description" content={post.description} />
        <meta property="og:url" content={url} />
        <meta property="og:image" content={img} />
        <meta property="article:published_time" content={post.date} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:image" content={img} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonld }} />
      </Head>
      <LandingNav />
      <main>
        <div className={s.wrap}>
          <nav className={b.crumbs} aria-label="Breadcrumb">
            <Link href="/">Home</Link> / <Link href="/blog">Blog</Link>
          </nav>
        </div>

        <header className={b.articleHead}>
          <div className={b.cat}>{post.category}</div>
          <h1>{post.title}</h1>
          <div className={b.byline}>
            <span>By {AUTHOR}</span>
            <span>{formatDate(post.date)}</span>
            <span>{post.readMinutes} min read</span>
          </div>
        </header>

        <div className={b.heroImg}>
          <img
            src={`/media/${post.hero.name}-1600.jpg`}
            srcSet={`/media/${post.hero.name}-800.jpg 800w, /media/${post.hero.name}-1600.jpg 1600w`}
            sizes="(max-width: 1100px) 100vw, 1052px"
            alt={post.hero.alt}
            fetchPriority="high"
          />
        </div>

        <article className={b.article}>
          {toc.length > 1 && (
            <nav className={b.toc} aria-label="In this article">
              <b>In this article</b>
              {toc.map((t) => <a key={t.id} href={`#${t.id}`}>{t.text}</a>)}
            </nav>
          )}
          <BlogBody blocks={post.blocks} />
          <p className={b.note}> This article is general guidance, so adapt it to your own business and the rules where you work.</p>
        </article>

        <section className={b.more}>
          <div className={s.kicker}>Keep reading</div>
          <div className={b.moreGrid}>
            {related.map((p) => (
              <Link key={p.slug} href={`/blog/${p.slug}`} className={b.card}>
                <div className={b.thumb}><img src={`/media/${p.hero.name}-800.jpg`} alt={p.hero.alt} loading="lazy" /></div>
                <div className={b.cardBody}>
                  <div className={b.cat}>{p.category}</div>
                  <h3 className={b.cardTitle}>{p.title}</h3>
                  <div className={b.meta}>{p.readMinutes} min read</div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </main>
      <div className="pd-landing" style={{ fontFamily: "inherit" }}><SiteFooter /></div>
    </div>
  );
}
