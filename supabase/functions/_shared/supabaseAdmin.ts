import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are auto-injected into every
// Edge Function by Supabase — no need to set them as secrets manually.
export const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

export const cleanPhone = (phone: string) => (phone || '').replace(/\D/g, '').slice(-10);
