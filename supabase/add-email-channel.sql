-- Run this in Supabase SQL Editor. Safe to run more than once.

alter table public.dogs add column if not exists owner_email text;
