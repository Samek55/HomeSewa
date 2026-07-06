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

// Records a completed lead-opening-fee payment so the contact stays unlocked for this professional.
export async function recordLeadUnlock(bookingId: string, professionalPhone: string, pidx: string, amountPaisa: number) {
  const phone = cleanPhone(professionalPhone);
  const { error } = await supabase
    .from('lead_unlocks')
    .insert([{ booking_id: bookingId, professional_phone: phone, pidx, amount: amountPaisa }]);

  if (error) throw new Error(error.message);
}
