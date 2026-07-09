-- Per-admin city access scoping — run this once in the Supabase SQL editor.
-- allowed_cities = null or '{}' means "all cities" (unrestricted).
-- A non-empty array restricts the admin to those specific cities.

alter table admin add column if not exists allowed_cities text[];
