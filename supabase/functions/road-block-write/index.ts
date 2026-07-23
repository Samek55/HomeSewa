import { corsHeaders, json } from '../_shared/cors.ts';
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts';
import { verifySession } from '../_shared/session.ts';

// Creates/updates/(de)activates a RoadBlock popup banner. Runs server-side
// because road_blocks INSERT/UPDATE are no longer anon-writable
// (0029_lock_road_blocks_writes.sql) — previously anyone holding the anon
// key could push an arbitrary full-screen banner (including its button_link)
// to every user with no login at all.
//
// Requires an `admins`-table session — mirrors AdminRoadBlock.tsx's own
// gate (adminTable === 'admins'; any admin, not super-admin only).
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const session = await verifySession(req);
    if (!session || session.adminTable !== 'admins') {
      return json({ success: false, message: 'Please log in again.' }, 401);
    }

    const { action, row, id, isActive } = await req.json();

    if (action === 'create') {
      if (!row) return json({ success: false, message: 'row is required' }, 400);
      const { error } = await supabaseAdmin.from('road_blocks').insert([row]);
      if (error) throw new Error(error.message);
      return json({ success: true });
    }

    if (action === 'update') {
      if (!id || !row) return json({ success: false, message: 'id and row are required' }, 400);
      const { error } = await supabaseAdmin.from('road_blocks').update(row).eq('id', id);
      if (error) throw new Error(error.message);
      return json({ success: true });
    }

    if (action === 'setActive') {
      if (!id || typeof isActive !== 'boolean') {
        return json({ success: false, message: 'id and isActive are required' }, 400);
      }
      const { error } = await supabaseAdmin.from('road_blocks').update({ is_active: isActive }).eq('id', id);
      if (error) throw new Error(error.message);
      return json({ success: true });
    }

    return json({ success: false, message: 'Unknown action' }, 400);
  } catch (e) {
    console.error('road-block-write error:', e);
    return json({ success: false, message: 'Could not save this banner' }, 500);
  }
});
