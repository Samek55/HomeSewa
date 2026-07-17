import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export interface KhaltiInitResponse {
  pidx: string;
  payment_url: string;
}

export interface LeadUnlockResult {
  success: boolean;
  status?: string;
  error?: string;
}

// A non-2xx response from an Edge Function still carries the structured JSON body
// (e.g. { success: false, status: 'Pending' }) on error.context — read it instead of
// throwing away the detail, since callers need `status` to tell "still waiting on
// Khalti" apart from "actually failed".
async function readFunctionResult<T>(error: unknown, data: T | null, fallback: string): Promise<T> {
  if (!error) return data as T;
  if (error instanceof FunctionsHttpError) {
    try {
      return await error.context.json();
    } catch {
      // body wasn't JSON — fall through to the generic error below
    }
  }
  throw new Error((error as Error)?.message || fallback);
}

// Starts a Khalti payment for this booking's lead-opening fee. The fee amount and
// Khalti secret key live only in the khalti-initiate-lead-payment Edge Function —
// never trust/hold either on the client.
export async function initiateLeadPayment(bookingId: string, phone: string): Promise<KhaltiInitResponse> {
  const { data, error } = await supabase.functions.invoke('khalti-initiate-lead-payment', {
    body: { bookingId, phone },
  });
  return readFunctionResult(error, data, 'Could not start payment');
}

// Asks khalti-confirm-lead-unlock to look up the payment with Khalti (server-side,
// with the real secret key) and, only if it's actually Completed for the exact fee,
// record the unlock. Safe to call repeatedly while polling or retrying — the
// function is idempotent (checks for an existing unlock first, and `pidx` is
// unique so the same payment can never unlock two bookings).
export async function confirmLeadUnlock(bookingId: string, phone: string, pidx: string): Promise<LeadUnlockResult> {
  const { data, error } = await supabase.functions.invoke('khalti-confirm-lead-unlock', {
    body: { bookingId, phone, pidx },
  });
  return readFunctionResult(error, data, 'Could not confirm payment');
}
