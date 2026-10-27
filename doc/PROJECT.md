# PawDue: Project Guide

Read this file first. It explains what PawDue is, how the system fits together, where every file lives, and the rules to follow so nobody gets confused. Last updated: October 2026.

Contents
1. What PawDue is
2. Tech stack and services
3. Run it on your computer
4. Environment variables
5. System architecture
6. How the main flows work
7. Business rules (do not change by accident)
8. Database
9. API reference
10. Pages and the dashboard
11. Full project tree
12. What each file does
13. Deploying and operating
14. Testing
15. Rules, gotchas and known gaps

---

## 1. What PawDue is

PawDue is a small SaaS for dog groomers. A groomer adds the dogs they groom (name, breed, owner contact, last groom date). PawDue knows how often each breed needs grooming, works out when each dog is due, and emails the owner a reminder with a link to book a time. The owner picks a slot on a public booking page. The groomer sees the booking in the dashboard, gets an email, and can add it to their calendar.

Goal: regular clients should not quietly drift away. Tagline: "Built with dog groomers. Growing with dog groomers."

Who uses it
- Groomer (the customer): logs in, uses the dashboard.
- Dog owner (the groomer's client): never has an account. Receives emails and uses a public booking page opened with a secret link.

Target markets: US, UK, Australia (English). Site: https://pawdue.pet

Plans (see lib/plans.js)
| Plan | Price | Dog limit |
|---|---|---|
| Free | $0 | 30 |
| Starter | $29/month | 200 |
| Pro | $49/month | unlimited |

Paid-plan feature gating is not turned on yet. Only the dog limit is enforced.

## 2. Tech stack and services

| Part | Technology |
|---|---|
| App | Next.js 15 (pages router), React 18, plain JavaScript |
| Styling | Global CSS plus CSS modules, font Plus Jakarta Sans (next/font) |
| Database and login | Supabase (Postgres, Auth, Realtime), `@supabase/ssr` and `@supabase/supabase-js` |
| Payments | Dodo Payments (merchant of record), `dodopayments`, `standardwebhooks` |
| Email | Resend (`resend`) |
| SMS | Twilio (optional) |
| WhatsApp | Meta WhatsApp Cloud API (optional) |
| Hosting | Vercel |
| Scheduled job | GitHub Actions hits the cron endpoint every hour. Vercel cron also calls it once a day |
| Tests | Vitest |

Everything is JavaScript. There is no TypeScript and no separate backend server: API routes live inside the Next.js app.

## 3. Run it on your computer

```bash
npm install
# create .env.local (see section 4) with at least the three Supabase variables
npm run dev        # http://localhost:3000
npm test           # runs the unit tests
npm run build      # production build (run this before pushing big changes)
```

First time on a new Supabase project: run the SQL files in this order in the Supabase SQL Editor (all are safe to run twice).
1. `supabase/schema.sql`
2. `supabase/add-availability-settings.sql`
3. `supabase/add-business-profile.sql`
4. `supabase/add-reminder-sequence.sql`
5. `supabase/security-hardening.sql`

The other `add-*.sql` files are older migrations that are already folded into `schema.sql`. They only matter for an old database made before those changes.

Supabase settings you must do once
- Authentication, URL Configuration: Site URL `https://pawdue.pet`. Redirect URLs: `https://pawdue.pet/reset-password`, `https://www.pawdue.pet/reset-password`, `http://localhost:3000/reset-password`.
- Authentication, SMTP: set a custom SMTP (Resend works) before real users sign up. The default Supabase sender only reaches your own team and has a very low limit. Signup confirmation and password reset emails depend on this.

## 4. Environment variables

Put them in `.env.local` for local work and in Vercel, Settings, Environment Variables for production. Never commit them. There is no `.env.example` in the repo yet, so this table is the reference.

| Variable | Required | Used for |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | Supabase public key (browser safe) |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | Server only. Bypasses row security. Keep secret, rotate if leaked |
| `NEXT_PUBLIC_APP_URL` | yes | Public site address, used in email links, e.g. `https://pawdue.pet` |
| `RESEND_API_KEY` | yes for email | Sending email |
| `REMINDER_FROM_EMAIL` | yes for email | Sender address on a domain verified in Resend |
| `CRON_SECRET` | yes in production | Protects `/api/cron/send-reminders`. Same value goes in the GitHub secret |
| `REMINDER_SEND_HOUR` | recommended | 0 to 23. Reminders go out in the first 6 local hours after this hour (use 9) |
| `DODO_PAYMENTS_API_KEY` | for billing | Dodo API |
| `DODO_PAYMENTS_ENVIRONMENT` | for billing | `test_mode` or `live_mode` (default test_mode) |
| `DODO_PAYMENTS_WEBHOOK_KEY` | for billing | Verifies Dodo webhooks |
| `DODO_STARTER_PRODUCT_ID`, `DODO_PRO_PRODUCT_ID` | for billing | Dodo product ids for the two paid plans |
| `FEEDBACK_TO_EMAIL` | optional | Where feedback form messages go |
| `OPS_ALERT_EMAIL` | optional | Where "cron failed" alerts go (falls back to FEEDBACK_TO_EMAIL, then REMINDER_FROM_EMAIL) |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER` | optional | SMS fallback |
| `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_TOKEN`, `WHATSAPP_TEMPLATE_NAME`, `WHATSAPP_TEMPLATE_LANG` | optional | WhatsApp fallback (template message) |

GitHub repository secrets (for the hourly job): `APP_URL` (exact site address, no trailing slash, no redirect) and `CRON_SECRET`.

## 5. System architecture

```
   Dog owner                         Groomer
   (no account)                      (logs in)
      |                                 |
      | email link                      | browser
      v                                 v
 /book/[token]  ----------->   Next.js app on Vercel  <------ Dodo Payments
 public booking page            pages/  +  pages/api/          (webhook)
                                   |            |
                                   |            +--> Resend (email), Twilio, WhatsApp
                                   v
                              Supabase
                      Postgres + Auth + Realtime

 GitHub Actions (every hour) --> /api/cron/send-reminders --> emails owners
```

Three kinds of access to the database. Mixing them up is the most common mistake.
1. Browser client (`lib/supabase/client.js`): uses the logged-in user's session. Row Level Security (RLS) limits every query to that user's own rows.
2. Server client (`lib/supabase/server.js`): used in API routes and `getServerSideProps`. Reads the user from cookies. Also under RLS.
3. Admin client (`lib/supabase/admin.js`): uses the service role key and ignores RLS. Only for server code that must act without a logged-in user: the cron job, the Dodo webhook, public booking routes, account deletion. Never import it in browser code.

Public routes have no login. They are protected by a secret token in the URL:
- `dogs.booking_token` (one per dog) opens the booking page and lets the owner book or opt out.
- `business_settings.calendar_token` (one per groomer) opens the calendar feed. Rotating it kills the old link.

## 6. How the main flows work

### 6.1 Sign up and login
`pages/register.js` calls Supabase `signUp` (email confirmation required). `pages/login.js` signs in. The dashboard page (`getServerSideProps`) redirects to login when there is no session.

### 6.2 Forgot password
1. `pages/forgot-password.js` sends a reset email using the implicit flow, so the link works on any device or browser. It always shows the same neutral message (does not reveal whether an email exists) and has a 60 second resend cooldown.
2. The email link opens `/reset-password` with the session in the URL.
3. `pages/reset-password.js` sets the session, asks for a new password (min 8 characters), calls `updateUser`, then goes to the dashboard. If the link is bad it shows the reason and a link to request a new one.
The redirect URL must be allow-listed in Supabase (section 3).

### 6.3 Adding dogs
The groomer adds a dog in the dashboard (`DogModal`) or imports a CSV (`ImportDogsModal`, `lib/importDogs.js`, `lib/csv.js`). The server validates again (`lib/validate.js`). The default interval comes from the breed (`lib/breedIntervals.js`) and can be edited. The dog limit is checked in the API and also by a database trigger (`security-hardening.sql`), so it cannot be bypassed.

### 6.4 Reminders (the core feature)
`pages/api/cron/send-reminders.js` runs every hour (GitHub Actions at minute 5, plus one daily Vercel cron). For each active (not archived) dog it:
1. Finds the groomer's time zone and checks the local hour is inside the send window (starts at `REMINDER_SEND_HOUR`, lasts 6 hours).
2. Skips the dog if the owner opted out, an upcoming booking exists, or there is no usable channel.
3. Asks `lib/reminderPlan.js` which stage is due (section 7).
4. Groups dogs by owner so one owner gets one email (`lib/reminderEmail.js`).
5. Sends through `lib/messaging.js`: email first, then WhatsApp, then SMS if the earlier ones are missing or fail.
6. Saves the result on the dog (count, cycle date, last sent, channel, result).
Paid plans are processed first in a batch. If the whole job throws, an alert email goes to `OPS_ALERT_EMAIL`.
Test helpers: `?dryRun=1` sends and writes nothing and shows what would happen. `?force=1` ignores the hour check. Both need the `Authorization: Bearer CRON_SECRET` header.
The same dog is never emailed twice in a row because of a minimum gap between reminders, so the daily Vercel call and the hourly GitHub call do not cause duplicates.

### 6.5 Booking
1. Owner opens `/book/[token]` from the reminder email. The page loads free slots from `/api/bookings/availability/[token]` (built by `lib/booking.js` from the groomer's hours, break, slot length, days ahead, existing bookings, all in the groomer's time zone).
2. Owner picks a slot. `/api/bookings/create` re-checks that the slot is free, allows only one upcoming booking per dog, and saves it. A unique database index on (groomer, slot time) stops double booking.
3. `lib/bookingNotify.js` emails the groomer ("New booking") and the owner (confirmation with a calendar file attached). A failed email never undoes the booking.
4. The dashboard Bookings tab updates live (Supabase Realtime) and also refreshes every minute and when the tab regains focus.
5. The groomer can cancel from the dashboard. `/api/bookings/cancel` deletes the booking (the slot opens again) and emails the owner a link to rebook.

### 6.6 Calendar
The groomer creates a private link in the dashboard (`CalendarFeedCard`). `/api/calendar/[token]` serves an `.ics` feed built by `lib/ical.js`. The card has one-click Add to Google, Apple and Outlook buttons. It is one-way (bookings go into the calendar). Google refreshes subscribed calendars slowly (can be many hours), which is why the email is the instant notification. The groomer's booking email only attaches a calendar file when they have no feed, to avoid duplicates.

### 6.7 Billing
Pricing page calls `/api/dodo/create-checkout-session`. After payment Dodo calls `/api/dodo/webhook`, which verifies the signature (raw body, so body parsing is off for that route) and writes the plan to `subscriptions`. `/api/dodo/create-portal-session` opens the customer portal. Deleting an account cancels the Dodo subscription first (`/api/account/delete`).

### 6.8 Money numbers
"Revenue recovered" = number of bookings made through reminder links times the groomer's default service price (`business_settings.default_service_price`). Endpoints in `pages/api/stats/`.

### 6.9 Marketing, SEO and blog
`pages/index.js` landing, `pricing.js`, `help.js`, and a blog under `pages/blog/`. Posts are plain data in `lib/blog/posts.js` (no CMS). `pages/sitemap.xml.js` builds the sitemap dynamically, `pages/blog/rss.xml.js` the feed, `public/robots.txt` points to the sitemap. Pages carry canonical, Open Graph and JSON-LD tags. Photos and videos are stock footage in `public/media/` and must be described as illustrative, never as real customers.

## 7. Business rules (do not change by accident)

Reminder stages (`lib/reminderPlan.js`): at most 3 per grooming cycle.
1. Heads-up: up to 14 days before due (6 to 14 depending on the interval).
2. Nudge: 5 days before due.
3. Overdue: 3 days after due.
- Missed stages are skipped, not replayed: a dog added with 2 days left gets one reminder, not three.
- Minimum gap between reminders: 2 days.
- A failed send is retried after about 20 hours, at most 3 failed attempts, then stop until the dog is groomed again.
- A dog more than 30 days overdue is "lapsed": no automatic email. The groomer decides (Message button opens WhatsApp click-to-chat from `lib/manualMessage.js`).
- Opt-out, archived dogs and dogs with an upcoming booking get no reminders.
- A last-groom date corrected by up to 3 days counts as the same cycle.

Status (`lib/breedIntervals.js`): overdue when days left is below 0, soon when 7 or fewer, otherwise ok. Days are counted in the groomer's own time zone.

Time zones: store UTC, show in the groomer's time zone (`business_settings.timezone`, default UTC). The server runs in UTC, so never use server local time for "today" or slot hours.

Plan limits live in two places and must stay equal: `lib/plans.js` and the trigger in `supabase/security-hardening.sql`.

Email text: no em dashes anywhere in the web app. Keep the tone plain and friendly.

## 8. Database

All tables are in the `public` schema with RLS on. A groomer can only read and change rows where `user_id` equals their own id.

| Table | Purpose | Key columns |
|---|---|---|
| `dogs` | One row per dog | `user_id`, `dog_name`, `owner_name`, `phone`, `owner_email`, `breed`, `interval_weeks`, `last_groom_date`, `notes`, `is_archived`, `opted_out`, `booking_token`, `last_reminder_sent_at`, `last_reminder_stage`, `last_reminder_channel`, `last_reminder_result`, `reminder_count`, `reminder_cycle_date`, `reminder_fail_count` |
| `bookings` | Appointments made through booking links | `user_id`, `dog_id`, `slot_at`, `status` (confirmed), `created_at`. Unique on (`user_id`, `slot_at`) |
| `business_settings` | Per groomer profile | `default_service_price`, `timezone`, `business_name`, `business_phone`, `reply_to_email`, `calendar_token` |
| `availability_settings` | Booking hours | `working_days`, `start_time`, `end_time`, `slot_minutes`, `break_start`, `break_end`, `days_ahead` |
| `subscriptions` | Plan from Dodo. No row means Free | `plan`, `status`, `dodo_customer_id`, `dodo_subscription_id`, `current_period_end`. Written only by the server |

Other facts
- `auth.users` is Supabase's own table. Deleting a user cascades to all their rows.
- Realtime is on for `bookings` and `dogs`.
- Triggers: `updated_at` is refreshed on update, and `dogs_enforce_limit` blocks inserts above the plan limit.
- Feedback has no table. It is emailed.
- If a migration was not run, some routes fall back to older columns instead of crashing. Run the migrations anyway.

## 9. API reference

All routes are under `pages/api/`. "Login" means a logged-in groomer (cookie session). "Public" means no login (secret token or open). "Secret" means a bearer secret.

| Route | Methods | Access | What it does |
|---|---|---|---|
| `/api/dogs` | GET, POST | Login | List dogs (`?archived=1` for archived), add a dog |
| `/api/dogs/[id]` | PATCH, DELETE | Login | Edit, archive, opt out or delete a dog |
| `/api/dogs/import` | POST | Login | Bulk import, respects the plan limit |
| `/api/dogs/export` | GET | Login | CSV download |
| `/api/bookings/list` | GET | Login | Upcoming bookings |
| `/api/bookings/cancel` | POST | Login | Cancel a booking and email the owner |
| `/api/bookings/availability/[token]` | GET | Public (rate limited) | Free slots for a dog's link |
| `/api/bookings/create` | POST | Public (rate limited) | Book a slot |
| `/api/bookings/opt-out` | POST | Public (not rate limited yet) | Stop reminders for a dog |
| `/api/availability` | GET, PUT | Login | Booking hours |
| `/api/settings/business` | GET, PATCH | Login | Profile, time zone, default price |
| `/api/settings/calendar` | GET, POST | Login | Create or rotate the feed link |
| `/api/settings/setup-status` | GET | Login | What setup is missing |
| `/api/calendar/[token]` | GET | Public | The `.ics` feed |
| `/api/stats/revenue-recovered` | GET | Login | Revenue recovered number |
| `/api/stats/revenue-timeseries` | GET | Login | Weekly chart data |
| `/api/billing/status` | GET | Login | Plan and limit |
| `/api/dodo/create-checkout-session` | POST | Login | Start a paid plan |
| `/api/dodo/create-portal-session` | POST | Login | Manage or cancel plan |
| `/api/dodo/webhook` | POST | Signature | Dodo to us: set the plan |
| `/api/account/delete` | POST | Login | Cancel billing, delete account and data (body must contain `DELETE`) |
| `/api/feedback` | POST | Public (rate limited) | Email feedback to the team |
| `/api/cron/send-reminders` | GET | Secret | The reminder job |

Public routes use a simple in-memory rate limiter (`lib/rateLimit.js`). On Vercel each instance has its own memory, so it is best effort, not a hard guarantee.

## 10. Pages and the dashboard

| URL | File | Who |
|---|---|---|
| `/` | `pages/index.js` | Everyone |
| `/pricing`, `/help` | `pages/pricing.js`, `pages/help.js` | Everyone |
| `/blog`, `/blog/[slug]`, `/blog/rss.xml` | `pages/blog/*` | Everyone |
| `/login`, `/register`, `/forgot-password`, `/reset-password` | `pages/*.js` | Groomers |
| `/dashboard` | `pages/dashboard.js` | Logged-in groomer |
| `/book/[token]` | `pages/book/[token].js` | Dog owner, from email |
| `/feedback`, `/privacy`, `/terms` | `pages/*.js` | Everyone |
| `/sitemap.xml` | `pages/sitemap.xml.js` | Search engines |

`pages/dashboard.js` is one large page with tabs (state `activeView`): Dogs, Analytics, Bookings, Archived, Availability, Billing. It also holds profile, time zone, calendar and account settings. If it grows more, split tabs into components.

Languages: the public booking page and marketing nav/footer have translations (`lib/i18n/`). The groomer dashboard is English only.

## 11. Full project tree

Files that are tracked in git. `node_modules/`, `.next/`, `.env`, `.env.local` and `.vercel/` exist locally but are ignored. `public/media/` holds 29 image and video files (listed in section 12).

```
├── .github/
│   └── workflows/
│       └── hourly-reminders.yml
├── components/
│   ├── landing/
│   │   ├── BlogBody.js
│   │   ├── LandingNav.js
│   │   ├── LoopVideo.js
│   │   ├── RotatingWord.js
│   │   └── ValueCalc.js
│   ├── ActivityFeed.js
│   ├── Avatar.js
│   ├── BusinessProfileCard.js
│   ├── CalendarFeedCard.js
│   ├── ClientStatusCard.js
│   ├── ComparisonTable.js
│   ├── DogModal.js
│   ├── DueDateCalculator.js
│   ├── Faq.js
│   ├── HeroPreview.js
│   ├── icons.js
│   ├── ImportDogsModal.js
│   ├── LanguageSuggestionBanner.js
│   ├── LanguageSwitcher.js
│   ├── LocalTimeNow.js
│   ├── Logo.js
│   ├── MarketingNav.js
│   ├── PhoneInput.js
│   ├── ProblemSection.js
│   ├── ProductTour.js
│   ├── ReminderBreakdown.js
│   ├── Reveal.js
│   ├── RevenueBanner.js
│   ├── RevenueChart.js
│   ├── SetupBanner.js
│   ├── SiteFooter.js
│   ├── StatusDonut.js
│   └── Testimonials.js
├── lib/
│   ├── blog/
│   │   └── posts.js
│   ├── i18n/
│   │   ├── countryToLanguage.js
│   │   ├── LanguageContext.js
│   │   ├── translations.js
│   │   └── translations.test.js
│   ├── supabase/
│   │   ├── admin.js
│   │   ├── client.js
│   │   └── server.js
│   ├── booking.js
│   ├── booking.test.js
│   ├── bookingEmail.js
│   ├── bookingEmail.test.js
│   ├── bookingNotify.js
│   ├── bookingNotify.test.js
│   ├── breedIntervals.js
│   ├── breedIntervals.test.js
│   ├── countries.js
│   ├── csv.js
│   ├── dodo.js
│   ├── ical.js
│   ├── importDogs.js
│   ├── localTime.js
│   ├── localTime.test.js
│   ├── manualMessage.js
│   ├── manualMessage.test.js
│   ├── messaging.js
│   ├── phone.js
│   ├── phone.test.js
│   ├── plans.js
│   ├── rateLimit.js
│   ├── reminderEmail.js
│   ├── reminderEmail.test.js
│   ├── reminderPlan.js
│   ├── reminderPlan.test.js
│   ├── validate.js
│   └── validate.test.js
├── pages/
│   ├── api/
│   │   ├── account/
│   │   │   └── delete.js
│   │   ├── billing/
│   │   │   └── status.js
│   │   ├── bookings/
│   │   │   ├── availability/
│   │   │   │   └── [token].js
│   │   │   ├── cancel.js
│   │   │   ├── create.js
│   │   │   ├── list.js
│   │   │   └── opt-out.js
│   │   ├── calendar/
│   │   │   └── [token].js
│   │   ├── cron/
│   │   │   └── send-reminders.js
│   │   ├── dodo/
│   │   │   ├── create-checkout-session.js
│   │   │   ├── create-portal-session.js
│   │   │   └── webhook.js
│   │   ├── dogs/
│   │   │   ├── [id].js
│   │   │   ├── export.js
│   │   │   ├── import.js
│   │   │   └── index.js
│   │   ├── settings/
│   │   │   ├── business.js
│   │   │   ├── calendar.js
│   │   │   └── setup-status.js
│   │   ├── stats/
│   │   │   ├── revenue-recovered.js
│   │   │   └── revenue-timeseries.js
│   │   ├── availability.js
│   │   └── feedback.js
│   ├── blog/
│   │   ├── [slug].js
│   │   ├── index.js
│   │   └── rss.xml.js
│   ├── book/
│   │   └── [token].js
│   ├── _app.js
│   ├── _document.js
│   ├── dashboard.js
│   ├── feedback.js
│   ├── forgot-password.js
│   ├── help.js
│   ├── index.js
│   ├── login.js
│   ├── pricing.js
│   ├── privacy.js
│   ├── register.js
│   ├── reset-password.js
│   ├── sitemap.xml.js
│   └── terms.js
├── public/
│   └── robots.txt
├── styles/
│   ├── blog.module.css
│   ├── globals.css
│   └── landing.module.css
├── supabase/
│   ├── add-availability-settings.sql
│   ├── add-booking-system.sql
│   ├── add-business-profile.sql
│   ├── add-dog-details.sql
│   ├── add-dogs-realtime.sql
│   ├── add-email-channel.sql
│   ├── add-groomer-features.sql
│   ├── add-reminder-sequence.sql
│   ├── add-revenue-tracking.sql
│   ├── add-timezone.sql
│   ├── schema.sql
│   └── security-hardening.sql
├── .gitignore
├── LICENSE
├── middleware.js
├── next.config.js
├── package-lock.json
├── package.json
├── PROJECT.md
└── vercel.json
```

## 12. What each file does

### Root and config

| File | What it does |
|---|---|
| `.github/workflows/hourly-reminders.yml` | GitHub Actions job: calls the reminder endpoint every hour (needs APP_URL and CRON_SECRET repo secrets) |
| `.gitignore` | Ignores node_modules, .next, .env, .env.local, .vercel, logs |
| `LICENSE` | License file |
| `PROJECT.md` | This guide. Update it when you add a file, route, table or env variable |
| `middleware.js` | Reads the visitor country and sets a language-suggestion cookie. Does not redirect or change language |
| `next.config.js` | Next.js config: security headers on every page (no CSP on purpose) |
| `package-lock.json` | Locked dependency versions (commit it) |
| `package.json` | Scripts (dev, build, start, test) and dependencies |
| `vercel.json` | Vercel cron: daily call of /api/cron/send-reminders at 09:00 UTC (the hourly job is the GitHub workflow) |

### pages/ (screens)

| File | What it does |
|---|---|
| `pages/_app.js` | App wrapper: global CSS, Plus Jakarta Sans font, language provider |
| `pages/_document.js` | HTML document shell |
| `pages/blog/[slug].js` | Blog article page with SEO tags and BlogPosting JSON-LD (static) |
| `pages/blog/index.js` | Blog list (static) |
| `pages/blog/rss.xml.js` | RSS feed for the blog (server rendered XML) |
| `pages/book/[token].js` | PUBLIC booking page for a dog owner (opened from a reminder link). Pick a slot, opt out of reminders |
| `pages/dashboard.js` | The whole groomer app in one page: dogs, analytics, bookings, archived, availability, billing, settings |
| `pages/feedback.js` | Feedback form (emails the team) |
| `pages/forgot-password.js` | Asks for an email and sends the password reset link (implicit flow, works on any device) |
| `pages/help.js` | Help centre with search (topics plus FAQ) |
| `pages/index.js` | Landing page (hero, how it works, pricing teaser, FAQ). Logged-in users see a dashboard link in the nav |
| `pages/login.js` | Groomer login, link to forgot password |
| `pages/pricing.js` | Pricing page and plan picker. Starts Dodo checkout via /api/dodo/create-checkout-session |
| `pages/privacy.js` | Privacy policy |
| `pages/register.js` | Groomer sign up (email confirmation is used) |
| `pages/reset-password.js` | Page the reset email opens. Reads the session from the link, lets the user choose a new password |
| `pages/sitemap.xml.js` | Dynamic sitemap: static pages plus every blog post |
| `pages/terms.js` | Terms of service |

### pages/api/ (server routes)

| File | What it does |
|---|---|
| `pages/api/account/delete.js` | Cancel Dodo subscription, then delete the user and all their data (needs typing DELETE) |
| `pages/api/availability.js` | GET and PUT the groomer's booking hours (working days, start/end, slot length, break, days ahead) |
| `pages/api/billing/status.js` | Current plan, status and dog limit for the logged-in groomer |
| `pages/api/bookings/availability/[token].js` | PUBLIC: free slots for a dog's booking link |
| `pages/api/bookings/cancel.js` | Groomer cancels a booking: deletes it (frees the slot) and emails the owner |
| `pages/api/bookings/create.js` | PUBLIC: owner books a slot. Re-checks the slot, saves it, emails groomer and owner |
| `pages/api/bookings/list.js` | Upcoming bookings for the logged-in groomer (with dog and owner details) |
| `pages/api/bookings/opt-out.js` | PUBLIC: owner stops reminders for a dog (uses the booking token) |
| `pages/api/calendar/[token].js` | PUBLIC .ics calendar feed (secret token in the URL) for Google/Apple/Outlook |
| `pages/api/cron/send-reminders.js` | The reminder engine. Protected by CRON_SECRET. See section 6 |
| `pages/api/dodo/create-checkout-session.js` | Creates a Dodo checkout for Starter or Pro |
| `pages/api/dodo/create-portal-session.js` | Opens the Dodo customer portal (manage or cancel plan) |
| `pages/api/dodo/webhook.js` | Dodo webhook: verifies the signature and writes the plan to the subscriptions table |
| `pages/api/dogs/[id].js` | PATCH (edit, archive, opt out, mark groomed) or DELETE one dog |
| `pages/api/dogs/export.js` | Download all dogs as CSV |
| `pages/api/dogs/import.js` | Import many dogs from CSV rows (re-validates, skips duplicates, stops at the plan limit) |
| `pages/api/dogs/index.js` | List dogs (?archived=1 for archived) and create a dog |
| `pages/api/feedback.js` | Emails feedback to FEEDBACK_TO_EMAIL (rate limited, no database table) |
| `pages/api/settings/business.js` | Business profile and timezone (name, phone, reply-to, default price) |
| `pages/api/settings/calendar.js` | Create or rotate the calendar feed link |
| `pages/api/settings/setup-status.js` | What the groomer still needs to set up (powers the setup banner) |
| `pages/api/stats/revenue-recovered.js` | Revenue recovered number (bookings x default service price) |
| `pages/api/stats/revenue-timeseries.js` | Weekly bookings and revenue for the chart |

### lib/ (logic)

| File | What it does |
|---|---|
| `lib/blog/posts.js` | Blog content: SITE, AUTHOR, POSTS array, helpers (getPost, relatedPosts, formatDate) |
| `lib/booking.js` | Availability settings, time zone maths, and slot generation |
| `lib/booking.test.js` | Tests for slot generation and time zones |
| `lib/bookingEmail.js` | Builds booking emails (groomer, owner, cancellation) and single-event .ics files |
| `lib/bookingEmail.test.js` | Tests for booking emails and calendar files |
| `lib/bookingNotify.js` | Loads context and sends the booking emails. Never throws (a failed email must not undo a booking) |
| `lib/bookingNotify.test.js` | Tests for booking notifications (mocked email sender) |
| `lib/breedIntervals.js` | Breed to grooming interval table, due date and status (ok, soon, overdue) |
| `lib/breedIntervals.test.js` | Tests for intervals and status |
| `lib/countries.js` | Country list with dial codes for the phone input |
| `lib/csv.js` | Dependency-free CSV reader and writer |
| `lib/dodo.js` | Dodo client and plan to product id mapping |
| `lib/i18n/LanguageContext.js` | Language from the browser setting, cached in localStorage |
| `lib/i18n/countryToLanguage.js` | Country to language suggestions (non-English only) |
| `lib/i18n/translations.js` | Strings for the public booking page and marketing nav/footer |
| `lib/i18n/translations.test.js` | Checks every language has every key |
| `lib/ical.js` | Builds the .ics calendar feed |
| `lib/importDogs.js` | Turns a spreadsheet row into a dog record (used in browser and server) |
| `lib/localTime.js` | Current hour in a given time zone (for hourly sending) |
| `lib/localTime.test.js` | Tests for local time |
| `lib/manualMessage.js` | WhatsApp click-to-chat links and text for the dashboard Message button |
| `lib/manualMessage.test.js` | Tests for manual messages |
| `lib/messaging.js` | Sending: email (Resend), SMS (Twilio), WhatsApp (Meta Cloud API), and the channel fallback chain |
| `lib/phone.js` | Splits a stored phone number into country and local part |
| `lib/phone.test.js` | Tests for phone parsing |
| `lib/plans.js` | Plans and dog limits: Free 30, Starter 200, Pro unlimited |
| `lib/rateLimit.js` | Best-effort per-IP limiter for public endpoints |
| `lib/reminderEmail.js` | Builds the reminder email (one per owner, subject and body change per stage) |
| `lib/reminderEmail.test.js` | Tests for reminder emails |
| `lib/reminderPlan.js` | Decides which reminder, if any, a dog gets today (max 3 per cycle) |
| `lib/reminderPlan.test.js` | Tests for the reminder rules |
| `lib/supabase/admin.js` | Service-role client (bypasses RLS). Server only, never import in the browser |
| `lib/supabase/client.js` | Browser client |
| `lib/supabase/server.js` | Server client that reads the logged-in user from cookies |
| `lib/validate.js` | Server-side validation for dog records |
| `lib/validate.test.js` | Tests for validation |

### components/

| File | What it does |
|---|---|
| `components/ActivityFeed.js` | Recent activity list on the dashboard |
| `components/Avatar.js` | Round initial avatar for dogs |
| `components/BusinessProfileCard.js` | Salon name, phone and reply-to (shown in reminder emails) |
| `components/CalendarFeedCard.js` | Calendar feed link plus one-click Add to Google/Apple/Outlook buttons |
| `components/ClientStatusCard.js` | Status card on the public booking page |
| `components/ComparisonTable.js` | UNUSED (old marketing component) |
| `components/DogModal.js` | Add or edit a dog |
| `components/DueDateCalculator.js` | Landing page breed calculator |
| `components/Faq.js` | FAQ accordion (landing, pricing, help) |
| `components/HeroPreview.js` | UNUSED (old animated hero preview) |
| `components/ImportDogsModal.js` | CSV import dialog with row-by-row checks |
| `components/LanguageSuggestionBanner.js` | UNUSED (reads the cookie from middleware) |
| `components/LanguageSwitcher.js` | UNUSED |
| `components/LocalTimeNow.js` | Shows current local time so the groomer can confirm the timezone |
| `components/Logo.js` | Shared brand mark and wordmark. Do not change it |
| `components/MarketingNav.js` | Nav for terms, privacy and feedback pages |
| `components/PhoneInput.js` | Country-aware phone field |
| `components/ProblemSection.js` | UNUSED (old landing section) |
| `components/ProductTour.js` | UNUSED (old animated tour) |
| `components/ReminderBreakdown.js` | Dashboard breakdown of who is due and when |
| `components/Reveal.js` | Fade-in on scroll |
| `components/RevenueBanner.js` | Revenue recovered banner |
| `components/RevenueChart.js` | Weekly revenue chart |
| `components/SetupBanner.js` | Reminds the groomer to finish setup |
| `components/SiteFooter.js` | Public footer with links and social icons |
| `components/StatusDonut.js` | Donut chart of ok, soon, overdue |
| `components/Testimonials.js` | UNUSED. Contains placeholder personas, never show it as real reviews |
| `components/icons.js` | Line icons for the dashboard |
| `components/landing/BlogBody.js` | Renders blog blocks (headings, lists, tables, images, video, callouts) |
| `components/landing/LandingNav.js` | Top nav for landing, pricing, help and blog |
| `components/landing/LoopVideo.js` | Muted looping video with poster |
| `components/landing/RotatingWord.js` | Rotating words in the landing pill |
| `components/landing/ValueCalc.js` | Landing calculator for what lost clients cost |

### styles/

| File | What it does |
|---|---|
| `styles/blog.module.css` | CSS module for blog pages |
| `styles/globals.css` | Global styles: app shell, dashboard, forms, footer, shared classes |
| `styles/landing.module.css` | CSS module for landing, pricing and help pages |

### supabase/ (SQL)

| File | What it does |
|---|---|
| `supabase/add-availability-settings.sql` | availability_settings table (booking hours) |
| `supabase/add-booking-system.sql` | booking_token on dogs, bookings table, realtime (already inside schema.sql) |
| `supabase/add-business-profile.sql` | Business name, phone, reply-to, calendar_token on business_settings |
| `supabase/add-dog-details.sql` | notes, is_archived, opted_out on dogs (already inside schema.sql) |
| `supabase/add-dogs-realtime.sql` | Adds dogs to the realtime publication (already inside schema.sql) |
| `supabase/add-email-channel.sql` | owner_email on dogs (already inside schema.sql) |
| `supabase/add-groomer-features.sql` | Older migration for groomer features (already inside schema.sql) |
| `supabase/add-reminder-sequence.sql` | reminder_count, reminder_cycle_date, reminder_fail_count on dogs |
| `supabase/add-revenue-tracking.sql` | business_settings with default price and timezone (already inside schema.sql) |
| `supabase/add-timezone.sql` | timezone column (already inside schema.sql) |
| `supabase/schema.sql` | Base database: tables, RLS, triggers (run first on a new project) |
| `supabase/security-hardening.sql` | DB-enforced dog limit trigger, pinned search_path, no user edits to subscriptions |

### public/

| File | What it does |
|---|---|
| `public/robots.txt` | Search engine rules, points to /sitemap.xml |

### public/media (29 files)
- `hero.mp4`, `bath.mp4`, `clippers.mp4`, `paws.mp4`, `scissors.mp4` with matching `*-poster.jpg`: looping landing and blog videos (stock footage).
- `dryer-*`, `maltese-*`, `poodle-legs-*`, `salon-spray-*`, `tail-*`, `trim-*`, `yorkie-*` in `-800` and `-1600` widths: stock photos for the landing page and blog.
- `og.jpg` and `og-*.jpg`: Open Graph share images for the site and each blog post.

## 13. Deploying and operating

Deploy: push to the connected GitHub branch. Vercel builds and deploys. Production is `main`. Other branches get preview deploys.

Before you push
1. `npm test` and `npm run build` both pass.
2. No secrets in the diff.

After deploy, a quick check
1. Sign up and log in with a test account.
2. Add a dog, open its booking link, make a booking. Groomer and owner emails arrive, the dashboard shows it.
3. In the GitHub Actions tab, run "Hourly reminder check" by hand. It must be green.
4. Open `/api/cron/send-reminders?dryRun=1` with the secret header to see what would be sent.

Domain: use one address as the main one (`pawdue.pet`) and redirect `www` to it in Vercel. Mixed addresses break login redirects and the GitHub job secret.

Vercel gotchas that already caused build failures
- A root folder named `api/` becomes serverless functions and breaks the build. Do not create it. API routes live in `pages/api/`.
- A file in `public/` with the same URL as a page conflicts. The sitemap is `pages/sitemap.xml.js`, so there must be no `public/sitemap.xml`.

Monitoring: failures in the reminder job send an email to `OPS_ALERT_EMAIL`. The GitHub job turns red when the endpoint does not answer 200.

## 14. Testing

`npm test` runs Vitest. Tests sit next to the code as `*.test.js` and cover: reminder rules, reminder emails, booking slots and time zones, booking emails and notifications, breed intervals, phone parsing, local time, validation, manual messages, translations. There are no browser or end-to-end tests in the repo. Real email sending, Supabase, Dodo, Twilio and WhatsApp are not covered by automated tests, so check them by hand after changes.

## 15. Rules, gotchas and known gaps

Rules for everyone
- Keep `components/Logo.js` unchanged. It is the brand mark.
- No em dashes in text shown in the web app.
- Be honest in marketing: no fake reviews, customers or statistics. Stock photos and footage must be labelled illustrative.
- Server code that needs the admin client goes in `pages/api/` or `getServerSideProps` only.
- When you change plan limits, change both `lib/plans.js` and `supabase/security-hardening.sql`.
- Change database structure by adding a new `supabase/add-*.sql` file that is safe to run twice, and also fold it into `schema.sql`.
- Public routes must stay safe against abuse: validate on the server, keep rate limits, never trust the browser.

Known gaps and cleanup
- Unused components (safe to delete or revive): `ComparisonTable`, `HeroPreview`, `LanguageSuggestionBanner`, `LanguageSwitcher`, `ProblemSection`, `ProductTour`, `Testimonials` (placeholder personas, never show as real reviews).
- No `.env.example` file in the repo. Section 4 is the reference.
- Paid-plan feature gating is not active. Only the dog limit is.
- WhatsApp (Meta) and SMS (Twilio) are optional and may not be configured. Email is the channel that works first.
- The dashboard is not translated.
- The rate limiter is per server instance (best effort). It is applied to booking create, slot lookup and feedback. The opt-out route has no limit yet (its comment in `lib/rateLimit.js` says it does).
- The calendar feed is one-way and Google refreshes it slowly.
- Bookings cannot be rescheduled. They can be cancelled by the groomer, and the owner books again. Owners cannot cancel on their own.
- Cancelling deletes the booking row (needed because of the unique slot index).
- `dashboard.js` is very large.

---
Keep this document updated when you add a file, a route, a table or an environment variable.
