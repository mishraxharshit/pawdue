-- Run this in Supabase SQL Editor. Safe to run more than once.
-- Lets each groomer set their own booking hours instead of everyone sharing
-- the old hardcoded Mon-Sat 9-5 constant in lib/booking.js.

create table if not exists public.availability_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  -- 0 = Sunday ... 6 = Saturday
  working_days int[] not null default '{1,2,3,4,5,6}',
  start_time time not null default '09:00',
  end_time time not null default '17:00',
  slot_minutes int not null default 60,
  -- optional lunch/break window - both null means no break
  break_start time,
  break_end time,
  -- how many days ahead a client can see/book
  days_ahead int not null default 14,
  updated_at timestamptz not null default now()
);

alter table public.availability_settings enable row level security;

do $$
begin
  create policy "Users can view their own availability settings"
    on public.availability_settings for select
    using (auth.uid() = user_id);
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "Users can upsert their own availability settings"
    on public.availability_settings for insert
    with check (auth.uid() = user_id);
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "Users can update their own availability settings"
    on public.availability_settings for update
    using (auth.uid() = user_id);
exception
  when duplicate_object then null;
end $$;
