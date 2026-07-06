import { supabase } from '../../lib/supabase';

export const updateBookingStatus = async (recordId: string, status: string) => {
  const { data, error } = await supabase
    .from('booking')
    .update({ status })
    .eq('booking_id', recordId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
};

// Conditional update: only transitions status if it still matches `fromStatus`.
// Returns the updated row on success, or null if someone else already claimed it first
// (e.g. two professionals racing to accept the same "New / Open" booking).
export const claimBooking = async (recordId: string, fromStatus: string, toStatus: string) => {
  const { data, error } = await supabase
    .from('booking')
    .update({ status: toStatus })
    .eq('booking_id', recordId)
    .eq('status', fromStatus)
    .select()
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
};
