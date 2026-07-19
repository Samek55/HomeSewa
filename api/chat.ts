import { supabase } from '../lib/supabase';

export type SenderRole = 'customer' | 'professional';

export type ChatMessage = {
  id: number;
  booking_id: number;
  sender_role: SenderRole;
  sender_phone: string;
  body: string;
  created_at: string;
};

export const listMessages = async (bookingId: string | number): Promise<ChatMessage[]> => {
  const { data, error } = await supabase
    .from('booking_messages')
    .select('*')
    .eq('booking_id', bookingId)
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);
  return data || [];
};

export const sendMessage = async (
  bookingId: string | number,
  senderRole: SenderRole,
  senderPhone: string,
  body: string
): Promise<void> => {
  const { error } = await supabase.from('booking_messages').insert({
    booking_id: bookingId,
    sender_role: senderRole,
    sender_phone: senderPhone,
    body,
  });

  if (error) throw new Error(error.message);
};
