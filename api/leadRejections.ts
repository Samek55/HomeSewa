import { supabase } from '../lib/supabase';

const cleanPhone = (phone: string) => (phone || '').replace(/\D/g, '').slice(-10);

// Has this professional already passed on this booking?
export async function isLeadRejected(bookingId: string, professionalPhone: string): Promise<boolean> {
  const phone = cleanPhone(professionalPhone);
  if (!bookingId || !phone) return false;

  const { data } = await supabase
    .from('lead_rejections')
    .select('id')
    .eq('booking_id', bookingId)
    .eq('professional_phone', phone)
    .maybeSingle();

  return !!data;
}

// Records that this professional passed on this lead. The booking itself is untouched —
// it stays "New / Open" and visible/acceptable to every other professional — this only
// stops it from showing up in this professional's own list going forward.
export async function recordLeadRejection(bookingId: string, professionalPhone: string) {
  const phone = cleanPhone(professionalPhone);
  const { error } = await supabase
    .from('lead_rejections')
    .insert([{ booking_id: bookingId, professional_phone: phone }]);

  if (error) throw new Error(error.message);
}

// All booking ids this professional has passed on, so list screens can filter them out.
export async function getRejectedBookingIds(professionalPhone: string): Promise<Set<string>> {
  const phone = cleanPhone(professionalPhone);
  if (!phone) return new Set();

  const { data } = await supabase
    .from('lead_rejections')
    .select('booking_id')
    .eq('professional_phone', phone);

  return new Set((data || []).map((r: any) => String(r.booking_id)));
}
