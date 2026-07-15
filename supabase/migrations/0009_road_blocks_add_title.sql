-- Adds the `title` column that was folded into 0008_road_blocks.sql after that
-- migration had already been run against the live table — `create table if not
-- exists` doesn't retroactively add new columns, so this catches it up.
-- Run this once in the Supabase SQL editor.

alter table road_blocks add column if not exists title text not null default '';
alter table road_blocks alter column title drop default;
