import { supabase } from '../../lib/supabase';

const formatDate = (dateString?: string | null) => {
  if (!dateString) return '';
  const t = Date.parse(dateString);
  if (isNaN(t)) return '';
  const d = new Date(t);
  const day = d.getDate();
  const month = d.toLocaleDateString('en-US', { month: 'long' });
  const year = d.getFullYear();
  const weekday = d.toLocaleDateString('en-US', { weekday: 'long' });
  return `${day} ${month} ${year}, ${weekday}`;
};

const formatBudget = (budget?: string | null) => {
  if (!budget) return '';
  return budget.includes('NPR') ? budget : budget.replace(/(\d)/, 'NPR $1');
};

export const fetchBookings = async () => {
  try {
    const { data: bookings, error } = await supabase
      .from('booking')
      .select('*');

    if (error) { console.log('Supabase fetch error:', error); return []; }

    return (bookings || []).map((item: any) => ({
      id: String(item.booking_id),
      bookingId: item.booking_id,
      fullName: item.full_name,
      phone: item.phone,
      city: item.city,
      area: item.area,
      street: item.street,
      zip: item.zip,
      landmark: item.nearest_landmark,
      service: Array.isArray(item.services) ? item.services.join(', ') : '',
      bookingDate: formatDate(item.service_booking_datetime),
      bookingDateRaw: item.service_booking_datetime,
      startingDate: formatDate(item.starting_date),
      startingDateRaw: item.starting_date,
      completionDate: formatDate(item.service_completion_date),
      approxDays: (() => {
        const start = Date.parse(item.starting_date);
        const end = Date.parse(item.service_completion_date);
        if (isNaN(start) || isNaN(end) || end < start) return null;
        // Inclusive of both the starting and ending day — work finishing the same
        // day it starts is 1 day of work, not 0.
        return Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;
      })(),
      shift: item.select_shift,
      priority: item.priority,
      status: item.status,
      budget: formatBudget(item.budget),
      specialRequests: item.work_description,
      photos: (() => {
        try { return item.add_photos ? JSON.parse(item.add_photos) : []; }
        catch { return []; }
      })(),
      completionPhotos: (() => {
        try { return item.completion_photos ? JSON.parse(item.completion_photos) : []; }
        catch { return []; }
      })(),
      acceptedByPhone: item.accepted_by_phone,
      dealAmount: item.deal_amount,
      dealNote: item.deal_note,
    }));
  } catch (error) {
    console.log('Fetch Error:', error);
    return [];
  }
};
