-- Human-readable, prefixed IDs — run this once in the Supabase SQL editor.
-- Booking -> B123, Workforce/Professional application -> W123, Partnership -> P123,
-- Customer -> C123 (mirrors the existing "H0001" pattern already used for helpbox tickets).
--
-- Each display_id is a STORED GENERATED column derived from the real numeric primary
-- key — the underlying integer id/PK is untouched, so nothing that already depends on
-- it (foreign keys, Khalti payment order IDs, .eq() lookups, sorting) is affected.
-- display_id is purely an additional, human-friendly column.

alter table booking add column if not exists display_id text
  generated always as ('B' || booking_id::text) stored;

alter table workforce add column if not exists display_id text
  generated always as ('W' || uin::text) stored;

alter table partnership add column if not exists display_id text
  generated always as ('P' || partner_id::text) stored;

-- Customers have no table of their own today — booking just stores phone/full_name
-- directly per booking. Create a real customers table, keyed by phone, so each
-- customer gets one stable C-prefixed id.
create table if not exists customers (
  id bigint generated always as identity primary key,
  phone text not null unique,
  full_name text,
  created_at timestamptz not null default now(),
  display_id text generated always as ('C' || id::text) stored
);

-- Backfill one row per distinct phone already in booking, using the name from
-- each phone's most recent booking.
insert into customers (phone, full_name, created_at)
select b.phone, b.full_name, b.service_booking_datetime
from booking b
inner join (
  select phone, max(service_booking_datetime) as latest
  from booking
  where phone is not null and phone <> ''
  group by phone
) latest_b on latest_b.phone = b.phone and latest_b.latest = b.service_booking_datetime
on conflict (phone) do nothing;

-- Keep it current going forward: every new booking upserts its customer row
-- automatically, so display_id assignment never needs manual maintenance.
create or replace function sync_customer_from_booking()
returns trigger as $$
begin
  insert into customers (phone, full_name)
  values (new.phone, new.full_name)
  on conflict (phone) do update set full_name = excluded.full_name;
  return new;
end;
$$ language plpgsql;

drop trigger if exists booking_sync_customer on booking;
create trigger booking_sync_customer
  after insert on booking
  for each row
  when (new.phone is not null and new.phone <> '')
  execute function sync_customer_from_booking();
