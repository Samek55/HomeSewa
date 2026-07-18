import { corsHeaders, json } from '../_shared/cors.ts';
import { supabaseAdmin, cleanPhone } from '../_shared/supabaseAdmin.ts';
import { verifySession } from '../_shared/session.ts';

// Rejects a pending professional application (workforce + professional
// rows) and notifies the applicant via SMS. Runs server-side because
// workforce.profile_status and professional.status are no longer
// anon-writable (0017_lock_workforce_verification_status.sql).
//
// Requires a super-admin session (0021_admin_sessions.sql) — mirrors
// ProfessionalVerification.tsx's own super-admin-only gating.
const { data: SPARROW_TOKEN } = await supabaseAdmin.rpc('get_vault_secret', { secret_name: 'sparrow_token' });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const session = await verifySession(req);
    if (!session || session.role !== 'super_admin') {
      return json({ success: false, message: 'Please log in again.' }, 401);
    }

    const { uin, phone, name } = await req.json();
    const cleaned = cleanPhone(phone);
    if (!uin || !cleaned) {
      return json({ success: false, message: 'uin and phone are required' }, 400);
    }

    const { error: wfError } = await supabaseAdmin.from('workforce').update({ profile_status: 'Rejected' }).eq('uin', uin);
    const { error: proError } = await supabaseAdmin.from('professional').update({ status: 'Rejected' }).eq('phone', cleaned);

    if (wfError || proError) {
      console.error('reject-professional update failed:', wfError || proError);
      return json({ success: false, message: 'Could not reject this application' }, 500);
    }

    const firstName = (name || '').split(' ')[0] || 'Applicant';
    const text = `Dear ${firstName}, your request for joining HomeSewa App as a professional has been rejected. Please contact our call center on 9852024365.`;
    // Awaited deliberately — see approve-professional for why an un-awaited
    // fetch here risks silently never sending on an edge runtime.
    await fetch('https://api.sparrowsms.com/v2/sms/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: SPARROW_TOKEN, from: 'TheAlert', to: '977' + cleaned, text }),
    }).catch((e) => console.error('reject-professional SMS failed:', e));

    return json({ success: true });
  } catch (e) {
    console.error('reject-professional error:', e);
    return json({ success: false, message: 'Could not reject this application' }, 500);
  }
});
