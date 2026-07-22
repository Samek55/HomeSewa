import { corsHeaders, json } from '../_shared/cors.ts';
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts';
import { verifySession } from '../_shared/session.ts';

const ALLOWED = new Set(['Active', 'Inactive']);

// Disables/re-enables another admin account — UserManagement.tsx's "Admins" tab
// toggle. Runs server-side because the `admin` table's RLS is still USING(true)
// for the anon key (0001_security_hardening.sql's admin/professional CRUD gap),
// so a direct client-side update would let anyone holding the anon key disable
// or re-enable any admin account with no login at all.
//
// Requires a super-admin session (0021_admin_sessions.sql) — the "Admins" tab
// housing this action only ever renders for isSuperAdminRole in
// UserManagement.tsx, so this mirrors that (see admin-create for the same check).
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const session = await verifySession(req);
    if (!session || session.role !== 'super_admin') {
      return json({ success: false, message: 'Please log in again.' }, 401);
    }

    const { id, status } = await req.json();
    if (!id || !ALLOWED.has(status)) {
      return json({ success: false, message: 'id and a valid status are required' }, 400);
    }

    const { error } = await supabaseAdmin.from('admin').update({ status }).eq('id', id);
    if (error) throw new Error(error.message);

    return json({ success: true });
  } catch (e) {
    console.error('toggle-admin-status error:', e);
    return json({ success: false, message: 'Could not update status' }, 500);
  }
});
