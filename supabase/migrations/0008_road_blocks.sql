-- RoadBlock pop-up banner (flash-offer interstitial shown on app launch).
-- The countdown is per-user and lives on the close button, not a shared
-- deadline: `countdown_seconds` is how long the × shows a "skip in Ns" style
-- countdown before it becomes tappable, starting the moment a given device
-- first sees the banner. Only one banner is expected to be live at a time;
-- the client just queries for the most recent active + in-window row.
-- Run this once in the Supabase SQL editor.

create table if not exists road_blocks (
  id                  bigint generated always as identity primary key,
  banner_name         text not null,

  title               text not null,                    -- bold headline shown above the message
  image_url           text not null,                     -- square creative, 1080x1080
  message              text not null,
  button_text         text not null default 'View More'
    check (button_text in (
      'View More', 'Download Now', 'Install Now', 'Buy Now', 'Learn More',
      'Watch Video', 'Grab Offer', 'Join Now', 'Review Now',
      'Suggest a Feature', 'Other'
    )),
  button_text_custom  text,
  button_link         text not null,

  countdown_seconds   integer,                          -- seconds the close (×) button stays disabled/counting down; null = closable immediately

  start_at            timestamptz not null,
  end_at              timestamptz not null,
  is_active           boolean not null default true,    -- manual kill switch, independent of the date window

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  created_by_phone    text not null,

  constraint road_blocks_dates_valid check (end_at > start_at),
  constraint road_blocks_countdown_positive check (countdown_seconds is null or countdown_seconds > 0),
  constraint road_blocks_button_custom_required check (
    button_text <> 'Other' or (button_text_custom is not null and length(trim(button_text_custom)) > 0)
  )
);

-- Powers the "what's the one banner live right now" query the app runs on every launch.
create index if not exists road_blocks_live_idx
  on road_blocks (start_at, end_at) where is_active;

create or replace function set_road_blocks_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists road_blocks_touch_updated_at on road_blocks;
create trigger road_blocks_touch_updated_at
  before update on road_blocks
  for each row execute function set_road_blocks_updated_at();

-- Same permissive-RLS-plus-app-level-gating pattern as `notifications`/`helpbox` —
-- the admin app authenticates via custom phone+PIN, not Supabase Auth, so the
-- anon key needs open policies here; access control happens in the app UI.
alter table road_blocks enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'road_blocks' and policyname = 'road_blocks_select_all') then
    create policy road_blocks_select_all on road_blocks for select using (true);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'road_blocks' and policyname = 'road_blocks_insert_all') then
    create policy road_blocks_insert_all on road_blocks for insert with check (true);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'road_blocks' and policyname = 'road_blocks_update_all') then
    create policy road_blocks_update_all on road_blocks for update using (true) with check (true);
  end if;
end $$;
