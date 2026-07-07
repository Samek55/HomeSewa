import { corsHeaders, json } from '../_shared/cors.ts';
import { supabaseAdmin, cleanPhone } from '../_shared/supabaseAdmin.ts';

const MAX_ATTEMPTS = 5;

const sha256 = async (text: string) => {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { phone, purpose, code } = await req.json();
    const cleaned = cleanPhone(phone);
    if (!cleaned || !purpose || !code) {
      return json({ verified: false, message: 'Invalid request' }, 400);
    }

    const { data: row } = await supabaseAdmin
      .from('otp_codes')
      .select('id, code_hash, attempts, expires_at')
      .eq('phone', cleaned)
      .eq('purpose', purpose)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!row) return json({ verified: false, message: 'No OTP found. Please request a new one.' }, 404);
    if (new Date(row.expires_at) < new Date()) {
      return json({ verified: false, message: 'OTP expired. Please request a new one.' }, 410);
    }
    if (row.attempts >= MAX_ATTEMPTS) {
      return json({ verified: false, message: 'Too many attempts. Please request a new OTP.' }, 429);
    }

    const codeHash = await sha256(String(code));
    if (codeHash !== row.code_hash) {
      await supabaseAdmin.from('otp_codes').update({ attempts: row.attempts + 1 }).eq('id', row.id);
      return json({ verified: false, message: 'Incorrect OTP' });
    }

    // Consume the code so it can't be replayed.
    await supabaseAdmin.from('otp_codes').delete().eq('id', row.id);
    return json({ verified: true });
  } catch (e) {
    console.error('verify-otp error:', e);
    return json({ verified: false, message: 'Verification failed' }, 500);
  }
});
