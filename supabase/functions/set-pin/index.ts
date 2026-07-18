// bcryptjs (both the esm.sh and npm: specifier forms) fails to boot on this
// project's Edge Runtime with a bare BOOT_ERROR — bcrypt-ts is a pure-TS
// implementation that boots fine and produces the same $2a$/$2b$ hash format,
// so it verifies correctly against pin_hash values written by Postgres'
// crypt(pin, gen_salt('bf')) in migration 0001_security_hardening.sql.
import { compare, hash } from 'npm:bcrypt-ts@5';
import { corsHeaders, json } from '../_shared/cors.ts';
import { supabaseAdmin, cleanPhone } from '../_shared/supabaseAdmin.ts';

// This project's account/access-token can't set Edge Function secrets (dashboard/
// Management API both reject it), so the Sparrow token is stored in Supabase Vault
// instead and read here via a service-role-only RPC — see public.get_vault_secret
// in the database (migration 0012_vault_secret_helper.sql), granted to service_role only.
const { data: SPARROW_TOKEN } = await supabaseAdmin.rpc('get_vault_secret', { secret_name: 'sparrow_token' });

const sendPinChangeSms = async (phone: string, firstName: string) => {
  const to = '977' + phone;
  const text = `Dear ${firstName}, Your HomeSewa PIN has been changed successfully.\n\nIf you did not request this change, please contact us immediately.\n(9852024365)\n\nThank You for using HomeSewa\n( www.homesewa.app )`;
  await fetch('https://api.sparrowsms.com/v2/sms/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: SPARROW_TOKEN, from: 'TheAlert', to, text }),
  }).catch(() => {});
};

const sha256 = async (text: string) => {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
};

// Handles both PIN-change (logged-in user proves they know the current PIN) and
// PIN-reset (forgot PIN, proves identity via SMS OTP instead) in one place, so the
// new PIN is only ever hashed and written server-side — never compared on the client.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { phone, newPin, mode, oldPin, otpCode } = await req.json();
    const cleaned = cleanPhone(phone);
    if (!cleaned || !newPin || String(newPin).length !== 4 || !['change', 'reset'].includes(mode)) {
      return json({ success: false, message: 'Invalid request' }, 400);
    }

    const { data: adminRow } = await supabaseAdmin
      .from('admin')
      .select('id, pin_hash, full_name')
      .eq('phone', cleaned)
      .maybeSingle();

    const table = adminRow ? 'admin' : 'professional';
    const account = adminRow || (await supabaseAdmin
      .from('professional')
      .select('id, pin_hash, full_name')
      .eq('phone', cleaned)
      .maybeSingle()).data;

    if (!account) return json({ success: false, message: 'This phone number is not registered.' }, 404);

    if (mode === 'change') {
      if (!oldPin) return json({ success: false, message: 'Current PIN is required' }, 400);
      const matches = account.pin_hash ? await compare(String(oldPin), account.pin_hash) : false;
      if (!matches) return json({ success: false, message: 'Current PIN is incorrect' }, 401);
    } else {
      if (!otpCode) return json({ success: false, message: 'Verification code is required' }, 400);
      const { data: otpRow } = await supabaseAdmin
        .from('otp_codes')
        .select('id, code_hash, attempts, expires_at')
        .eq('phone', cleaned)
        .eq('purpose', 'pin-reset')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!otpRow) return json({ success: false, message: 'No verification code found. Please request a new one.' }, 404);
      if (new Date(otpRow.expires_at) < new Date()) {
        return json({ success: false, message: 'Verification code expired. Please request a new one.' }, 410);
      }
      if (otpRow.attempts >= 5) {
        return json({ success: false, message: 'Too many attempts. Please request a new code.' }, 429);
      }
      const codeHash = await sha256(String(otpCode));
      if (codeHash !== otpRow.code_hash) {
        await supabaseAdmin.from('otp_codes').update({ attempts: otpRow.attempts + 1 }).eq('id', otpRow.id);
        return json({ success: false, message: 'Incorrect verification code' });
      }
      await supabaseAdmin.from('otp_codes').delete().eq('id', otpRow.id);
    }

    // AdminLogin.tsx now authenticates via the admin-login Edge Function
    // (bcrypt against pin_hash), not plaintext pin — but `pin` is still kept
    // in sync here rather than dropped, because admin-create's "promote an
    // existing professional" path carries `professional.pin` over into the
    // new admin row and relies on the sync_pin_hash trigger to derive the
    // matching pin_hash from it. If this stopped writing `pin`, a
    // professional who later changed their PIN would go stale here, and
    // promoting them to admin afterward would silently carry over their old
    // PIN's hash instead of their current one.
    const newHash = await hash(String(newPin), 10);
    const { error } = await supabaseAdmin
      .from(table)
      .update({ pin: String(newPin), pin_hash: newHash, failed_attempts: 0, locked_until: null })
      .eq('id', account.id);
    if (error) throw new Error(error.message);

    // Standard practice: changing/resetting a PIN invalidates every other
    // session for this account, the same way changing a password would.
    await supabaseAdmin.from('admin_sessions').delete().eq('phone', cleaned);

    // Awaited deliberately — an un-awaited call here risks the edge runtime
    // tearing down before it completes, silently dropping the confirmation SMS.
    const firstName = (account.full_name || '').split(' ')[0] || 'User';
    await sendPinChangeSms(cleaned, firstName).catch((e) => console.error('set-pin confirmation SMS failed:', e));

    return json({ success: true, fullName: account.full_name || 'User' });
  } catch (e) {
    console.error('set-pin error:', e);
    return json({ success: false, message: 'Could not update PIN' }, 500);
  }
});
