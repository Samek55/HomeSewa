-- Fixes for the Supabase Security Advisor findings (Errors + Function Search
-- Path warnings). Run this once in the Supabase SQL editor.

-- ── 1. Errors: "Policy Exists RLS Disabled" / "RLS Disabled in Public" on
-- public.helpbox ──────────────────────────────────────────────────────────
-- helpbox already has select_all/insert_all-style policies (it's the
-- original precedent the road_blocks/notifications permissive-RLS pattern
-- was copied from — see 0008's comment) but RLS itself was never switched
-- on, so those policies have never actually been enforced and the table has
-- been fully open (no PostgREST-level restriction at all) this whole time.
-- Turning RLS on is safe: it just makes the existing "true" policies start
-- applying, which is functionally the same permissive access the app
-- already relies on (PostApiHelpbox.ts inserts via the anon key).
alter table public.helpbox enable row level security;

-- ── 2. Warnings: "Function Search Path Mutable" ─────────────────────────────
-- Any function in public with no pinned search_path is vulnerable to a
-- search-path-hijack (a malicious schema earlier in the caller's search_path
-- shadowing a builtin the function relies on). 0005/0012/0014 already fixed
-- this for sync_customer_from_booking/get_vault_secret/sync_pin_hash; this
-- loop catches the rest (set_road_blocks_updated_at, assign_workforce_uin_id,
-- set_modified_at, and any future function that forgets to set it) without
-- needing to know each one's exact name/body — it only pins search_path, it
-- never touches the function definition itself.
do $$
declare
  fn record;
begin
  for fn in
    select p.proname,
           pg_get_function_identity_arguments(p.oid) as args
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prokind = 'f'
      and not exists (
        select 1 from unnest(coalesce(p.proconfig, '{}')) cfg
        where cfg like 'search_path=%'
      )
  loop
    execute format(
      'alter function public.%I(%s) set search_path = public, pg_temp',
      fn.proname, fn.args
    );
  end loop;
end $$;

-- ── 3. Info: "RLS Enabled No Policy" on public.area / public.services ──────
-- Both are reference/catalog-style tables (service list, area list) with no
-- per-row ownership, so a public-read policy matches the permissive pattern
-- already used for road_blocks/notifications/helpbox — same "app-level
-- gating, not RLS" model as the rest of this project. Reads only; anon still
-- can't insert/update/delete.
alter table public.area enable row level security;
do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'area' and policyname = 'area_select_all') then
    create policy area_select_all on public.area for select using (true);
  end if;
end $$;

alter table public.services enable row level security;
do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'services' and policyname = 'services_select_all') then
    create policy services_select_all on public.services for select using (true);
  end if;
end $$;

-- ── Deliberately NOT touched here ───────────────────────────────────────────
-- * "RLS Policy Always True" on admin/booking/contact/feedback/
--   lead_rejections/workforce/etc. — this is the documented, intentional
--   tradeoff from 0001_security_hardening.sql: the app authenticates via
--   custom phone+PIN, not Supabase Auth, so there's no auth.uid() to key a
--   real per-row policy on. Tightening these requires moving each call site
--   to a service-role Edge Function first (0001 lists them) — doing it here
--   would just break the admin panel.
-- * "RLS Enabled No Policy" (Info) on public.otp_codes — intentional, see
--   0001: the anon key never needs direct access, only send-otp/verify-otp's
--   service role does, so "no policy = fully blocked" is correct as-is.
