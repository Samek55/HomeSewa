import { corsHeaders, json } from '../_shared/cors.ts';
import { supabaseAdmin, cleanPhone } from '../_shared/supabaseAdmin.ts';

const KHALTI_SECRET_KEY = Deno.env.get('KHALTI_SECRET_KEY')!;
const KHALTI_BASE = Deno.env.get('KHALTI_BASE_URL') ?? 'https://a.khalti.com/api/v2';
const LEAD_FEE_PAISA = 4900;

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
