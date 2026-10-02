-- Run this in Supabase SQL Editor. Safe to run more than once.

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
create unique index if not exists bookings_user_slot_idx on public.bookings (user_id, slot_at);

alter table public.bookings enable row level security;

do $$
begin
  create policy "Users can view their own bookings"
    on public.bookings for select
    using (auth.uid() = user_id);
exception
  when duplicate_object then null; -- policy already exists, fine
end $$;

do $$
begin
  alter publication supabase_realtime add table public.bookings;
exception
  when duplicate_object then null; -- already added, fine
end $$;
