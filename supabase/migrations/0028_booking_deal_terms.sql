-- Deal amount + note captured from the professional/admin when a booking is
-- accepted — the actual negotiated price, distinct from the customer's
-- original `budget` range. Internal-only (no customer-facing screen reads
-- these); same no-RLS convention as `booking` itself (see 0001_security_hardening.sql).
alter table public.booking add column if not exists deal_amount numeric;
alter table public.booking add column if not exists deal_note text;
