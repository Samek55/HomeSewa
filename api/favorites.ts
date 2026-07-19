import { supabase } from '../lib/supabase';

export type FavoriteProfessional = {
  phone: string;
  fullName: string;
  services: string[];
};

// Workforce phone numbers are stored inconsistently (some with a legacy `977` prefix,
// some without) — matches the `.or(phone.eq.X, phone.eq.977X)` pattern already used in
// BookingDetails_1.tsx's fetchProfessionalInfo.
export const fetchWorkforceByPhones = async (phones: string[]): Promise<FavoriteProfessional[]> => {
  const clean = [...new Set(phones.filter(Boolean).map(p => p.replace(/\D/g, '').replace(/^977/, '')))];
  if (!clean.length) return [];

  const orFilter = clean.flatMap(p => [`phone.eq.${p}`, `phone.eq.977${p}`]).join(',');
  const { data, error } = await supabase
    .from('workforce')
    .select('phone, first_name, middle_name, last_name, services')
    .or(orFilter);

  if (error) throw new Error(error.message);
  return (data || []).map(row => ({
    phone: String(row.phone).replace(/^977/, ''),
    fullName: [row.first_name, row.middle_name, row.last_name].filter(Boolean).join(' '),
    services: row.services || [],
  }));
};

export const listFavorites = async (customerPhone: string): Promise<FavoriteProfessional[]> => {
  const { data, error } = await supabase
    .from('customer_favorites')
    .select('professional_phone')
    .eq('customer_phone', customerPhone);

  if (error) throw new Error(error.message);
  return fetchWorkforceByPhones((data || []).map(r => r.professional_phone));
};

export const addFavorite = async (customerPhone: string, professionalPhone: string) => {
  const { error } = await supabase
    .from('customer_favorites')
    .upsert(
      { customer_phone: customerPhone, professional_phone: professionalPhone },
      { onConflict: 'customer_phone,professional_phone' }
    );

  if (error) throw new Error(error.message);
};

export const removeFavorite = async (customerPhone: string, professionalPhone: string) => {
  const { error } = await supabase
    .from('customer_favorites')
    .delete()
    .eq('customer_phone', customerPhone)
    .eq('professional_phone', professionalPhone);

  if (error) throw new Error(error.message);
};

// Professionals who've actually completed a job for this customer — the pool a
// customer picks favorites from.
export const listCompletedProfessionals = async (customerPhone: string): Promise<FavoriteProfessional[]> => {
  const { data, error } = await supabase
    .from('booking')
    .select('accepted_by_phone')
    .eq('phone', customerPhone)
    .eq('status', 'Completed')
    .not('accepted_by_phone', 'is', null);

  if (error) throw new Error(error.message);
  return fetchWorkforceByPhones((data || []).map(r => r.accepted_by_phone));
};
