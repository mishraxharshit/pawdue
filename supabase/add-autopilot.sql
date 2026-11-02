-- Autopilot pause switch and win-back email tracking.
-- Run once in the Supabase SQL Editor. Safe to run again.

alter table public.business_settings
  add column if not exists autopilot_paused boolean not null default false;

alter table public.dogs
  add column if not exists last_winback_at timestamptz;
