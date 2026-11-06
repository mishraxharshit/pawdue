-- Services, prices and the settings around them.
-- Run once in the Supabase SQL Editor. Safe to run again.
-- It already contains the columns the next phases need (booking page, emails,
-- revenue), so you will not have to run another migration for them.

-- 1. The groomer's menu
create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  category text not null default 'General',
  description text not null default '',
  kind text not null default 'main' check (kind in ('main', 'addon')),
  pricing_mode text not null default 'flat' check (pricing_mode in ('flat', 'by_size')),
  price numeric(8,2),
  price_small numeric(8,2),
  price_medium numeric(8,2),
  price_large numeric(8,2),
  is_starting_price boolean not null default false,
  duration_minutes integer check (duration_minutes is null or (duration_minutes between 5 and 600)),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists services_user_id_idx on public.services (user_id);

alter table public.services enable row level security;

do $$
begin
  create policy "Users manage their own services"
    on public.services for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.services;
exception
  when duplicate_object then null;
end $$;

-- 2. Shop-wide settings that go with the menu
alter table public.business_settings
  add column if not exists currency text not null default 'USD',
  add column if not exists size_guide jsonb,
  add column if not exists booking_note text;

-- 3. For the next phases: what a booking was for, frozen at booking time so
--    changing a price later never rewrites history.
alter table public.bookings
  add column if not exists service_id uuid references public.services(id) on delete set null,
  add column if not exists service_name text,
  add column if not exists dog_size text,
  add column if not exists price numeric(8,2),
  add column if not exists price_is_starting boolean not null default false,
  add column if not exists currency text,
  add column if not exists addons jsonb,
  add column if not exists duration_minutes integer;

-- 4. For the next phases: a dog's size and usual service
alter table public.dogs
  add column if not exists size text check (size is null or size in ('small', 'medium', 'large')),
  add column if not exists usual_service_id uuid references public.services(id) on delete set null;
