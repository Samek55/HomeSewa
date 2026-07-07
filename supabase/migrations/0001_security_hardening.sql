-- HomeSewa security hardening — Phase C
-- Run this once in the Supabase SQL editor (Dashboard -> SQL Editor -> New query).
-- Safe to run top-to-bottom in a single query.

-- ── 1. Hashed PIN storage (admin + professional) ────────────────────────────
create extension if not exists pgcrypto;

alter table admin        add column if not exists pin_hash text;
alter table professional add column if not exists pin_hash text;

update admin        set pin_hash = crypt(pin, gen_salt('bf')) where pin_hash is null and pin is not null;
update professional set pin_hash = crypt(pin, gen_salt('bf')) where pin_hash is null and pin is not null;

-- Only drop the plaintext column once you've deployed the admin-login Edge
-- Function (Phase B) and confirmed login works against pin_hash — until then,
-- keep `pin` around as a fallback. Uncomment when ready:
-- alter table admin        drop column pin;
-- alter table professional drop column pin;

-- ── 2. Login lockout ─────────────────────────────────────────────────────────
alter table admin        add column if not exists failed_attempts int not null default 0;
alter table admin        add column if not exists locked_until timestamptz;
alter table professional add column if not exists failed_attempts int not null default 0;
alter table professional add column if not exists locked_until timestamptz;

-- ── 3. OTP codes table (used by send-otp / verify-otp Edge Functions) ───────
create table if not exists otp_codes (
  id bigint generated always as identity primary key,
  phone text not null,
  purpose text not null,
  code_hash text not null,
  expires_at timestamptz not null,
  attempts int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists otp_codes_phone_purpose_idx on otp_codes (phone, purpose);

-- ── 4. Prevent a completed Khalti payment from being replayed across bookings
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'lead_unlocks_pidx_unique') then
    alter table lead_unlocks add constraint lead_unlocks_pidx_unique unique (pidx);
  end if;
end $$;

-- ── 5. Lock the anon key out of otp_codes ───────────────────────────────────
-- otp_codes is brand new — nothing in the app ever needed direct client access
-- to it (send-otp/verify-otp/set-pin use the service role), so it's safe to
-- fully block the anon key here.
alter table otp_codes enable row level security;

-- lead_unlocks: writes now only ever happen via khalti-confirm-lead-unlock's
-- service role (never trust a client-supplied unlock again), but
-- BookingDetails_1.tsx still reads this table directly to show/hide contact
-- info, so allow anon SELECT while blocking anon INSERT/UPDATE/DELETE.
alter table lead_unlocks enable row level security;
do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'lead_unlocks' and policyname = 'lead_unlocks_select_all') then
    create policy lead_unlocks_select_all on lead_unlocks for select using (true);
  end if;
end $$;

-- admin and professional are intentionally LEFT OPEN on the anon key for now.
-- This migration only closed the specific bug that was audited — the PIN
-- comparison happening client-side with no rate limiting — by moving login to
-- the admin-login Edge Function and hashing PINs. It did NOT migrate the
-- broader admin-panel CRUD that already reads/writes these tables directly:
-- UserManagement.tsx (list/create/edit/delete admin & professional accounts),
-- ProfessionalVerification.tsx's reject handler, UpdateProfile.tsx (self
-- profile edit), and api/notifications.ts (super-admin phone lookup). Turning
-- on RLS here with no policies for those flows would break all of them.
-- Fully closing this gap is a separate follow-up: move each of those call
-- sites to a service-role Edge Function/RPC, *then* enable RLS on these two
-- tables the same way lead_unlocks and otp_codes are locked down above.

-- booking, workforce, and lead_rejections are also left on direct anon access
-- — there is no per-professional Supabase Auth session yet for RLS to key on,
-- so restricting them here would just break the app.
