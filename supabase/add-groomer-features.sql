-- Run this in Supabase SQL Editor. Safe to run more than once.

alter table public.dogs add column if not exists notes text;
alter table public.dogs add column if not exists is_archived boolean not null default false;
alter table public.dogs add column if not exists opted_out boolean not null default false;
alter table public.dogs add column if not exists last_reminder_channel text; -- 'whatsapp' | 'sms'
alter table public.dogs add column if not exists last_reminder_result text; -- 'sent' | 'failed'

create index if not exists dogs_is_archived_idx on public.dogs (is_archived);
