import { compare, hash } from 'https://esm.sh/bcryptjs@2.4.3';
import { corsHeaders, json } from '../_shared/cors.ts';
import { supabaseAdmin, cleanPhone } from '../_shared/supabaseAdmin.ts';

const SPARROW_TOKEN = Deno.env.get('SPARROW_TOKEN')!;

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

    const newHash = await hash(String(newPin), 10);
    const { error } = await supabaseAdmin
      .from(table)
      .update({ pin_hash: newHash, failed_attempts: 0, locked_until: null })
      .eq('id', account.id);
    if (error) throw new Error(error.message);

    const firstName = (account.full_name || '').split(' ')[0] || 'User';
    sendPinChangeSms(cleaned, firstName).catch(() => {});

    return json({ success: true, fullName: account.full_name || 'User' });
  } catch (e) {
    console.error('set-pin error:', e);
    return json({ success: false, message: 'Could not update PIN' }, 500);
  }
});
