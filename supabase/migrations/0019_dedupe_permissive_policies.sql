-- Performance Advisor: "Multiple Permissive Policies" on lead_unlocks and
-- workforce — each has two RLS policies covering the exact same role+action
-- with an identical USING(true) condition, forcing Postgres to evaluate both
-- (OR'd together) on every query for no behavioral benefit. Dropping the
-- redundant one changes nothing about who has access — the remaining policy
-- already covers everything the removed one did.
--
-- Confirmed via pg_policies before writing this (not guessed):
--   lead_unlocks: lead_unlocks_select (untracked, not in any migration) and
--     lead_unlocks_select_all (0001_security_hardening.sql) are identical —
--     both SELECT / {public} / USING (true).
--   workforce: "Allow anon read workforce" (SELECT / {anon} / true) is a
--     strict subset of "Allow public access to workforce" (ALL / {anon} /
--     true, true), which already includes SELECT.
--
-- Run this once in the Supabase SQL editor.

drop policy if exists lead_unlocks_select on lead_unlocks;

drop policy if exists "Allow anon read workforce" on workforce;
