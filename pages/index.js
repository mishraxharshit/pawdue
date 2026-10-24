import Head from "next/head";
import Link from "next/link";
import { createSupabaseServerClient } from "../lib/supabase/server";
import Logo from "../components/Logo";
import SiteFooter from "../components/SiteFooter";
import DueDateCalculator from "../components/DueDateCalculator";
import Faq from "../components/Faq";
import Reveal from "../components/Reveal";
import LandingNav from "../components/landing/LandingNav";
import LoopVideo from "../components/landing/LoopVideo";
import ValueCalc from "../components/landing/ValueCalc";
import RotatingWord from "../components/landing/RotatingWord";
import { PLANS } from "../lib/plans";
import s from "../styles/landing.module.css";

const SITE = "https://pawdue.pet";

const FAQ_ITEMS = [
  {
    q: "Is PawDue new? Who is behind it?",
    a: "Yes, PawDue is new. It is built by one founder and shaped by feedback from working groomers. That is why there are no customer logos or reviews on this page: we only show what is real. If something is missing or confusing, tell us from the feedback page and it gets read.",
  },
  {
    q: "Does PawDue take payments or run my whole salon?",
    a: "No. PawDue does one job: knowing who is due and helping them rebook. It does not take payments from your clients, send invoices, or replace your full salon software. Your account is one login for now (no separate staff logins).",
  },
  {
    q: "Do I need a credit card to start?",
    a: `No. The free plan covers up to ${PLANS.free.limit} dogs with no card on file. You only add billing details if you upgrade.`,
  },
  {
    q: "Does this cost extra per message?",
    a: "Reminders go out by email, and there is no per-message charge on any plan. For owners you would rather text, the Message button opens WhatsApp with the words already written. You send it from your own number. Automatic WhatsApp and SMS are not switched on yet.",
  },
  {
    q: "Can I bring in my existing client list?",
    a: "Yes. Add dogs one at a time from the dashboard, or upload a CSV file if you are moving a larger book of clients (in Excel or Google Sheets, choose Save as CSV). If you get stuck, write to us and we will help.",
  },
  {
    q: "What happens if I cancel?",
    a: "You keep access until the end of your billing period and can export your client list at any time. No contracts, no cancellation fee.",
  },
];

export async function getServerSideProps({ req, res }) {
  const supabase = createSupabaseServerClient(req, res);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) return { redirect: { destination: "/dashboard", permanent: false } };
  return { props: {} };
}

const ORG_JSONLD = JSON.stringify({
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE}/#org`,
      "name": "PawDue",
      "url": SITE,
      "description": "PawDue is a helper for dog groomers, built together with them. It tracks when each dog is due, reminds owners to rebook, and shows which clients have gone quiet.",
      "sameAs": [
        "https://x.com/pawdue_pet",
        "https://www.instagram.com/pawdue.pet",
        "https://www.facebook.com/profile.php?id=61595296317797",
        "https://www.linkedin.com/company/pawdue",
      ],
    },
    { "@type": "WebSite", "@id": `${SITE}/#site`, "name": "PawDue", "url": SITE, "publisher": { "@id": `${SITE}/#org` } },
  ],
});

const TITLE = "PawDue: never lose a regular groom client to forgetting";
const DESC =
  "PawDue tracks when every dog is due, emails the owner a friendly reminder with a booking link, and shows you who has gone quiet. Built for dog groomers. Free for up to 30 dogs.";

export default function Landing() {
  return (
    <div className={s.page}>
      <Head>
        <title>{TITLE}</title>
        <meta name="description" content={DESC} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={TITLE} />
        <meta property="og:description" content={DESC} />
        <meta property="og:url" content={SITE} />
        <meta property="og:image" content={`${SITE}/media/og.jpg`} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:image" content={`${SITE}/media/og.jpg`} />
        <link rel="canonical" href={SITE} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ORG_JSONLD }} />
      </Head>

      <LandingNav />

      <main>
        {/* HERO: one promise, one action. The video is a real grooming
            table, so a groomer recognises their own day in the first second. */}
        <section className={s.hero}>
          <div className={s.wrap}>
            <span className={s.eyebrow}><Logo size={22} withWordmark={false} className={s.pillLogo} /> Made for <RotatingWord words={["dog groomers", "mobile groomers", "solo groomers", "small salons"]} /></span>
            <h1 className={s.h1}>Your regulars are busy. <em>PawDue remembers</em> for you.</h1>
            <p className={s.lead}>
              You are great with dogs, not with spreadsheets. PawDue keeps track of when every dog is due,
              reminds the owner for you, and shows you who has gone quiet.
            </p>
            <div className={s.ctaRow}>
              <Link className={`${s.pill} ${s.pillMain}`} href="/register">Start free</Link>
              <a className={`${s.pill} ${s.pillGhost}`} href="#day">See a day with PawDue</a>
            </div>
            <p className={s.fine}>Free for up to {PLANS.free.limit} dogs. No credit card. Set up in a few minutes.</p>
          </div>

          <div className={s.stage}>
            <div className={s.stageMedia}>
              <LoopVideo name="hero" eager label="A groomer brushing out a small dog at the grooming table" />
            </div>
            <div className={`${s.float} ${s.floatA}`}>
              <span className={`${s.tag}`}>Example</span>
              <b>Bella is due in 6 days</b>
              <span>Reminder emailed to her owner with a link to book a time.</span>
            </div>
            <div className={`${s.float} ${s.floatB}`}>
              <span className={`${s.tag} ${s.tagBrass}`}>Example</span>
              <b>3 dogs have gone quiet</b>
              <span>Shown in your Lapsed list so you can send a personal message.</span>
            </div>
          </div>
        </section>

        {/* EMPATHY: say their problem back to them in their words. */}
        <section className={s.sec}>
          <div className={`${s.wrap} ${s.split}`}>
            <Reveal>
              <div className={s.kicker}>We know your day</div>
              <h2 className={s.h2}>Your hands are full. Your phone is not the priority.</h2>
              <p className={s.p}>
                When you are mid-clip, you cannot reply to a message. After a long day, you will not scroll back
                through chats to find who is due. So a regular dog slips by one more week, then another, and the
                owner books somewhere else without any bad feeling at all. Nobody did anything wrong. It is just
                that nobody remembered.
              </p>
              <blockquote className={s.pull}>
                <span className={s.pullMark} aria-hidden="true">&ldquo;</span>
                PawDue does the remembering, so the time you spend with a dog stays <mark>time with the dog.</mark>
              </blockquote>
            </Reveal>
            <Reveal className={s.splitMedia} delay={120}>
              <LoopVideo name="clippers" label="Clippers running along a dog's coat" />
            </Reveal>
          </div>
        </section>

        {/* A DAY: the product as a story, in the order it really happens. */}
        <section id="day" className={`${s.sec} ${s.secTint}`}>
          <div className={s.wrap}>
            <div className={s.center}>
              <div className={s.kicker}>A day with PawDue</div>
              <h2 className={s.h2}>You groom. It follows up.</h2>
              <p className={s.p}>Three small moments, and the rebooking is already in motion.</p>
            </div>
            <div className={s.days}>
              <Reveal className={s.day}>
                <div className={s.dayMedia}><LoopVideo name="bath" label="A dog being bathed" /></div>
                <div className={s.dayBody}>
                  <div className={s.dayTime}>After the groom</div>
                  <h3>Log it in ten seconds</h3>
                  <p>Dog, owner, breed, today&apos;s date. PawDue starts the dog on a typical cycle for its breed. You can change the weeks for any dog.</p>
                </div>
              </Reveal>
              <Reveal className={s.day} delay={100}>
                <div className={s.dayMedia}><LoopVideo name="scissors" label="Scissors trimming a dog's fur" /></div>
                <div className={s.dayBody}>
                  <div className={s.dayTime}>Weeks later, in the morning</div>
                  <h3>The owner gets a kind nudge</h3>
                  <p>An email at your local morning time, with your name on it and a link to book. At most three per cycle, so nobody feels spammed.</p>
                </div>
              </Reveal>
              <Reveal className={s.day} delay={200}>
                <div className={s.dayMedia}><LoopVideo name="paws" label="A dog's paws on the grooming table" /></div>
                <div className={s.dayBody}>
                  <div className={s.dayTime}>Same day</div>
                  <h3>They pick a time. You see it.</h3>
                  <p>The owner chooses from the open times you set, and the booking appears on your dashboard. Once they book, the reminders stop.</p>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* THE SEQUENCE: concrete, so the "will it spam my clients" fear
            is answered with the real behavior. */}
        <section className={s.sec}>
          <div className={s.wrap}>
            <div className={s.center}>
              <div className={s.kicker}>Gentle by design</div>
              <h2 className={s.h2}>Three reminders at most. Then it steps back.</h2>
              <p className={s.p}>Your clients are people you know by name. PawDue behaves like it.</p>
            </div>
            <div className={s.seq}>
              <Reveal className={s.mail}>
                <div className={s.mailStep}>1 &middot; Early heads-up</div>
                <div className={s.mailSub}>Time to plan Bella&apos;s next groom</div>
                <div className={s.mailBody}>A friendly first note while there is still plenty of room in your calendar.</div>
                <span className={s.mailBtn}>Book a time</span>
              </Reveal>
              <Reveal className={s.mail} delay={100}>
                <div className={s.mailStep}>2 &middot; Almost due</div>
                <div className={s.mailSub}>Bella is due for a groom soon</div>
                <div className={s.mailBody}>A short follow-up about five days before the due date, only if they have not booked.</div>
                <span className={s.mailBtn}>Book a time</span>
              </Reveal>
              <Reveal className={s.mail} delay={200}>
                <div className={s.mailStep}>3 &middot; Last gentle nudge</div>
                <div className={s.mailSub}>We would love to see Bella again</div>
                <div className={s.mailBody}>One more, a few days after the due date. After that, no more automatic emails. The dog moves to your Lapsed list.</div>
                <span className={s.mailBtn}>Book a time</span>
              </Reveal>
            </div>
          </div>
        </section>

        {/* WHAT A REGULAR IS WORTH: the reader's own numbers, no invented stats. */}
        <section className={`${s.sec} ${s.secTint}`}>
          <div className={s.narrow}>
            <div className={s.center}>
              <div className={s.kicker}>Do the maths yourself</div>
              <h2 className={s.h2}>What is one regular dog worth to you?</h2>
              <p className={s.p}>Type your own numbers. No guesses from us.</p>
            </div>
            <Reveal><ValueCalc /></Reveal>
          </div>
        </section>

        {/* FEATURES: photos carry the warmth, copy stays factual. */}
        <section className={s.sec}>
          <div className={s.wrap}>
            <div className={s.center}>
              <div className={s.kicker}>What you get</div>
              <h2 className={s.h2}>Everything a solo groomer actually needs. Nothing they do not.</h2>
            </div>
            <div className={s.bento}>
              <Reveal className={`${s.card} ${s.cardPhoto} ${s.c4}`}>
                <img src="/media/trim-1600.jpg" srcSet="/media/trim-800.jpg 800w, /media/trim-1600.jpg 1600w" sizes="(max-width: 900px) 100vw, 66vw" style={{ objectPosition: "60% 45%" }} alt="A groomer scissoring a Shih Tzu on the table" loading="lazy" />
                <h3>Reminders that send themselves</h3>
                <p>Every morning at your local time, PawDue emails the owner of each dog that is due, with a link to book. You do not have to remember who to message.</p>
              </Reveal>
              <Reveal className={`${s.card} ${s.c2}`} delay={80}>
                <span className={s.chip}>Smart start</span>
                <h3>Breed-aware due dates</h3>
                <p>A Poodle is not a Lab. Each dog starts on a typical cycle for its breed, and you can change it.</p>
              </Reveal>
              <Reveal className={`${s.card} ${s.cardGreen} ${s.c2}`} delay={0}>
                <span className={s.chip}>Win them back</span>
                <h3>A Lapsed list</h3>
                <p>Dogs that are a long way overdue move to their own list, and the Message button opens WhatsApp with your note already written.</p>
              </Reveal>
              <Reveal className={`${s.card} ${s.cardPhoto} ${s.c4}`} delay={80}>
                <img src="/media/yorkie-1600.jpg" srcSet="/media/yorkie-800.jpg 800w, /media/yorkie-1600.jpg 1600w" sizes="(max-width: 900px) 100vw, 66vw" alt="A Yorkshire Terrier being combed and scissored" loading="lazy" />
                <h3>Owners rebook without calling you</h3>
                <p>No app for the owner to download. They tap the link, pick an open time, and it shows up on your dashboard.</p>
              </Reveal>
              <Reveal className={`${s.card} ${s.c3}`}>
                <span className={s.chip}>Moving over</span>
                <h3>Bring your client list</h3>
                <p>Add dogs one by one or import a CSV. You do not start from zero.</p>
              </Reveal>
              <Reveal className={`${s.card} ${s.c3}`} delay={80}>
                <span className={s.chip}>Your calendar</span>
                <h3>Bookings in your phone calendar</h3>
                <p>A calendar feed shows your PawDue bookings next to the rest of your life.</p>
              </Reveal>
            </div>
          </div>
        </section>

        {/* BREED: let the reader touch the real date logic. */}
        <section className={`${s.sec} ${s.secTint}`}>
          <div className={`${s.wrap} ${s.breedGrid}`}>
            <Reveal>
              <div className={s.kicker}>Try the real thing</div>
              <h2 className={s.h2}>Pick a breed. See when PawDue would send the reminder.</h2>
              <p className={s.p}>This is the same date maths PawDue uses for every dog in your list.</p>
              <div className="pd-landing" style={{ marginTop: 28, background: "transparent", fontFamily: "inherit" }}><DueDateCalculator /></div>
            </Reveal>
            <Reveal className={s.collage} delay={120}>
              <img src="/media/maltese-800.jpg" alt="A freshly groomed white Maltese" loading="lazy" />
              <img src="/media/dryer-800.jpg" alt="A small dog being blow-dried" loading="lazy" />
              <img src="/media/poodle-legs-800.jpg" alt="A groomer shaping the legs of a Poodle" loading="lazy" />
            </Reveal>
          </div>
        </section>

        {/* BUILDING IN PUBLIC: honest, specific, and shows the work continues.
            Update this list whenever something ships. */}
        <section className={`${s.sec} ${s.secDark}`}>
          <div className={s.wrap}>
            <div className={s.center}>
              <div className={s.kicker}>Still building, openly</div>
              <h2 className={s.h2}>PawDue gets better every week, because groomers keep telling us what is missing.</h2>
              <p className={s.p}>No hype. Here is what has shipped and what has not.</p>
            </div>
            <div className={s.ship}>
              <div className={`${s.shipBox} ${s.shipDone}`}>
                <h3>Recently built</h3>
                <ul className={s.list}>
                  <li><i>&#10003;</i><span>Reminder sequence: up to three gentle emails per cycle, stopping once they book</span></li>
                  <li><i>&#10003;</i><span>Lapsed clients list, so nobody quietly disappears</span></li>
                  <li><i>&#10003;</i><span>Message button: WhatsApp opens with your note already written</span></li>
                  <li><i>&#10003;</i><span>Booking times that follow your own timezone</span></li>
                  <li><i>&#10003;</i><span>CSV import for your existing client list</span></li>
                  <li><i>&#10003;</i><span>Faster booking pages for owners</span></li>
                </ul>
              </div>
              <div className={`${s.shipBox} ${s.shipNext}`}>
                <h3>Not built yet</h3>
                <ul className={s.list}>
                  <li><i className={s.hollow} /><span>Automatic WhatsApp and SMS reminders</span></li>
                  <li><i className={s.hollow} /><span>Taking payments or sending invoices</span></li>
                  <li><i className={s.hollow} /><span>Separate staff logins</span></li>
                  <li><i className={s.hollow} /><span>A phone app (it runs in your browser today)</span></li>
                </ul>
              </div>
            </div>
            <div className={s.founder}>
              <p><b>From the founder.</b> PawDue is built by one person who wants groomers to spend their energy on dogs, not on chasing rebookings. I read every message sent through the feedback page. If something in PawDue slows you down, tell me and it goes on the list.</p>
            </div>
          </div>
        </section>

        {/* PRICING TEASER: numbers come from lib/plans.js so they cannot drift. */}
        <section className={s.sec}>
          <div className={`${s.wrap} ${s.center}`}>
            <div className={s.kicker}>Simple pricing</div>
            <h2 className={s.h2}>Start free. Pay only when your book grows.</h2>
            <div className={s.plans}>
              <Reveal className={s.plan}>
                <h3>{PLANS.free.name}</h3>
                <div className={s.price}>{PLANS.free.priceLabel}</div>
                <p>Up to {PLANS.free.limit} dogs. No card.</p>
              </Reveal>
              <Reveal className={`${s.plan} ${s.planHot}`} delay={100}>
                <h3>{PLANS.starter.name}</h3>
                <div className={s.price}>{PLANS.starter.priceLabel}</div>
                <p>Up to {PLANS.starter.limit} dogs.</p>
              </Reveal>
              <Reveal className={s.plan} delay={200}>
                <h3>{PLANS.pro.name}</h3>
                <div className={s.price}>{PLANS.pro.priceLabel}</div>
                <p>Unlimited dogs.</p>
              </Reveal>
            </div>
            <div className={s.ctaRow}>
              <Link className={`${s.pill} ${s.pillGhost}`} href="/pricing">Compare plans</Link>
            </div>
          </div>
        </section>

        <section className={`${s.sec} ${s.secTint}`}>
          <div className={s.wrap}>
            <div className={s.center}>
              <div className={s.kicker}>Questions</div>
              <h2 className={s.h2}>Before you start</h2>
            </div>
            <div className={`${s.faq} pd-landing`} style={{ background: "transparent", fontFamily: "inherit" }}><Faq items={FAQ_ITEMS} /></div>
          </div>
        </section>

        <section style={{ padding: "100px 0 100px" }}>
          <div className={s.final}>
            <h2 className={s.h2}>Give your regulars a reason to come back.</h2>
            <p className={s.p}>Add your first dogs today. It is free, and it takes a few minutes.</p>
            <div className={s.ctaRow}>
              <Link className={`${s.pill} ${s.pillBrass}`} href="/register">Create your free account</Link>
            </div>
          </div>
        </section>
      </main>

      <div className="pd-landing" style={{ fontFamily: "inherit" }}><SiteFooter /></div>
    </div>
  );
}
