import { corsHeaders, json } from '../_shared/cors.ts';
import { cleanPhone } from '../_shared/supabaseAdmin.ts';

const KHALTI_SECRET_KEY = Deno.env.get('KHALTI_SECRET_KEY')!;
const KHALTI_BASE = Deno.env.get('KHALTI_BASE_URL') ?? 'https://a.khalti.com/api/v2';

// The fee is fixed server-side — never trust an amount from the client.
const LEAD_FEE_PAISA = 4900;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { bookingId, phone } = await req.json();
    if (!bookingId || !phone) return json({ error: 'bookingId and phone are required' }, 400);

    const res = await fetch(`${KHALTI_BASE}/epayment/initiate/`, {
      method: 'POST',
      headers: {
        Authorization: `Key ${KHALTI_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        return_url: 'https://homesewa.app/payment/success',
        website_url: 'https://homesewa.app',
        amount: LEAD_FEE_PAISA,
        purchase_order_id: `LEAD-${bookingId}-${Date.now()}`,
        purchase_order_name: 'HomeSewa Lead Opening Fee',
        customer_info: {
          name: 'HomeSewa Professional',
          phone: cleanPhone(phone),
        },
      }),
    });
    const data = await res.json();
    if (!res.ok) return json({ error: data.detail || JSON.stringify(data) }, 502);

    return json({ pidx: data.pidx, payment_url: data.payment_url });
  } catch (e) {
    console.error('khalti-initiate-lead-payment error:', e);
    return json({ error: 'Could not start payment' }, 500);
  }
});
