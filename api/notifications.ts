import axios from 'axios';
import { getAuth } from 'firebase/auth';
import { supabase } from '../lib/supabase';

const SPARROW_TOKEN = process.env.EXPO_PUBLIC_SPARROW_TOKEN!;

const ONESIGNAL_APP_ID = process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID;
const ONESIGNAL_REST_API_KEY = process.env.EXPO_PUBLIC_ONESIGNAL_REST_API_KEY;

const sendNotification = async (payload: object) => {
  if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) {
    console.log('Notification skipped: missing OneSignal config');
    return;
  }
  await axios.post(
    'https://api.onesignal.com/notifications',
    { app_id: ONESIGNAL_APP_ID, ...payload },
    {
      headers: {
        Authorization: `Key ${ONESIGNAL_REST_API_KEY}`,
        'Content-Type': 'application/json',
      },
    }
  );
};

// Service booking for notifying careers → service providers who serve that specific area and service
// Service booking for notifying careers → service providers who serve that specific area and service
export async function notifyProfessionals(service: string, bookingArea: string) {
  try {
    const cleanService = service.trim();
    const cleanArea = bookingArea.trim();

    // -------------------------------------------------------------
    // 1. DISPATCH TARGETED SMS (Filtered by Role, Service, AND Area)
    // -------------------------------------------------------------
    try {
      await sendNotification({
        filters: [
          { field: 'tag', key: 'role', relation: '=', value: 'career' },
          { field: 'tag', key: 'services', relation: '=', value: cleanService },
          { field: 'tag', key: 'area', relation: '=', value: cleanArea }, // Strict Area Filter
        ],
        // Omit headings/contents so this profile segment doesn't receive a duplicate push
        sms_from: "+1234567890", // Must match your OneSignal SMS dashboard config
        sms_body: `HomeSewa Alert: New "${cleanService}" job is available in ${cleanArea}. Open your app to accept the booking!`,
      });
      console.log(`SMS broadcast successfully queued for "${cleanService}" in "${cleanArea}"`);
    } catch (smsError) {
      console.log('SMS dispatch sub-routine failed:', smsError);
    }

    // -------------------------------------------------------------
    // 2. DISPATCH BROAD PUSH NOTIFICATION (Filtered by Role and Service only)
    // -------------------------------------------------------------
    try {
      await sendNotification({
        filters: [
          { field: 'tag', key: 'role', relation: '=', value: 'career' },
          { field: 'tag', key: 'services', relation: '=', value: cleanService }, // No Area Filter
        ],
        headings: { en: 'HomeSewa Service Request' },
        contents: { en: `New "${cleanService}" booking in ${cleanArea}. Open HomeSewa to respond.` },
      });
      console.log(`Push notification broadcast successfully queued for all "${cleanService}" providers`);
    } catch (pushError) {
      console.log('Push notification sub-routine failed:', pushError);
    }

  } catch (error: any) {
    console.log('Global notification wrapper execution error:', error?.response?.data || error.message);
  }
}

/**
 * Notifies the customer that their booking has been accepted.
 * @param service Name of the service
 * @param bookingArea Area of the booking
 * @param customerPhone The direct 10-digit phone number string (e.g., "9803179846")
 */
export async function notifyUsers(service: string, bookingArea: string, customerPhone: string) {
  try {
    const auth = getAuth();
    const currentUser = auth.currentUser;

    const providerPhone = currentUser?.email?.slice(0, 10) || 'A service provider';
    const cleanCustomerPhone = customerPhone?.trim();

    if (!cleanCustomerPhone) {
      console.log('Notification skipped: No customer phone target provided.');
      return;
    }

    const cleanService = service?.trim() || '';
    const cleanArea = bookingArea?.trim() || '';

    await sendNotification({
      // Explicitly targeting the App Push channel along with your custom tags
      filters: [
        { field: 'tag', key: 'role', relation: '=', value: 'user' },
        { operator: 'AND' },
        { field: 'tag', key: 'phone', relation: '=', value: cleanCustomerPhone }
      ],
      // This forces OneSignal to only count users with valid, subscribed Push tokens
      is_wp_wns: false,
      headings: { en: 'Booking Accepted' },
      contents: { en: `Your HomeSewa provider (${providerPhone}) has accepted your request for "${cleanService}" in ${cleanArea}.` },
    });

    console.log(`Notification safely sent to customer tag phone: ${cleanCustomerPhone}`);
  } catch (error: any) {
    console.log('Booking notification error:', error?.response?.data || error.message);
  }
}

// Partnership form submitted → admin only
export async function notifyAdmins(applicantName: string) {
  try {
    await sendNotification({
      filters: [
        { field: 'tag', key: 'role', relation: '=', value: 'admin' },
      ],
      headings: { en: 'New Partnership Application' },
      contents: { en: `${applicantName} submitted a partnership application. Review it now.` },
    });
    console.log('Admin notification sent for partnership:', applicantName);
  } catch (error: any) {
    console.log('Admin notification error:', error?.response?.data || error.message);
  }
}

// Push to all professionals of a service in a specific city
export async function notifyProfessionalsInCity(service: string, city: string) {
  try {
    const { data } = await supabase
      .from('workforce')
      .select('phone')
      .contains('positions', [service.trim()])
      .eq('preferred_city', city.trim())
      .eq('status', 'Active');

    if (!data || data.length === 0) {
      console.log(`No professionals found for "${service}" in "${city}"`);
      return;
    }

    const phones = data
      .map((p: any) => String(p.phone).replace(/\D/g, '').slice(-10))
      .filter((p: string) => p.length === 10);

    if (phones.length === 0) return;

    await sendNotification({
      include_aliases: { external_id: phones },
      target_channel: 'push',
      headings: { en: 'HomeSewa Service Request' },
      contents: { en: `New ${service} booking in ${city}. Open HomeSewa to respond.` },
    });

    console.log(`City push sent to ${phones.length} professionals for "${service}" in "${city}"`);
  } catch (error: any) {
    console.log('notifyProfessionalsInCity error:', error?.response?.data || error.message);
  }
}

// Push notification to up to 5 random professionals registered in the booking area
export async function pushAreaProfessionals(service: string, area: string) {
  try {
    const { data } = await supabase
      .from('workforce')
      .select('phone, full_name')
      .contains('positions', [service])
      .contains('working_areas', [area])
      .eq('status', 'Active');

    if (!data || data.length === 0) {
      console.log(`No active "${service}" professionals found in "${area}"`);
      return;
    }

    const targets = [...data].sort(() => Math.random() - 0.5).slice(0, 5);

    await Promise.all(targets.map(async (pro) => {
      const firstName = (pro.full_name || '').split(' ')[0] || 'Professional';
      const phone = String(pro.phone).replace(/\D/g, '').slice(-10);
      await sendNotification({
        include_aliases: { external_id: [phone] },
        target_channel: 'push',
        headings: { en: 'HomeSewa Service Request' },
        contents: { en: `Dear ${firstName}, a new ${service} service request is available in ${area}. Open HomeSewa to accept the booking!` },
      });
    }));

    console.log(`Push sent to ${targets.length} "${service}" professionals in "${area}"`);
  } catch (error: any) {
    console.log('pushAreaProfessionals error:', error.message);
  }
}

// Push to all city professionals when a booking has been accepted (excluding the one who accepted)
export async function notifyProfessionalsAccepted(service: string, city: string, area: string, excludePhone?: string) {
  try {
    const { data } = await supabase
      .from('workforce')
      .select('phone')
      .contains('positions', [service.trim()])
      .eq('preferred_city', city.trim())
      .eq('status', 'Active');

    if (!data || data.length === 0) {
      console.log(`No professionals found for "${service}" in "${city}"`);
      return;
    }

    const cleanExclude = excludePhone?.replace(/\D/g, '').slice(-10) || '';
    const phones = data
      .map((p: any) => String(p.phone).replace(/\D/g, '').slice(-10))
      .filter((p: string) => p !== cleanExclude && p.length === 10);

    if (phones.length === 0) {
      console.log('No other professionals to notify');
      return;
    }

    await sendNotification({
      include_aliases: { external_id: phones },
      target_channel: 'push',
      headings: { en: 'Job No Longer Available' },
      contents: { en: `The ${service} job in ${area} has been accepted by another professional. Stay active for new bookings on HomeSewa.` },
    });

    console.log(`Accepted push sent to ${phones.length} professionals for "${service}" in "${city}"`);
  } catch (error: any) {
    console.log('notifyProfessionalsAccepted error:', error?.response?.data || error.message);
  }
}

// Push to customers only
export async function notifyCustomers(title: string, message: string) {
  try {
    await sendNotification({
      filters: [{ field: 'tag', key: 'role', relation: '=', value: 'user' }],
      headings: { en: title },
      contents: { en: message },
    });
    console.log('Customer notification sent:', title);
  } catch (error: any) {
    console.log('Customer notification error:', error?.response?.data || error.message);
  }
}

// Announcements & public messages → everyone
export async function notifyAll(title: string, message: string) {
  try {
    await sendNotification({
      included_segments: ['All'],
      headings: { en: title },
      contents: { en: message },
    });
    console.log('Broadcast notification sent:', title);
  } catch (error: any) {
    console.log('Broadcast notification error:', error?.response?.data || error.message);
  }
}