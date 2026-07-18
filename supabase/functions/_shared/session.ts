import { supabaseAdmin } from './supabaseAdmin.ts';

export interface AdminSession {
  phone: string;
  adminTable: 'admins' | 'workforce';
  role: string;
}

// Reads the session token from the `x-admin-session-token` header — never
// Authorization, which Supabase's gateway already consumes for the anon-key
// JWT check before function code ever runs. Returns null if the token is
// missing, unknown, or expired; callers should treat that as "not logged in."
export async function verifySession(req: Request): Promise<AdminSession | null> {
  const token = req.headers.get('x-admin-session-token');
  if (!token) return null;

  const { data } = await supabaseAdmin
    .from('admin_sessions')
    .select('phone, admin_table, role, expires_at')
    .eq('token', token)
    .maybeSingle();

  if (!data || new Date(data.expires_at) < new Date()) return null;

  return { phone: data.phone, adminTable: data.admin_table as 'admins' | 'workforce', role: data.role };
}
