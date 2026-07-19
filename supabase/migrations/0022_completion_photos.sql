-- Adds a place to store professional-submitted "job finished" photos, captured
-- during the work-completion OTP flow (WorkCompletionOTP.tsx). Mirrors the
-- existing `add_photos` column exactly: a JSON-stringified array of public
-- Supabase Storage URLs (not jsonb), so both columns parse the same way in
-- fetchBookingData.ts.
--
-- `booking` has no RLS (see 0001_security_hardening.sql / 0015_security_advisor_fixes.sql
-- for why) — this column follows that same existing, already-documented convention.
--
-- Run this once in the Supabase SQL editor.

alter table public.booking add column if not exists completion_photos text;
