# PawDue

Breed-aware grooming reminder SaaS for solo dog groomers. Groomers add a dog with its breed
and last groom date; PawDue calculates when it's next due and sends the owner a WhatsApp
message (falling back to SMS) automatically, once a day, via a cron job.

## Stack

- **Next.js 14** (pages router) — full-stack, one deployable app
- **Supabase** — Postgres database + Auth (login/register), with Row Level Security so each
  groomer only ever sees their own dogs
- **Twilio** — SMS sending
- **WhatsApp Cloud API (Meta)** — WhatsApp sending, tried first, falls back to SMS if it fails
- **Vercel Cron** — daily job that scans all dogs and sends reminders to overdue / due-soon ones

## 1. Create your Supabase project

1. Go to https://supabase.com, create a new project (free tier is fine)
2. Go to **SQL Editor** → New query → paste the entire contents of `supabase/schema.sql`
   from this repo → Run. This creates the `dogs` table and the Row Level Security policies
   that keep each groomer's data private.
3. Go to **Project Settings → API** and copy:
   - `Project URL` → this is `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` `public` key → this is `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → this is `SUPABASE_SERVICE_ROLE_KEY` (keep this secret — it bypasses
     all security rules, and is only used by the cron job on the server)

### About email confirmation

By default, Supabase requires users to click a confirmation link in their email before they
can log in. For faster local testing, you can turn this off:
**Authentication → Providers → Email → toggle off "Confirm email"**.
Turn it back on before you launch publicly.

## 1a. Re-run the SQL if you already set up Supabase before

This version adds real in-app booking: a `booking_token` column on `dogs`, a new `bookings`
table, and Realtime enabled on it. If you already ran `supabase/schema.sql` once, just run it
again in the SQL Editor — every statement uses `if not exists` / safe guards, so it won't
touch your existing data.

Also set `NEXT_PUBLIC_APP_URL` in `.env` to your app's own URL (e.g. `http://localhost:3000`
locally, or your real Vercel domain in production) — this is what each dog's reminder link
now points to (`yoursite.com/book/<token>`), instead of a generic external booking link.

**Then also run `supabase/add-groomer-features.sql`** (in the SQL Editor, same way) —
it adds:
- `notes` — a free-text field per dog (matting, temperament, allergies, whatever you'd
  otherwise keep in your head)
- `is_archived` — soft-delete. Archiving hides a dog from your active list and stops its
  reminders, without permanently deleting the record like the "Delete" button does
- `opted_out` — set when an owner clicks "Stop reminders" on their own booking page (no
  login needed); the cron job skips anyone with this set
- `last_reminder_channel` / `last_reminder_result` — so the dashboard can show "✓ WhatsApp
  sent" or "✗ last reminder failed" next to each dog

The cron job also now skips any dog with an upcoming **confirmed** booking — previously it
could nag an owner who had already booked their next slot, which is exactly the annoyance
this whole tool is supposed to prevent.

**Also run `supabase/add-email-channel.sql`** — adds an optional `owner_email` column,
used by the email fallback channel described in step 4a below.

## 2. Push this to GitHub

```bash
cd pawdue
git init
git add .
git commit -m "Initial commit: PawDue MVP (Supabase)"
git branch -M main
git remote add origin https://github.com/<your-username>/pawdue.git
git push -u origin main
```

## 3. Get Twilio credentials (SMS)

1. Sign up at https://www.twilio.com/try-twilio
2. Get a phone number capable of sending SMS (Console → Phone Numbers)
3. Copy your **Account SID** and **Auth Token** from the Twilio Console dashboard
4. Put these in `.env` as `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`

Note: for production sending to US numbers you'll eventually need 10DLC registration;
Twilio walks you through this in the console when you try to send at volume.

## 4. Get WhatsApp Cloud API credentials

1. Create a Meta developer account: https://developers.facebook.com
2. Create an App → add the "WhatsApp" product
3. In WhatsApp → API Setup, you'll get a **temporary access token** and a **Phone Number ID** for testing
4. Put these in `.env` as `WHATSAPP_TOKEN` and `WHATSAPP_PHONE_NUMBER_ID`
5. For production (not just testing with your own number), you'll need to:
   - Verify a business on Meta Business Manager
   - Request a permanent access token (System User token)
   - Get your WhatsApp Business number approved

This approval process takes real time (days), so start it early even before your MVP is polished.

## 4a. Set up Email (Resend) — the fallback while WhatsApp approval is pending

WhatsApp approval can take days, and you may not have Twilio billing turned on yet either.
Rather than launch with no reminders at all, PawDue has a third channel: **email**, tried
only if both WhatsApp and SMS fail (or aren't configured yet). Once WhatsApp is approved,
it becomes primary automatically — no code change needed, the fallback chain just checks
each channel's credentials in order every time.

1. Sign up at https://resend.com (free tier, no card required to start)
2. Create an API key, put it in `RESEND_API_KEY`
3. For `REMINDER_FROM_EMAIL`, use `onboarding@resend.dev` while testing — it works
   immediately with no setup. Before real launch, verify your own domain in Resend
   (Domains → Add Domain, a few DNS records) and switch to an address on it, so emails
   don't land in spam and look like they're actually from you
4. Add an "Owner email (optional)" when adding or editing a dog — without it, that dog
   simply has no email fallback, WhatsApp/SMS still work as before

## 5. Set up Dodo Payments billing

PawDue has three plans: Free (10 dogs), Starter ($29/mo, 75 dogs), Pro ($49/mo, unlimited).
Dodo Payments is a merchant-of-record processor (handles global tax/compliance for you),
good for a solo founder selling worldwide.

1. Create a Dodo Payments account at https://app.dodopayments.com (stay in **test mode**
   while developing — set `DODO_PAYMENTS_ENVIRONMENT="test_mode"`)
2. Create two **subscription products**:
   - "PawDue Starter" — recurring, $29.00/month
   - "PawDue Pro" — recurring, $49.00/month
3. Copy each product's **Product ID** (starts with `pdt_...`) into `DODO_STARTER_PRODUCT_ID`
   and `DODO_PRO_PRODUCT_ID` in `.env`
4. Go to **Developer → API**, copy your API key into `DODO_PAYMENTS_API_KEY`
5. Set up the webhook: **Developer → Webhooks → Add endpoint**
   - Locally, use a tunnel (e.g. `ngrok http 3000`) and point the endpoint at
     `https://<your-ngrok-url>/api/dodo/webhook`
   - In production: `https://your-domain.vercel.app/api/dodo/webhook`
   - Enable at least: `subscription.active`, `subscription.renewed`, `subscription.updated`,
     `subscription.on_hold`, `subscription.failed`, `subscription.cancelled`,
     `subscription.expired`
   - Copy the endpoint's **signing secret** into `DODO_PAYMENTS_WEBHOOK_KEY`

How it works: a user clicking "Choose Starter/Pro" on `/pricing` hits
`/api/dodo/create-checkout-session`, which creates a Dodo Checkout Session (passing your
Supabase user id in `metadata`) and redirects them to Dodo's hosted payment page. After
payment, Dodo calls your `/api/dodo/webhook`, which reads that metadata and writes the
user's plan into the `subscriptions` table (via the service-role client, bypassing RLS).
`/api/dogs` checks that table before allowing a new dog to be added, so limits are enforced
server-side, not just in the UI. Users manage or cancel their subscription through Dodo's
hosted customer portal, opened from the "Manage billing" button on the dashboard.

## 6. Run locally

```bash
npm install
cp .env.example .env
# fill in real values in .env
npm run dev
```

Visit http://localhost:3000 — this is now a public landing page (not the dashboard).
Click "Start free" to register (check your email to confirm, unless you disabled that in
Supabase), log in, and you'll land on `/dashboard`. Add a test dog with a `lastGroomDate`
far enough in the past to show as "overdue" or "due soon".

Test the reminder-sending logic manually by hitting the cron endpoint yourself:

```bash
curl -X POST http://localhost:3000/api/cron/send-reminders \
  -H "Authorization: Bearer <your CRON_SECRET>"
```

To test booking: click "Preview reminder" on a dog in the dashboard, copy the link at the
end of the message, and open it in a new (or incognito) tab — that's the exact page an
owner would land on. Pick a slot and confirm it, then switch back to the dashboard tab: you
should see a toast and the new entry in "Upcoming bookings" appear without refreshing.

## 7. Deploy to Vercel

1. Import the GitHub repo into Vercel (https://vercel.com/new)
2. In Project Settings → Environment Variables, add every variable from `.env.example`
   with your real values (Supabase URL/anon key/service role key, Twilio keys, WhatsApp
   keys, BOOKING_LINK, CRON_SECRET)
3. Deploy
4. Once deployed, go back to Dodo Payments (**Developer → Webhooks → Add endpoint**) and add
   your real production URL (`https://your-domain.vercel.app/api/dodo/webhook`) if you
   haven't already — then copy its signing secret into `DODO_PAYMENTS_WEBHOOK_KEY` in
   Vercel's env vars and redeploy
5. The `vercel.json` file already configures a daily cron job (9am UTC) hitting
   `/api/cron/send-reminders`. Vercel will call it automatically — no extra setup needed
   beyond having `CRON_SECRET` set as an env var.

## How booking works end-to-end

- Every dog gets a unique `booking_token` (a random UUID) the moment it's added.
- The reminder message links to `yoursite.com/book/<token>` — a public page (no login) that
  looks the dog up by that token via the service-role key, since the owner clicking the link
  was never logged in.
- Working hours are a fixed constant for now (Mon–Sat, 9am–5pm, hourly slots, no lunch-hour
  slot) — see `WORKING_DAYS` / `SLOT_HOURS` in `lib/booking.js`. Edit those to change your
  hours; there's no settings UI for this yet.
- When an owner picks a slot, `/api/bookings/create` re-checks server-side that it's still
  free (never trusts the client) before inserting it, so two owners can't double-book the
  same slot.
- The dashboard subscribes to **Supabase Realtime** on the `bookings` table, so the moment a
  booking is created, the groomer sees a toast ("🎉 New booking just came in!") and the
  Upcoming Bookings list updates — no page refresh, no polling.
- Realtime needs to be enabled on the `bookings` table for this to work. `schema.sql` does
  this automatically (`alter publication supabase_realtime add table public.bookings`), but
  if it silently doesn't work, check **Database → Replication** in your Supabase dashboard
  and make sure `bookings` is toggled on.

## Security note

Row Level Security (in `supabase/schema.sql`) is what keeps groomers from seeing each
other's dogs — it's enforced by Postgres itself, not just app code. The one exception is
the cron job, which intentionally uses the `service_role` key to read across all groomers'
dogs at once (since it has to check everyone's due dates daily). That key must never be
exposed to the browser — it's only read in `pages/api/cron/send-reminders.js`, a server-only file.

## What's intentionally NOT built yet (by design, for a lean MVP)

- Per-groomer settings for reminder timing/cooldown (currently hardcoded: remind at 7 days
  before due, re-remind every 5 days while overdue — see `REMINDER_COOLDOWN_DAYS` in
  `pages/api/cron/send-reminders.js`)
- Customizable working hours per groomer (currently a fixed constant in `lib/booking.js`,
  not a settings screen)
- Booking confirmation message back to the owner (e.g. a WhatsApp/SMS confirming their
  slot) — right now confirmation is just the on-screen message after booking
- Cancelling or rescheduling an existing booking from either side
- Multi-groomer team accounts (currently one login = one groomer's dog list)
- Password reset UI (Supabase Auth supports it out of the box via
  `supabase.auth.resetPasswordForEmail()` — just needs a page wired up)
- Bulk CSV import for onboarding an existing client list (adding dogs one at a time is the
  only path today)
- Per-groom service/price logging (there's no record of what a groom cost or included —
  `notes` is free text, not structured history)
- Delivery status is last-attempt-only (`last_reminder_channel`/`last_reminder_result`), not
  a full send history or real delivery receipts from Twilio/Meta

## Project structure

```
pawdue/
  lib/
    breedIntervals.js         - breed -> weeks table + due-date/status logic + email subject line
    messaging.js              - WhatsApp -> SMS -> Email fallback chain (Meta, Twilio, Resend)
    booking.js                 - working hours + available-slot generation
    plans.js                  - plan names/prices/dog limits (Free/Starter/Pro)
    dodo.js                   - Dodo Payments server client + product-id <-> plan mapping
    supabase/
      client.js               - browser Supabase client
      server.js                - server Supabase client (reads/writes auth cookies)
      admin.js                 - service-role client, cron job + billing checks + public booking lookups
  pages/
    index.js                  - public marketing landing page (redirects to /dashboard if already logged in)
    dashboard.js               - the actual groomer dashboard (protected), with Realtime bookings
    book/[token].js             - public booking page an owner lands on from their reminder link
    pricing.js                 - plan comparison + Dodo Payments checkout buttons
    login.js / register.js    - Supabase Auth email/password
    api/
      dogs/index.js            - list/create dogs (enforces plan dog-limit on create)
      dogs/[id].js              - update/delete a dog
      cron/send-reminders.js    - the actual message-sending job
      billing/status.js         - current plan + dog usage, for the dashboard
      bookings/availability/[token].js - public: available slots for a dog's booking link
      bookings/create.js               - public: books a slot (re-validates it's still free)
      bookings/list.js                  - protected: groomer's upcoming bookings
      dodo/create-checkout-session.js - starts a Dodo Checkout Session for Starter/Pro
      dodo/create-portal-session.js   - opens Dodo's customer portal (manage/cancel)
      dodo/webhook.js                  - keeps `subscriptions` table in sync with Dodo
  supabase/
    schema.sql                 - dogs + subscriptions + bookings tables, RLS policies, Realtime
  vercel.json                  - daily cron schedule
```
