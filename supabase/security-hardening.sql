-- PawDue security hardening. Safe to run more than once.
-- Run in Supabase: SQL Editor -> New query -> paste -> Run.

-- 1) Enforce the plan's dog limit inside the database.
--    The API already checks it, but a logged-in user could call the Supabase
--    REST API directly with their own token and skip the API. This trigger
--    makes the limit impossible to bypass. Keep the numbers in sync with lib/plans.js.
create or replace function public.enforce_dog_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan text;
  v_limit int;
  v_count int;
begin
  if new.is_archived then
    return new;
  end if;

  select plan into v_plan from public.subscriptions where user_id = new.user_id;
  v_limit := case coalesce(v_plan, 'free')
    when 'starter' then 200
    when 'pro' then 100000
    else 30
  end;

  select count(*) into v_count from public.dogs
   where user_id = new.user_id and is_archived = false
     and (tg_op = 'INSERT' or id <> new.id);

  if v_count >= v_limit then
    raise exception 'Dog limit reached for your plan (%).', v_limit
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists dogs_enforce_limit on public.dogs;
create trigger dogs_enforce_limit
before insert or update of is_archived on public.dogs
for each row execute function public.enforce_dog_limit();

-- 2) Pin the search_path of the updated_at trigger function (Advisor warning).
do $$
begin
  if exists (select 1 from pg_proc where proname = 'set_updated_at' and pronamespace = 'public'::regnamespace) then
    alter function public.set_updated_at() set search_path = public;
  end if;
end $$;

-- 3) Users must not be able to edit their own subscription row.
--    Only the server (service role) writes plans. If a policy allowing
--    insert/update/delete on subscriptions exists, remove it.
do $$
declare r record;
begin
  for r in
    select policyname from pg_policies
     where schemaname = 'public' and tablename = 'subscriptions'
       and cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL')
  loop
    execute format('drop policy %I on public.subscriptions', r.policyname);
  end loop;
end $$;
