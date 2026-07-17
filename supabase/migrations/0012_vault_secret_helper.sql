-- Lets Edge Functions read secrets from Supabase Vault instead of Function env
-- secrets. This project's linked account/access-token doesn't have the dashboard/
-- Management API privilege needed to set Function secrets ("Your account does not
-- have the necessary privileges to access this endpoint" from both the CLI and the
-- Vault-backed alternative: store the value once via
--   select vault.create_secret('<value>', '<name>', '<description>');
-- (run manually in the SQL editor — never put the actual secret value in a
-- migration file) and read it back in an Edge Function via the service-role client:
--   const { data } = await supabaseAdmin.rpc('get_vault_secret', { secret_name: '<name>' });
--
-- SECURITY DEFINER so it can reach the vault schema (not exposed via PostgREST/RPC
-- to anon/authenticated), but execute is revoked from anon/authenticated and
-- granted only to service_role — the anon key can never call this.
create or replace function public.get_vault_secret(secret_name text)
returns text
language sql
security definer
set search_path = public
as $$
  select decrypted_secret from vault.decrypted_secrets where name = secret_name limit 1;
$$;

revoke all on function public.get_vault_secret(text) from public;
revoke all on function public.get_vault_secret(text) from anon;
revoke all on function public.get_vault_secret(text) from authenticated;
grant execute on function public.get_vault_secret(text) to service_role;

-- The Khalti live secret key itself was inserted separately (not here) via:
--   select vault.create_secret('<the live key>', 'khalti_secret_key', 'Khalti live secret key for lead-payment Edge Functions');
-- khalti-initiate-lead-payment and khalti-confirm-lead-unlock both read it via
-- get_vault_secret('khalti_secret_key').
