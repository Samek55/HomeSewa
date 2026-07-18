import { FunctionsHttpError } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';

// A non-2xx response from an Edge Function still carries its structured JSON body
// (e.g. { success: false, message: '...' }) on error.context — read it instead of
// discarding it, since callers need that message/status, not just a generic error.
//
// requireSession: true attaches the logged-in admin/professional's session
// token (see 0021_admin_sessions.sql) as the x-admin-session-token header —
// never Authorization, which Supabase's gateway already consumes for the
// anon-key JWT check before function code runs. Only pass this for Edge
// Functions that actually verify the token server-side (admin-create,
// approve-professional, reject-professional, toggle-professional-status) —
// it's meaningless overhead everywhere else.
export async function invokeEdgeFunction<T>(
  name: string,
  body: object,
  fallbackMessage: string,
  options?: { requireSession?: boolean }
): Promise<T> {
  let headers: Record<string, string> | undefined;
  if (options?.requireSession) {
    const token = await AsyncStorage.getItem('adminSessionToken');
    if (token) headers = { 'x-admin-session-token': token };
  }

  const { data, error } = await supabase.functions.invoke(name, { body, headers });
  if (!error) return data as T;
  if (error instanceof FunctionsHttpError) {
    try {
      return await error.context.json();
    } catch {
      // body wasn't JSON — fall through to the generic error below
    }
  }
  throw new Error((error as Error)?.message || fallbackMessage);
}
