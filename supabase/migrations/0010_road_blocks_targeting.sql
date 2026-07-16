-- Audience targeting for popup banners — lets HR/admin scope a banner to specific
-- cities, user types, and (when Workforce is targeted) professions, e.g. "only
-- Plumbers in Kathmandu see this banner". Same null/empty-array-means-"all"
-- convention as `admin.allowed_cities` (see 0003_admin_city_access.sql).
-- Run this once in the Supabase SQL editor.

alter table road_blocks add column if not exists target_cities text[];
alter table road_blocks add column if not exists target_roles text[];
alter table road_blocks add column if not exists target_professions text[];

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'road_blocks_target_roles_valid'
  ) then
    alter table road_blocks add constraint road_blocks_target_roles_valid
      check (target_roles is null or target_roles <@ array['public', 'customer', 'workforce', 'admin']::text[]);
  end if;
end $$;
