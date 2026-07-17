import { corsHeaders, json } from '../_shared/cors.ts';
import { supabaseAdmin, cleanPhone } from '../_shared/supabaseAdmin.ts';

// This Supabase account's access token doesn't have permission to set Edge Function
// secrets (dashboard/Management API both reject it), so the Khalti key is stored in
// Supabase Vault instead and read here via a service-role-only RPC — see
// public.get_vault_secret in the database, granted to service_role only.
const { data: KHALTI_SECRET_KEY } = await supabaseAdmin.rpc('get_vault_secret', { secret_name: 'khalti_secret_key' });
const KHALTI_BASE = 'https://khalti.com/api/v2';
// Authoritative charged/validated amount — this is the one place that actually
// gates whether a Khalti payment counts as a valid unlock. Shares the
// LEAD_FEE_PAISA env var with khalti-initiate-lead-payment, so change it via
// either function's env var (Supabase dashboard -> Edge Functions -> Secrets),
// no redeploy needed. LEAD_FEE_NPR in src/constants/leadFee.ts is only the client's
// *display* price and is not read by this function (a Deno edge function can't
// import from the Expo app) — update it by hand to match whenever this changes.
const LEAD_FEE_PAISA = Number(Deno.env.get('LEAD_FEE_PAISA')) || 9900;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { bookingId, phone, pidx } = await req.json();
    const cleaned = cleanPhone(phone);
    if (!bookingId || !cleaned || !pidx) {
      return json({ success: false, error: 'bookingId, phone and pidx are required' }, 400);
    }

    // Idempotent: a professional who already paid for this booking is never charged/inserted again.
    const { data: existing } = await supabaseAdmin
      .from('lead_unlocks')
      .select('id')
      .eq('booking_id', bookingId)
      .eq('professional_phone', cleaned)
      .maybeSingle();
    if (existing) return json({ success: true, status: 'already_unlocked' });

    const lookupRes = await fetch(`${KHALTI_BASE}/epayment/lookup/`, {
      method: 'POST',
      headers: {
        Authorization: `Key ${KHALTI_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ pidx }),
    });
    const lookup = await lookupRes.json();
    if (!lookupRes.ok) return json({ success: false, error: lookup.detail || 'Lookup failed' }, 502);

    if (lookup.status !== 'Completed') {
      return json({ success: false, status: lookup.status, error: 'Payment not completed' });
    }
    if (lookup.total_amount !== LEAD_FEE_PAISA) {
      return json({ success: false, error: 'Paid amount does not match the required fee' }, 400);
    }

    const { error: insertError } = await supabaseAdmin
      .from('lead_unlocks')
      .insert([{ booking_id: bookingId, professional_phone: cleaned, pidx, amount: lookup.total_amount }]);

    if (insertError) {
      // Unique violation on pidx means this exact payment was already used to unlock a
      // different booking/phone — never silently succeed in that case.
      if (insertError.code === '23505') {
        return json({ success: false, error: 'This payment has already been used' }, 409);
      }
      return json({ success: false, error: insertError.message }, 500);
    }

    return json({ success: true, status: 'unlocked' });
  } catch (e) {
    console.error('khalti-confirm-lead-unlock error:', e);
    return json({ success: false, error: 'Could not confirm unlock' }, 500);
  }
});
