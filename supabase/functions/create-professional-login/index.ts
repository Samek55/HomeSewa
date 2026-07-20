// bcryptjs (both the esm.sh and npm: specifier forms) fails to boot on this
// project's Edge Runtime with a bare BOOT_ERROR — bcrypt-ts is a pure-TS
// implementation that boots fine and produces the same $2a$/$2b$ hash format,
// so it verifies correctly against pin_hash values written by Postgres'
// crypt(pin, gen_salt('bf')) in migration 0001_security_hardening.sql.
import { hash } from 'npm:bcrypt-ts@5';
import { corsHeaders, json } from '../_shared/cors.ts';
import { supabaseAdmin, cleanPhone } from '../_shared/supabaseAdmin.ts';

// Creates the `professional` login row for a new career application. Runs server-side
// (service role) because `professional` holds PINs and is locked to the anon key by RLS —
// the client can no longer insert into it directly. The auto-generated PIN is stored in
// both `pin` (plaintext, so it can be revealed once via SMS when the admin approves the
// application) and `pin_hash` (used for every login going forward).
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { fullName, phone } = await req.json();
    const cleaned = cleanPhone(phone);
    if (!fullName || !cleaned) return json({ success: false, message: 'fullName and phone are required' }, 400);

    const pin = String(Math.floor(1000 + Math.random() * 9000));
    const pinHash = await hash(pin, 10);

    const { error } = await supabaseAdmin.from('professional').insert([{
      full_name: fullName,
      phone: cleaned,
      pin,
      pin_hash: pinHash,
      status: 'Pending',
    }]);
    if (error) {
      if (error.code === '23505') {
        return json({
          success: false,
          message: 'This phone number is already registered. Please go to the login page to reset your PIN or log in from there.',
        }, 409);
      }
      throw new Error(error.message);
    }

    return json({ success: true });
  } catch (e) {
    console.error('create-professional-login error:', e);
    return json({ success: false, message: 'Could not register login for this application' }, 500);
  }
});
