import { corsHeaders, json } from '../_shared/cors.ts';
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts';
import { verifySession } from '../_shared/session.ts';

// Edits another admin's allowed_cities scope — UserManagement.tsx's "Admins" tab
// city-access editor. Runs server-side for the same reason as
// toggle-admin-status: the `admin` table's RLS is still USING(true) for the anon
// key, so a direct client-side update would let anyone holding the anon key grant
// themselves (or any admin) unrestricted city access with no login at all.
//
// Requires a super-admin session (0021_admin_sessions.sql) — mirrors admin-create.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const session = await verifySession(req);
    if (!session || session.role !== 'super_admin') {
      return json({ success: false, message: 'Please log in again.' }, 401);
    }

    const { id, allowedCities } = await req.json();
    if (!id) return json({ success: false, message: 'id is required' }, 400);

    const cities = Array.isArray(allowedCities) && allowedCities.length > 0 ? allowedCities : null;
    const { data: updated, error } = await supabaseAdmin
      .from('admin')
      .update({ allowed_cities: cities })
      .eq('id', id)
      .select();
    if (error) throw new Error(error.message);
    if (!updated || updated.length === 0) {
      return json({ success: false, message: 'No admin record matched.' }, 404);
    }

    return json({ success: true, allowedCities: cities });
  } catch (e) {
    console.error('update-admin-cities error:', e);
    return json({ success: false, message: 'Could not save' }, 500);
  }
});
