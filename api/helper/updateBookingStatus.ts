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
