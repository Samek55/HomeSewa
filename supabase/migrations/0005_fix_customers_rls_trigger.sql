-- Fixes booking submission being completely broken: 0004 added the `customers`
-- table and a trigger that upserts into it on every `booking` insert, but the
-- trigger function runs with the INVOKER's privileges (the anon key the app
-- uses directly). Once RLS was turned on for `customers` with no policies
-- (e.g. via the dashboard's "enable RLS on all public tables" prompt), that
-- trigger's own insert started failing with "new row violates row-level
-- security policy for table customers" — which rolls back the whole
-- transaction, so the booking itself never gets created either.
--
-- Run this once in the Supabase SQL editor.

-- SECURITY DEFINER makes the function run as its owner (bypassing RLS for its
-- own writes) instead of as the calling role. search_path is pinned to avoid
-- the standard SECURITY DEFINER search-path-hijacking risk.
create or replace function sync_customer_from_booking()
returns trigger
security definer
set search_path = public
as $$
begin
  insert into customers (phone, full_name)
  values (new.phone, new.full_name)
  on conflict (phone) do update set full_name = excluded.full_name;
  return new;
end;
$$ language plpgsql;

-- customers stores phone/name PII and was never explicitly secured in 0004 —
-- lock it down the same way lead_unlocks already is: anon can SELECT (needed
-- by UserManagement.tsx's customer lookup), but only the SECURITY DEFINER
-- trigger above can INSERT/UPDATE it, not the anon key directly.
alter table customers enable row level security;
do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'customers' and policyname = 'customers_select_all') then
    create policy customers_select_all on customers for select using (true);
  end if;
end $$;
