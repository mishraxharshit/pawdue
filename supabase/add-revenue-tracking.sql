-- Run this in Supabase SQL Editor. Safe to run more than once.
--
-- Powers the "revenue recovered" number on the dashboard: every row in
-- `bookings` already represents a real rebooking made through a dog's
-- reminder link (see schema.sql - there's no other way a booking row gets
-- created), so counting them and multiplying by a typical service price
-- gives a genuine, defensible estimate of money PawDue helped bring back -
-- not a vanity metric.

create table if not exists public.business_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  -- What a groomer typically charges for one visit. Used to estimate
  -- revenue recovered until/unless we track real per-visit pricing.
  default_service_price numeric(10, 2) not null default 55.00,
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
