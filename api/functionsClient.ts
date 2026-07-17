import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

// A non-2xx response from an Edge Function still carries its structured JSON body
// (e.g. { success: false, message: '...' }) on error.context — read it instead of
// discarding it, since callers need that message/status, not just a generic error.
export async function invokeEdgeFunction<T>(name: string, body: object, fallbackMessage: string): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, { body });
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
