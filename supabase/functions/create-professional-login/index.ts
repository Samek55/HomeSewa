import { hash } from 'https://esm.sh/bcryptjs@2.4.3';
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
