-- Run this in Supabase SQL Editor if you already ran the earlier
-- add-revenue-tracking.sql before timezone support was added.
alter table public.business_settings
  add column if not exists timezone text not null default 'UTC';
