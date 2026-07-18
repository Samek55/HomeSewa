-- sync_customer_from_booking() (0004/0005) is a SECURITY DEFINER trigger
-- function — it runs with elevated privileges to bypass RLS for its own
-- insert into `customers`. Trigger functions don't need EXECUTE granted to
-- the inserting role to fire (the trigger mechanism invokes it regardless of
-- the DML role's function-level privileges), so leaving it publicly
-- executable serves no purpose for the `booking` insert trigger it's meant
-- for — it only adds an unnecessary direct RPC surface
-- (`supabase.rpc('sync_customer_from_booking')`) that Security Advisor
-- flags ("Public Can Execute SECURITY DEFINER Function").
--
-- Run this once in the Supabase SQL editor. Booking submission is
-- unaffected — the trigger on `booking` keeps firing exactly as before.

revoke execute on function public.sync_customer_from_booking() from public, anon, authenticated;
