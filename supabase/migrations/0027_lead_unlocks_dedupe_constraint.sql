-- Closes a double-charge race in khalti-confirm-lead-unlock: its only duplicate
-- guard was a select-then-insert check on (booking_id, professional_phone), and
-- the only real unique constraint on lead_unlocks was on pidx alone
-- (0001_security_hardening.sql). Two different completed Khalti payments for the
-- same booking+professional (e.g. a professional retries "Pay Now" after
-- LeadPayment.tsx's polling got stuck — see that fix — while the first payment
-- had actually gone through) could both pass the select check and both insert,
-- since they don't share a pidx. This constraint makes that impossible at the
-- database level regardless of the app's check-then-insert timing; the Edge
-- Function is updated in the same change to treat the resulting unique
-- violation as "already unlocked" rather than an error.
--
-- Run this once in the Supabase SQL editor.

alter table lead_unlocks
  add constraint lead_unlocks_booking_professional_unique unique (booking_id, professional_phone);
