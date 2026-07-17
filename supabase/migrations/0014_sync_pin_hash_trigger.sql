-- 0001_security_hardening.sql hashed every existing PIN once, but nothing kept
-- pin_hash in sync afterward. AdminChangePassword.tsx's old "Change PIN" flow
-- (fixed today to use the set-pin Edge Function) wrote the new PIN straight to
-- the plaintext `pin` column and never touched `pin_hash`, so any account that
-- changed its PIN through that screen ended up with a `pin_hash` that no longer
-- matched its real, current PIN — set-pin's bcrypt compare correctly rejected it
-- as "Current PIN is incorrect" even when the entered PIN was actually right.
--
-- UserManagement.tsx's "Add Admin" flow has the same gap on insert: it writes
-- `pin` directly with no `pin_hash` at all.
--
-- This trigger keeps pin_hash automatically recomputed from pin on every insert
-- or actual pin change, on both tables, closing this permanently regardless of
-- which code path writes `pin`. AdminLogin.tsx/UserManagement.tsx still read/write
-- the plaintext `pin` column directly (a separate, larger migration to fix — see
-- the admin-login Edge Function, also built but not wired up), so pin remains
-- the source of truth for now; this trigger just guarantees pin_hash never
-- silently drifts away from it again.
--
-- gen_salt/crypt (pgcrypto) live in the `extensions` schema on this project, not
-- `public` — search_path must include both or the trigger fails with
-- "function gen_salt(unknown) does not exist".
create or replace function sync_pin_hash()
returns trigger
set search_path = public, extensions
as $$
begin
  if new.pin is not null and (TG_OP = 'INSERT' or new.pin is distinct from old.pin) then
    new.pin_hash := crypt(new.pin, gen_salt('bf'));
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists sync_pin_hash_admin on admin;
create trigger sync_pin_hash_admin
before insert or update on admin
for each row execute function sync_pin_hash();

drop trigger if exists sync_pin_hash_professional on professional;
create trigger sync_pin_hash_professional
before insert or update on professional
for each row execute function sync_pin_hash();

-- One-time backfill for the specific account this was caught on, whose pin_hash
-- had already drifted before this trigger existed. Safe to re-run — a no-op for
-- any row where pin_hash already matches pin.
update admin set pin_hash = crypt(pin, gen_salt('bf')) where pin_hash != crypt(pin, pin_hash);
update professional set pin_hash = crypt(pin, gen_salt('bf')) where pin_hash != crypt(pin, pin_hash);
