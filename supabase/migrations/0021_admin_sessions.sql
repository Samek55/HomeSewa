-- Real, server-verifiable admin/professional sessions. Until now, AdminLogin.tsx
-- authenticated via admin-login (correctly, bcrypt against pin_hash) but then
-- just remembered the phone number in AsyncStorage — nothing server-side could
-- ever verify a caller was actually logged in. That gap let anyone holding the
-- public anon key call admin-create/approve-professional/reject-professional/
-- toggle-professional-status directly with no session at all, achieving the
-- exact unauthorized actions those functions' database-level column locks
-- (0016/0017) were meant to prevent.
--
-- Opaque DB-backed token, not a signed/stateless JWT — matches this project's
-- existing pattern (otp_codes, Vault secrets) and is actually revocable
-- server-side (logout / PIN-change can delete the row; a stateless token
-- can't be un-issued before it naturally expires).
--
-- Run this once in the Supabase SQL editor.

create table if not exists admin_sessions (
  token text primary key,
  phone text not null,
  admin_table text not null,   -- 'admins' | 'workforce' — matches AsyncStorage's existing adminTable values
  role text not null,          -- 'admin' | 'super_admin' | 'professional'
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index if not exists admin_sessions_expires_idx on admin_sessions (expires_at);

alter table admin_sessions enable row level security;
-- Deliberately no policies — anon/authenticated get zero access, by default
-- deny. Only service_role (every Edge Function, via supabaseAdmin) ever
-- touches this table.
