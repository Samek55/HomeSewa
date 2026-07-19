-- Two-way rating: customer rates the professional who did the job, and the
-- professional rates the customer, each tied to one completed booking.
-- `unique(booking_id, rater_role)` allows exactly one rating per direction per
-- booking, and doubles as duplicate-submission protection.
create table if not exists booking_ratings (
  id bigint generated always as identity primary key,
  booking_id integer not null,
  rater_role text not null check (rater_role in ('customer','professional')),
  rater_phone text not null,
  rated_phone text not null,
  rating smallint not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  unique (booking_id, rater_role)
);

create index if not exists booking_ratings_booking_idx on booking_ratings (booking_id);
create index if not exists booking_ratings_rated_idx on booking_ratings (rated_phone);

-- No RLS — same anon-open convention as booking/customer_favorites (see
-- 0001_security_hardening.sql): there's no auth.uid() to key a policy on since
-- neither customers nor professionals authenticate via Supabase Auth.
