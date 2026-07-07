import { compare } from 'https://esm.sh/bcryptjs@2.4.3';
import { corsHeaders, json } from '../_shared/cors.ts';
import { supabaseAdmin, cleanPhone } from '../_shared/supabaseAdmin.ts';

const MAX_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { phone, pin } = await req.json();
    const cleaned = cleanPhone(phone);
    if (!cleaned || !pin || String(pin).length < 4) {
      return json({ success: false, message: 'Invalid phone or PIN' }, 400);
    }

    const { data: adminRow } = await supabaseAdmin
      .from('admin')
      .select('id, full_name, status, pin_hash, role, failed_attempts, locked_until')
      .eq('phone', cleaned)
      .maybeSingle();

    let account: any = adminRow;
    const isProfessional = !adminRow;

    if (isProfessional) {
      const { data: proRow } = await supabaseAdmin
        .from('professional')
        .select('id, full_name, status, pin_hash, failed_attempts, locked_until')
        .eq('phone', cleaned)
        .maybeSingle();
      account = proRow;
    }

    if (!account) {
      return json({ success: false, message: 'Invalid phone or PIN' }, 401);
    }

    const table = isProfessional ? 'professional' : 'admin';

    if (account.locked_until && new Date(account.locked_until) > new Date()) {
      return json({ success: false, message: 'Too many failed attempts. Try again later.' }, 429);
    }

    const pinMatches = account.pin_hash ? await compare(String(pin), account.pin_hash) : false;

    if (!pinMatches) {
      const attempts = (account.failed_attempts || 0) + 1;
      const update: Record<string, unknown> = { failed_attempts: attempts };
      if (attempts >= MAX_ATTEMPTS) {
        update.locked_until = new Date(Date.now() + LOCKOUT_MINUTES * 60_000).toISOString();
        update.failed_attempts = 0;
      }
      await supabaseAdmin.from(table).update(update).eq('id', account.id);
      return json({ success: false, message: 'Invalid phone or PIN' }, 401);
    }

    // Correct PIN — reset the lockout counter.
    await supabaseAdmin.from(table).update({ failed_attempts: 0, locked_until: null }).eq('id', account.id);

    if (account.status !== 'Active') {
      return json({ success: false, status: account.status, message: `Account status: ${account.status}` });
    }

    return json({
      success: true,
      status: account.status,
      role: isProfessional ? 'professional' : (account.role || ''),
      displayName: account.full_name || 'Admin',
    });
  } catch (e) {
    console.error('admin-login error:', e);
    return json({ success: false, message: 'Login failed' }, 500);
  }
});
