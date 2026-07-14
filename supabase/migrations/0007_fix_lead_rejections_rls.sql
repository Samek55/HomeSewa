-- Fixes "reject this lead" silently failing for professionals: same root cause
-- as 0006 (RLS was turned on for `lead_rejections`, likely via the dashboard's
-- "enable RLS on all public tables" prompt, with zero policies attached).
-- recordLeadRejection()'s INSERT (api/leadRejections.ts) throws, and
-- getRejectedBookingIds()/isLeadRejected()'s SELECT comes back empty — so a
-- rejected lead never actually gets hidden from that professional's list.
--
-- There is no per-professional Supabase Auth session for RLS to key on here
-- (same situation as booking/workforce, see 0001), so this stays open on the
-- anon key like lead_unlocks and customers already are.
--
-- Run this once in the Supabase SQL editor.

alter table lead_rejections enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'lead_rejections' and policyname = 'lead_rejections_select_all') then
    create policy lead_rejections_select_all on lead_rejections for select using (true);
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'lead_rejections' and policyname = 'lead_rejections_insert_all') then
    create policy lead_rejections_insert_all on lead_rejections for insert with check (true);
  end if;
end $$;
