-- Fixes the in-app "My Notifications" screen showing nothing even after a push
-- has visibly landed on the device. 0002 created `notifications` with RLS left
-- off, but at some point RLS was turned on for it anyway (e.g. via the
-- dashboard's "enable RLS on all public tables" prompt, the same thing 0005
-- had to fix for `customers`) with zero policies attached. That silently
-- blocks the anon key from both directions: logNotification()'s INSERT
-- (api/notifications.ts) fails and is swallowed by its own try/catch, so no
-- row is ever written even though the OneSignal push still goes out fine; and
-- Notifications.tsx / AdminNotifications.tsx's SELECT comes back empty.
--
-- Run this once in the Supabase SQL editor.

alter table notifications enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'notifications' and policyname = 'notifications_select_all') then
    create policy notifications_select_all on notifications for select using (true);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'notifications' and policyname = 'notifications_insert_all') then
    create policy notifications_insert_all on notifications for insert with check (true);
  end if;
end $$;
