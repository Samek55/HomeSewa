import { supabase } from '../lib/supabase';

export type RaterRole = 'customer' | 'professional';

export type BookingRating = {
  id: number;
  booking_id: number;
  rater_role: RaterRole;
  rater_phone: string;
  rated_phone: string;
  rating: number;
  comment: string | null;
  created_at: string;
};

export const getBookingRatings = async (
  bookingId: string | number
): Promise<{ customer: BookingRating | null; professional: BookingRating | null }> => {
  const { data, error } = await supabase
    .from('booking_ratings')
    .select('*')
    .eq('booking_id', bookingId);

  if (error) throw new Error(error.message);
  const rows = data || [];
  return {
    customer: rows.find(r => r.rater_role === 'customer') || null,
    professional: rows.find(r => r.rater_role === 'professional') || null,
  };
};

export const submitRating = async (
  bookingId: string | number,
  raterRole: RaterRole,
  raterPhone: string,
  ratedPhone: string,
  rating: number,
  comment?: string
) => {
  const { error } = await supabase.from('booking_ratings').insert({
    booking_id: bookingId,
    rater_role: raterRole,
    rater_phone: raterPhone,
    rated_phone: ratedPhone,
    rating,
    comment: comment || null,
  });

  if (error) {
    if (error.code === '23505') throw new Error('You have already rated this booking.');
    throw new Error(error.message);
  }
};
