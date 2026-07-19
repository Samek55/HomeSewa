import { supabase } from '../../lib/supabase';

export const updateBookingStatus = async (recordId: string, status: string, completionPhotoUrls?: string[]) => {
  const updateFields: { status: string; completion_photos?: string } = { status };
  if (completionPhotoUrls?.length) {
    updateFields.completion_photos = JSON.stringify(completionPhotoUrls);
  }

  const { data, error } = await supabase
    .from('booking')
    .update(updateFields)
    .eq('booking_id', recordId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
};

// Conditional update: only transitions status if it still matches `fromStatus`.
// Returns the updated row on success, or null if someone else already claimed it first
// (e.g. two professionals racing to accept the same "New / Open" booking).
export const claimBooking = async (recordId: string, fromStatus: string, toStatus: string, extraFields?: Record<string, any>) => {
  const { data, error } = await supabase
    .from('booking')
    .update({ status: toStatus, ...extraFields })
    .eq('booking_id', recordId)
    .eq('status', fromStatus)
    .select()
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
};
