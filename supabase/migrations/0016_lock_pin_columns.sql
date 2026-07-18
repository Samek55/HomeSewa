-- Closes the raw-REST PIN exposure: admin/professional tables are still
-- openly readable/writable by the anon key (RLS USING(true), documented
-- tradeoff in 0001_security_hardening.sql), which meant anyone holding the
-- anon key could `select phone,pin from professional` directly and dump
-- every login PIN, even though the app itself no longer reads pin
-- client-side (AdminLogin.tsx now uses the admin-login Edge Function).
--
-- Column-level REVOKE closes this without touching RLS or any other column
-- on these tables — full_name, phone, role, status, allowed_cities etc.
-- remain openly accessible per the existing documented tradeoff (no
-- Supabase Auth session to key finer RLS on). service_role (used by every
-- Edge Function) is untouched — this only revokes from anon/authenticated.
--
-- Run this once in the Supabase SQL editor.

revoke select (pin, pin_hash), insert (pin, pin_hash), update (pin, pin_hash)
  on admin from anon, authenticated;

revoke select (pin, pin_hash), insert (pin, pin_hash), update (pin, pin_hash)
  on professional from anon, authenticated;
