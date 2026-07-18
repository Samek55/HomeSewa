import { corsHeaders, json } from '../_shared/cors.ts';
import { supabaseAdmin, cleanPhone } from '../_shared/supabaseAdmin.ts';
import { verifySession } from '../_shared/session.ts';

// Activates a pending professional application (workforce + professional
// rows) and reveals the PIN via SMS — the one time it's ever shown to the
// applicant. Runs server-side because `pin` is no longer readable by the
// anon key (0016_lock_pin_columns.sql) and the Sparrow token must never
// ship client-side either.
//
// Requires a super-admin session (0021_admin_sessions.sql) —
// ProfessionalVerification.tsx itself is gated to super admins only, so
// this mirrors that. Without this check, anyone holding the anon key could
// call this function directly with no login at all and approve any pending
// application (including their own).
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

    const { error: wfError } = await supabaseAdmin
      .from('workforce')
      .update({ profile_status: 'Active' })
      .eq('uin', uin);

    const { data: proRow, error: proError } = await supabaseAdmin
      .from('professional')
      .update({ status: 'Active' })
      .eq('phone', cleaned)
      .select('pin')
      .single();

    if (wfError || proError || !proRow) {
      console.error('approve-professional activation failed:', wfError || proError);
      return json({ success: false, message: 'Could not activate this account' }, 500);
    }

    const firstName = (name || '').split(' ')[0] || 'Professional';
    const text =
      `Dear ${firstName}, congratulations! Your HomeSewa Professional application has been approved.\n\nYour Login Details:\nPhone: ${cleaned}\nPIN: ${proRow.pin}\n\nDownload the HomeSewa app and login using the details above.\n\nYou can change your PIN after logging in.\n\nWelcome to HomeSewa!\n( www.homesewa.app )`;

    // Awaited deliberately — an edge runtime can tear the isolate down the
    // moment a Response is returned, so an un-awaited fetch here risked the
    // SMS (the professional's only way to learn their PIN) silently never
    // being sent. A failure here still shouldn't fail the whole approval —
    // the account is already active — so the error is swallowed, not thrown.
    await fetch('https://api.sparrowsms.com/v2/sms/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: SPARROW_TOKEN, from: 'TheAlert', to: '977' + cleaned, text }),
    }).catch((e) => console.error('approve-professional SMS failed:', e));

    return json({ success: true });
  } catch (e) {
    console.error('approve-professional error:', e);
    return json({ success: false, message: 'Could not activate this account' }, 500);
  }
});
