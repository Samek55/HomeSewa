-- road_blocks (popup banner) INSERT/UPDATE were left permissive ("true") from
-- 0008 — unlike admin/professional CRUD, this one never got moved behind a
-- session-verified Edge Function, so anyone holding the anon key could create
-- or edit a full-screen popup shown to every user, including its button_link
-- (phishing risk). AdminRoadBlock.tsx already only lets adminTable === 'admins'
-- reach the create/edit form, but that's a client-side-only gate — this closes
-- it server-side too, same pattern as 0001's admin/professional CRUD gap and
-- the toggle-admin-status/admin-create Edge Functions that plug it.
--
-- SELECT stays open — RoadBlockPopup.tsx must be able to fetch the active
-- banner for logged-out/public viewers with no session at all.
drop policy if exists road_blocks_insert_all on road_blocks;
drop policy if exists road_blocks_update_all on road_blocks;

-- No anon/authenticated write policies are recreated — inserts/updates now
-- only work via service_role, i.e. through the new road-block-write Edge
-- Function (which calls verifySession() and requires adminTable === 'admins').
