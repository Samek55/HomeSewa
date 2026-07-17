import { supabase } from '../lib/supabase';

const cleanPhone = (phone: string) => (phone || '').replace(/\D/g, '').slice(-10);

// Has this professional already paid to view this booking's contact details?
export async function isLeadUnlocked(bookingId: string, professionalPhone: string): Promise<boolean> {
  const phone = cleanPhone(professionalPhone);
  if (!bookingId || !phone) return false;

  const { data } = await supabase
    .from('lead_unlocks')
    .select('id')
    .eq('booking_id', bookingId)
    .eq('professional_phone', phone)
    .maybeSingle();

  return !!data;
}
