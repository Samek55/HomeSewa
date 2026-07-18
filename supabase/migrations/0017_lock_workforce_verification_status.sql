-- Closes the professional-verification bypass: workforce.profile_status
-- gates job-lead notification targeting (see notifyProfessionalsInCity/
-- pushAreaProfessionals/etc. in api/notifications.ts, all filtered on
-- profile_status = 'Active'), and professional.status gates actual login
-- (admin-login rejects anything but status = 'Active'). Both tables have
-- USING(true) RLS, and until now both columns were openly anon-writable —
-- anyone could PATCH themselves straight to 'Active' on either or both,
-- without ever going through ProfessionalVerification.tsx's approve flow.
-- Since applicants already know their own PIN (they set it at signup), a
-- direct PATCH of professional.status was a real "log in without ever being
-- approved" bypass, not just a notification-targeting nuisance.
--
-- Column-level REVOKE closes both paths without touching RLS or any other
-- column on either table (name/email/services/phone/etc. all remain as
-- accessible as they are today). service_role (every Edge Function) is
-- untouched. New workforce applications still go through PostApiCareer.ts,
-- which no longer sets profile_status explicitly — the default below fills
-- it in as 'Waiting for Verification', same as the app always intended.
--
-- Run this once in the Supabase SQL editor.

alter table workforce alter column profile_status set default 'Waiting for Verification';

revoke insert (profile_status), update (profile_status)
  on workforce from anon, authenticated;

revoke update (status)
  on professional from anon, authenticated;
