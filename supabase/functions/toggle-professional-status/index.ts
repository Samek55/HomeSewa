import { corsHeaders, json } from '../_shared/cors.ts';
import { supabaseAdmin, cleanPhone } from '../_shared/supabaseAdmin.ts';
import { verifySession } from '../_shared/session.ts';

const ALLOWED = new Set(['Active', 'Inactive']);

// Toggles an already-approved professional between Active/Inactive, across
// both professional.status (gates login) and workforce.profile_status
// (gates lead-notification targeting) — UserManagement.tsx's admin toggle.
// Runs server-side because both columns are no longer anon-writable
// (0017_lock_workforce_verification_status.sql).
//
// Requires any admin session (0021_admin_sessions.sql) — unlike
// approve/reject-professional, the "Professionals" tab housing this toggle
// is visible to plain admins too, not just super admins.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const session = await verifySession(req);
    if (!session || session.adminTable !== 'admins') {
      return json({ success: false, message: 'Please log in again.' }, 401);
    }

    const { id, phone, status } = await req.json();
    const cleaned = cleanPhone(phone);
    if (!id || !cleaned || !ALLOWED.has(status)) {
      return json({ success: false, message: 'id, phone and a valid status are required' }, 400);
    }

    const now = new Date().toISOString();
    const { error: proError } = await supabaseAdmin
      .from('professional')
      .update({ status, modified_at: now })
      .eq('id', id);
    if (proError) throw new Error(proError.message);

    await supabaseAdmin
      .from('workforce')
      .update({ profile_status: status, updated_at: now })
      .or(`phone.eq.${cleaned},phone.eq.977${cleaned}`);

    return json({ success: true, modifiedAt: now });
  } catch (e) {
    console.error('toggle-professional-status error:', e);
    return json({ success: false, message: 'Could not update status' }, 500);
  }
});
