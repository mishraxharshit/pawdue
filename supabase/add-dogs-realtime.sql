-- Run this in Supabase SQL Editor if you already ran schema.sql before the
-- analytics/activity-feed feature was added. Safe to run more than once.

do $$
begin
  alter publication supabase_realtime add table public.dogs;
exception
  when duplicate_object then null; -- already added, fine
end $$;
