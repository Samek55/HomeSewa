import { corsHeaders, json } from '../_shared/cors.ts';
import { supabaseAdmin, cleanPhone } from '../_shared/supabaseAdmin.ts';

// This project's account/access-token can't set Edge Function secrets (dashboard/
// Management API both reject it), so the Sparrow token is stored in Supabase Vault
// instead and read here via a service-role-only RPC — see public.get_vault_secret
// in the database (migration 0012_vault_secret_helper.sql), granted to service_role only.
const { data: SPARROW_TOKEN } = await supabaseAdmin.rpc('get_vault_secret', { secret_name: 'sparrow_token' });

// Generic SMS relay — the message text is composed client-side (not sensitive), but the
// Sparrow account token must never ship in the app bundle, so every send goes through here.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { phone, text } = await req.json();
    if (!phone || !text) return json({ success: false, message: 'phone and text are required' }, 400);

    const to = '977' + cleanPhone(phone);
    const response = await fetch('https://api.sparrowsms.com/v2/sms/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: SPARROW_TOKEN, from: 'TheAlert', to, text }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return json({ success: false, message: data.detail || 'SMS failed' }, 502);

    return json({ success: true });
  } catch (e) {
    console.error('send-sms error:', e);
    return json({ success: false, message: 'Could not send SMS' }, 500);
  }
});
