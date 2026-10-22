-- Reminder sequence: max 3 reminders per grooming cycle (14 days before,
-- 5 days before, 3 days after due). Safe to run more than once.
alter table public.dogs add column if not exists reminder_count integer not null default 0;
alter table public.dogs add column if not exists reminder_cycle_date date;
alter table public.dogs add column if not exists reminder_fail_count integer not null default 0;
