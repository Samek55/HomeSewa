import { corsHeaders, json } from '../_shared/cors.ts';
import { supabaseAdmin, cleanPhone } from '../_shared/supabaseAdmin.ts';
import { verifySession } from '../_shared/session.ts';

// Creates or promotes an admin account — the super-admin "Add Admin" flow
// in UserManagement.tsx. Runs server-side because it needs to read/write the
// `pin` column, which the anon key can no longer touch directly
// (0016_lock_pin_columns.sql): either promoting an existing professional
// (carries their existing PIN over) or creating a brand-new admin (PIN typed
// by the super admin performing this action).
//
// Requires a super-admin session (0021_admin_sessions.sql) — the "Admins"
// tab housing this action only ever renders for isSuperAdminRole in
// UserManagement.tsx, so this mirrors that. Without this check, anyone
// holding the anon key could call this function directly with no login at
// all and create their own admin account.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const session = await verifySession(req);
    if (!session || session.role !== 'super_admin') {
      return json({ success: false, message: 'Please log in again.' }, 401);
    }

    const { phone, fullName, pin, allowedCities } = await req.json();
    const cleaned = cleanPhone(phone);
    if (!cleaned) return json({ success: false, message: 'phone is required' }, 400);

    const { data: existingAdmin } = await supabaseAdmin
      .from('admin').select('id').eq('phone', cleaned).maybeSingle();
    if (existingAdmin) {
      return json({ success: false, message: 'This phone number already has Admin access.' }, 409);
    }

    const { data: existingPro } = await supabaseAdmin
      .from('professional').select('id, full_name, pin').eq('phone', cleaned).maybeSingle();

    if (existingPro) {
      const { error: insertErr } = await supabaseAdmin.from('admin').insert([{
        full_name: existingPro.full_name,
        phone: cleaned,
        pin: existingPro.pin,
        role: 'admin',
        status: 'Active',
        allowed_cities: allowedCities ?? null,
      }]);
      if (insertErr) throw new Error(insertErr.message);

      await supabaseAdmin.from('professional').delete().eq('id', existingPro.id);
      // Their workforce profile stays behind and would otherwise keep matching
      // "profile_status = Active" lead-notification queries even though they're an Admin now.
      await supabaseAdmin.from('workforce').update({ profile_status: 'Inactive' }).eq('phone', cleaned);

      return json({ success: true, mode: 'promoted' });
    }

    if (!fullName || !pin || String(pin).length !== 4) {
      return json({ success: false, message: 'fullName and a 4-digit pin are required for a new admin' }, 400);
    }

    const { error } = await supabaseAdmin.from('admin').insert([{
      full_name: fullName,
      phone: cleaned,
      pin: String(pin),
      role: 'admin',
      status: 'Active',
      allowed_cities: allowedCities ?? null,
    }]);
    if (error) throw new Error(error.message);

    return json({ success: true, mode: 'created' });
  } catch (e) {
    console.error('admin-create error:', e);
    return json({ success: false, message: 'Could not save' }, 500);
  }
});
