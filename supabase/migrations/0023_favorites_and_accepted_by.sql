-- Persist which professional accepted a booking, so customer-facing features keyed
-- by phone (Favorites, and later ratings) can look up "who actually did work for me."
-- Today this identity only ever exists transiently in AsyncStorage (adminPhone) and
-- as free text inside the acceptance push/SMS body — never written to the booking row.
alter table public.booking add column if not exists accepted_by_phone text;

-- Lets a customer (identified only by phone, per this app's no-login model) bookmark
-- a professional they've worked with. Same anon-open convention as booking/workforce/
-- customers (see 0001_security_hardening.sql) — there's no auth.uid() to key an RLS
-- policy on since customers never authenticate.
create table if not exists customer_favorites (
  id bigint generated always as identity primary key,
  customer_phone text not null,
  professional_phone text not null,
  created_at timestamptz not null default now(),
  unique (customer_phone, professional_phone)
);

create index if not exists customer_favorites_customer_idx on customer_favorites (customer_phone);
