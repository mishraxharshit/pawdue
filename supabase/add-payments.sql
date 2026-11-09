-- Payment info and "paid" tracking. PawDue never handles money: the groomer
-- lists how they accept payment, clients pay the groomer directly, and the
-- groomer marks a booking as paid so the client gets a receipt.
-- Run once in the Supabase SQL Editor. Safe to run again.

-- How this groomer accepts payment, e.g. [{"type":"venmo","detail":"@maya"}]
alter table public.business_settings
  add column if not exists payment_methods jsonb not null default '[]'::jsonb,
  add column if not exists payment_note text;

-- What the groomer recorded when the client paid
alter table public.bookings
  add column if not exists paid_at timestamptz,
  add column if not exists paid_amount numeric(10,2),
  add column if not exists paid_method text,
  add column if not exists receipt_sent_at timestamptz;
