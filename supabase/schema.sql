-- Run this once in your Supabase project's SQL Editor
-- (Dashboard -> SQL Editor -> New query -> paste this -> Run)
--
-- NOTE: if you already ran an earlier version of this file that created
-- stripe_customer_id / stripe_subscription_id columns (before switching to
-- Dodo Payments), run this first to rename them instead of losing the table:
--   alter table public.subscriptions rename column stripe_customer_id to dodo_customer_id;
--   alter table public.subscriptions rename column stripe_subscription_id to dodo_subscription_id;

create extension if not exists pgcrypto;

create table if not exists public.dogs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  dog_name text not null,
  owner_name text not null,
  phone text not null,
  breed text not null,
  interval_weeks integer not null,
  last_groom_date date not null,
  last_reminder_sent_at timestamptz,
  last_reminder_stage text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists dogs_user_id_idx on public.dogs (user_id);

-- Row Level Security: every groomer can only ever see/edit their own dogs.
alter table public.dogs enable row level security;

do $$
begin
  create policy "Users can view their own dogs"
  on public.dogs for select
  using (auth.uid() = user_id);
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "Users can insert their own dogs"
  on public.dogs for insert
  with check (auth.uid() = user_id);
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "Users can update their own dogs"
  on public.dogs for update
  using (auth.uid() = user_id);
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "Users can delete their own dogs"
  on public.dogs for delete
  using (auth.uid() = user_id);
exception
  when duplicate_object then null;
end $$;

-- Keep updated_at fresh on every update
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists dogs_set_updated_at on public.dogs;
create trigger dogs_set_updated_at
  before update on public.dogs
  for each row execute function public.set_updated_at();

-- ============================================================
-- Billing: tracks each groomer's Dodo Payments subscription + current plan.
-- A user with no row here is treated as being on the 'free' plan.
-- Only the server (via the service_role key, in the Dodo webhook)
-- ever writes to this table - regular users can only read their own row.
-- ============================================================
create table if not exists public.subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  dodo_customer_id text,
  dodo_subscription_id text,
  plan text not null default 'free',
  status text not null default 'active',
  current_period_end timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.subscriptions enable row level security;

do $$
begin
  create policy "Users can view their own subscription"
  on public.subscriptions for select
  using (auth.uid() = user_id);
exception
  when duplicate_object then null;
end $$;

drop trigger if exists subscriptions_set_updated_at on public.subscriptions;
create trigger subscriptions_set_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();

-- ============================================================
-- Booking: each dog gets a unique, unguessable booking_token used in the
-- reminder link (e.g. yoursite.com/book/<token>). The public booking page
-- looks the dog up by this token via the service-role key - it does NOT
-- rely on RLS, since the visitor booking a slot is never logged in.
-- ============================================================
alter table public.dogs add column if not exists booking_token uuid not null default gen_random_uuid();
create unique index if not exists dogs_booking_token_idx on public.dogs (booking_token);

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  dog_id uuid not null references public.dogs(id) on delete cascade,
  slot_at timestamptz not null,
  status text not null default 'confirmed',
  created_at timestamptz not null default now()
);

create index if not exists bookings_user_id_idx on public.bookings (user_id);
create index if not exists bookings_dog_id_idx on public.bookings (dog_id);
-- Prevents two different dogs' owners from double-booking the same slot with the same groomer.
create unique index if not exists bookings_user_slot_idx on public.bookings (user_id, slot_at);

alter table public.bookings enable row level security;

do $$
begin
  create policy "Users can view their own bookings"
  on public.bookings for select
  using (auth.uid() = user_id);
exception
  when duplicate_object then null;
end $$;

-- No insert/update/delete policy for regular users on purpose: bookings are
-- only ever written by the public booking API route, using the service-role
-- key (since the person booking a slot isn't authenticated as the groomer).

-- Enable Realtime on this table so the dashboard can show a new booking the
-- instant it's created, without the groomer refreshing the page.
do $$
begin
  alter publication supabase_realtime add table public.bookings;
exception
  when duplicate_object then null; -- already added, fine
end $$;

-- Also enable Realtime on dogs, so the live activity feed can show a
-- reminder send the moment the cron job updates last_reminder_sent_at,
-- not just new bookings.
do $$
begin
  alter publication supabase_realtime add table public.dogs;
exception
  when duplicate_object then null;
end $$;

-- ============================================================
-- Extra per-dog details: grooming notes, soft-delete (archive) instead of
-- a hard delete, and an opt-out flag an owner can set for themselves from
-- their booking page (no login needed) to stop getting reminders.
-- ============================================================
alter table public.dogs add column if not exists notes text;
alter table public.dogs add column if not exists is_archived boolean not null default false;
alter table public.dogs add column if not exists opted_out boolean not null default false;
alter table public.dogs add column if not exists last_reminder_channel text; -- 'whatsapp' | 'sms' | 'email'
alter table public.dogs add column if not exists last_reminder_result text; -- 'sent' | 'failed'
alter table public.dogs add column if not exists owner_email text; -- used as the primary reminder channel

create index if not exists dogs_is_archived_idx on public.dogs (is_archived);

-- ============================================================
-- Revenue tracking: a per-account typical service price, used to turn
-- booking-link rebookings into a real "revenue recovered" estimate on the
-- dashboard. See add-revenue-tracking.sql for the full comment.
-- ============================================================
create table if not exists public.business_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  default_service_price numeric(10, 2) not null default 55.00,
  -- IANA timezone (e.g. "America/New_York", "Asia/Kolkata"). Used so "due
  -- today" and the daily reminder cron use the groomer's actual local day,
  -- not the server's. Defaults to UTC, which is safe but often wrong for a
  -- specific groomer - worth prompting them to set it correctly.
  timezone text not null default 'UTC',
  updated_at timestamptz not null default now()
);

alter table public.business_settings enable row level security;

do $$
begin
  create policy "Users can view their own business settings"
  on public.business_settings for select
  using (auth.uid() = user_id);
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "Users can insert their own business settings"
  on public.business_settings for insert
  with check (auth.uid() = user_id);
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "Users can update their own business settings"
  on public.business_settings for update
  using (auth.uid() = user_id);
exception
  when duplicate_object then null;
end $$;

drop trigger if exists business_settings_set_updated_at on public.business_settings;
create trigger business_settings_set_updated_at
  before update on public.business_settings
  for each row execute function public.set_updated_at();
