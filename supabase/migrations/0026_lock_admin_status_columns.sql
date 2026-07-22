-- Closes the raw-REST admin-tampering gap: the admin table's RLS is still
-- USING(true) (documented tradeoff in 0001_security_hardening.sql), which
-- meant anyone holding the anon key could PATCH admin.status or
-- admin.allowed_cities directly — disabling any admin account or granting
-- themselves/another admin unrestricted city access — with no login at all,
-- regardless of what UserManagement.tsx's UI did. toggleAdmin/saveEditCities
-- have now been moved to session-verified Edge Functions (toggle-admin-status,
-- update-admin-cities, both requiring role = 'super_admin'), same pattern as
-- toggle-professional-status; this closes the same hole at the database level
-- so it can't be bypassed by calling PostgREST directly.
--
-- Column-level REVOKE, same pattern as 0016/0017 — full_name, phone, role,
-- photo_url etc. remain as accessible as they are today (UpdateProfile.tsx's
-- self profile edit only ever writes full_name/photo_url, never these two;
-- api/notifications.ts and UserManagement.tsx's admin list only ever SELECT
-- them). service_role (every Edge Function) is untouched.
--
-- Run this once in the Supabase SQL editor.

revoke insert (status, allowed_cities), update (status, allowed_cities)
  on admin from anon, authenticated;
