-- In-app "My Notifications" history — run this once in the Supabase SQL editor.

create table if not exists notifications (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  title text not null,
  body text not null,
  screen text,              -- deep-link route, matches the `data.screen` already sent to OneSignal
  link_id text,             -- paired with screen, e.g. a booking id
  audience text not null,   -- 'professional_open' | 'customer_specific' | 'customer_all' | 'admin_all' | 'super_admin' | 'all'
  audience_service text,    -- set when audience = 'professional_open'
  audience_city text,       -- set when audience = 'professional_open'
  audience_phone text       -- set when audience = 'customer_specific'
);

create index if not exists notifications_audience_idx on notifications (audience, created_at desc);
