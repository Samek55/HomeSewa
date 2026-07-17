import { corsHeaders, json } from '../_shared/cors.ts';
import { supabaseAdmin, cleanPhone } from '../_shared/supabaseAdmin.ts';

// This Supabase account's access token doesn't have permission to set Edge Function
// secrets (dashboard/Management API both reject it), so the Khalti key is stored in
// Supabase Vault instead and read here via a service-role-only RPC — see
// public.get_vault_secret in the database, granted to service_role only.
const { data: KHALTI_SECRET_KEY } = await supabaseAdmin.rpc('get_vault_secret', { secret_name: 'khalti_secret_key' });
const KHALTI_BASE = 'https://khalti.com/api/v2';

// The fee is fixed server-side — never trust an amount from the client. Shares
// the LEAD_FEE_PAISA env var with khalti-confirm-lead-unlock so both the amount
// charged here and the amount validated there move together from one place
// (Supabase dashboard -> Edge Functions -> Secrets, no redeploy needed). Keep
// LEAD_FEE_NPR in src/constants/leadFee.ts (the client's display price) in sync
// by hand whenever this changes.
const LEAD_FEE_PAISA = Number(Deno.env.get('LEAD_FEE_PAISA')) || 9900;

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
