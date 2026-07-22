import { corsHeaders, json } from '../_shared/cors.ts';
import { supabaseAdmin, cleanPhone } from '../_shared/supabaseAdmin.ts';

// This project's account/access-token can't set Edge Function secrets (dashboard/
// Management API both reject it), so the Sparrow token is stored in Supabase Vault
// instead and read here via a service-role-only RPC — see public.get_vault_secret
// in the database (migration 0012_vault_secret_helper.sql), granted to service_role only.
const { data: SPARROW_TOKEN } = await supabaseAdmin.rpc('get_vault_secret', { secret_name: 'sparrow_token' });
const OTP_TTL_MINUTES = 5;
const RESEND_COOLDOWN_SECONDS = 45;

const sha256 = async (text: string) => {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
};

const MESSAGES: Record<string, (code: string, name: string) => string> = {
  career: (code, name) => `Dear ${name}, Your Professional Membership OTP code is ${code}.\n\nThank You for using HomeSewa\n( www.homesewa.app )`,
  partnership: (code, name) => `Dear ${name}, Your Partnership OTP code is ${code}.\n\nThank You for using HomeSewa\n( www.homesewa.app )`,
  helpbox: (code) => `Hi, Thank you for submitting help request. Your OTP code is ${code}.\n\nThank You for using HomeSewa\n( www.homesewa.app )`,
  booking: (code, name) => `Dear ${name}, Your Service Booking OTP code is ${code}.\n\nThank You for using HomeSewa\n( www.homesewa.app )`,
  'pin-reset': (code) => `Dear Customer, your HomeSewa PIN reset OTP is ${code}.\n\nIf you did not request this, please ignore.\n( www.homesewa.app )`,
  'work-completion': (code, name) => `Dear ${name}, your HomeSewa service is being marked as completed.\n\nYour completion OTP is: ${code}\n\nShare this code with the professional to confirm.\n\nHomeSewa ( www.homesewa.app )`,
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { phone, purpose, name } = await req.json();
    const cleaned = cleanPhone(phone);
    if (!cleaned || !purpose || !MESSAGES[purpose]) {
      return json({ success: false, message: 'Invalid phone or purpose' }, 400);
    }

    let personalizedName = name;

    // PIN reset requires an existing account — look it up server-side (the client no
    // longer has direct read access to admin/professional) and use its real name rather
    // than trusting whatever name the client supplies for this purpose.
    if (purpose === 'pin-reset') {
      const { data: adminRow } = await supabaseAdmin
        .from('admin').select('full_name').eq('phone', cleaned).maybeSingle();
      const account = adminRow || (await supabaseAdmin
        .from('professional').select('full_name').eq('phone', cleaned).maybeSingle()).data;
      if (!account) return json({ success: false, message: 'This phone number is not registered.' }, 404);
      personalizedName = account.full_name;
    }

    // Rate-limit sends (including resends) per phone+purpose — with no cooldown at all,
    // anyone could hammer this endpoint to SMS-bomb an arbitrary Nepali number for free
    // at the Sparrow SMS account's expense.
    const { data: existing } = await supabaseAdmin
      .from('otp_codes')
      .select('id, created_at')
      .eq('phone', cleaned)
      .eq('purpose', purpose)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing) {
      const secondsSinceLastSend = (Date.now() - new Date(existing.created_at).getTime()) / 1000;
      if (secondsSinceLastSend < RESEND_COOLDOWN_SECONDS) {
        const waitSeconds = Math.ceil(RESEND_COOLDOWN_SECONDS - secondsSinceLastSend);
        return json({ success: false, message: `Please wait ${waitSeconds}s before requesting another code.`, waitSeconds }, 429);
      }
    }

    // 4-digit code — matches the 4-box OTP UI used across the app's screens.
    const code = String(Math.floor(1000 + Math.random() * 9000));
    const codeHash = await sha256(code);
    const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60_000).toISOString();

    // Invalidate the previous code for this phone+purpose first, so resending never
    // leaves an older row around for verify-otp's "latest row" lookup to conflict with
    // (previously: typing the first code after a resend burned an attempt against the
    // new row instead of matching the old one).
    await supabaseAdmin
      .from('otp_codes')
      .delete()
      .eq('phone', cleaned)
      .eq('purpose', purpose);

    const { error } = await supabaseAdmin
      .from('otp_codes')
      .insert([{ phone: cleaned, purpose, code_hash: codeHash, expires_at: expiresAt }]);
    if (error) throw new Error(error.message);

    const to = '977' + cleaned;
    const text = MESSAGES[purpose](code, (personalizedName?.split(' ')?.[0]) || 'Customer');
    await fetch('https://api.sparrowsms.com/v2/sms/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: SPARROW_TOKEN, from: 'TheAlert', to, text }),
    });

    return json({ success: true });
  } catch (e) {
    console.error('send-otp error:', e);
    return json({ success: false, message: 'Could not send OTP' }, 500);
  }
});
