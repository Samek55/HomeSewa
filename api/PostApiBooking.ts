import { supabase } from '../lib/supabase';

export const createBooking = async (data: any) => {
  const serviceNames: string[] = Array.isArray(data.service_names)
    ? data.service_names
    : data.service_names ? [data.service_names] : [];

  const bookingFields = {
    full_name: data['Full name'],
    phone: data['Phone'],
    city: data['City'] || null,
    area: data['Area'],
    select_shift: data['Select Shift'],
    work_description: data['Work Description'],
    priority: data['Priority'],
    budget: data['Budget'],
    starting_date: data['Starting Date'] || null,
    service_completion_date: data['Service Completion Date'] || null,
    status: data['Status'] || 'New / Open',
    services: serviceNames,
    add_photos: data['Photos']?.length ? JSON.stringify(data['Photos']) : null,
  };

  const { data: booking, error } = await supabase
    .from('booking')
    .insert([bookingFields])
    .select('booking_id')
    .single();

  if (error) throw new Error(error.message);
  return booking;
};
