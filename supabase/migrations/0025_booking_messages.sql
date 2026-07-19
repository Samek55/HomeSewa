-- In-app chat between customer and professional, scoped to a single booking —
-- same pattern as booking_ratings/customer_favorites (phone-keyed, no auth.uid()
-- to key an RLS policy on since neither side authenticates via Supabase Auth).
create table if not exists booking_messages (
  id bigint generated always as identity primary key,
  booking_id integer not null,
  sender_role text not null check (sender_role in ('customer','professional')),
  sender_phone text not null,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists booking_messages_booking_idx on booking_messages (booking_id, created_at);
