-- Closes the notifications spoofing gap: anyone with the anon key could
-- INSERT arbitrary rows into public.notifications directly, showing up as
-- official-looking messages in the in-app "My Notifications" feed (a
-- phishing/spoofing vector, even though it never triggers a real push).
--
-- This is now the only table where the client's own write was made fully
-- redundant rather than just moved server-side: send-notification (the
-- Edge Function that already owns every real push send) now writes this
-- log row itself, via the `_log` field on its request payload — see
-- api/notifications.ts's sendNotification() and
-- supabase/functions/send-notification/index.ts. So the anon key never
-- needs INSERT on this table at all anymore.
--
-- SELECT stays open — the notification feed itself must remain readable.
--
-- Run this once in the Supabase SQL editor.

drop policy if exists notifications_insert_all on notifications;

revoke insert on notifications from anon, authenticated;
