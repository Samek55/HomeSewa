import { corsHeaders, json } from '../_shared/cors.ts';
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts';

// Revokes a session server-side on logout — deleting the row is what makes
// this a real logout rather than just clearing local state; the token
// stops working immediately instead of quietly remaining valid until its
// natural 30-day expiry. Always returns success — a logout with no/unknown
// token isn't an error, there's just nothing to revoke.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const token = req.headers.get('x-admin-session-token');
    if (token) {
      await supabaseAdmin.from('admin_sessions').delete().eq('token', token);
    }
    return json({ success: true });
  } catch (e) {
    console.error('logout error:', e);
    return json({ success: true });
  }
});
