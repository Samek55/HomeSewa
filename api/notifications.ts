import axios from 'axios';
import { supabase } from '../lib/supabase';
import { maskCustomerName } from '../src/utils/maskName';

const SPARROW_TOKEN = process.env.EXPO_PUBLIC_SPARROW_TOKEN!;

const ONESIGNAL_APP_ID = process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID;
const ONESIGNAL_REST_API_KEY = process.env.EXPO_PUBLIC_ONESIGNAL_REST_API_KEY;

const NOTIFICATION_DEFAULTS = {
  large_icon: 'homesewa',          // white-bg + green logo (bundled via app.json largeIcons)
  small_icon: 'notification_small_icon', // monochrome logo drawable
  android_accent_color: 'FF295C59',      // green tint for small icon (no # prefix for OneSignal)
};

const sendNotification = async (payload: object) => {
  if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) {
    console.log('Notification skipped: missing OneSignal config');
    return;
  }
  await axios.post(
    'https://api.onesignal.com/notifications',
    { app_id: ONESIGNAL_APP_ID, ...NOTIFICATION_DEFAULTS, ...payload },
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
          // No 'area' tag is ever set on a device (only 'city', from working_areas[0] — see
          // app/_layout.tsx and AdminLogin.tsx), so this used to filter on a tag nobody has.
          { field: 'tag', key: 'city', relation: '=', value: cleanArea },
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
 * @param providerPhone The accepting professional's phone number (this app authenticates
 *   admins/professionals via Supabase phone+PIN, not Firebase Auth, so there is no
 *   `auth.currentUser` to read this from — it must be passed in explicitly)
 */
export async function notifyUsers(service: string, bookingArea: string, customerPhone: string, providerPhone?: string) {
  try {
    const cleanCustomerPhone = customerPhone?.trim();

    if (!cleanCustomerPhone) {
      console.log('Notification skipped: No customer phone target provided.');
      return;
    }

    const cleanService = service?.trim() || '';
    const cleanArea = bookingArea?.trim() || '';
    const cleanProviderPhone = providerPhone?.replace(/\D/g, '').slice(-10) || '';
    const providerLabel = cleanProviderPhone || 'A service provider';

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
      contents: { en: `Your HomeSewa provider (${providerLabel}) has accepted your request for "${cleanService}" in ${cleanArea}.` },
    });

    console.log(`Notification safely sent to customer tag phone: ${cleanCustomerPhone}`);
  } catch (error: any) {
    console.log('Booking notification error:', error?.response?.data || error.message);
  }
}

// New professional registration → super admins only (fetched from DB, never tag-based)
export async function notifyAdminNewProfessional(applicantName: string, positions: string[]) {
  try {
    // Fetch only super admin phones (role != 'professional' and active)
    const { data: superAdmins } = await supabase
      .from('admin')
      .select('phone')
      .neq('role', 'professional')
      .eq('status', 'Active');

    if (!superAdmins || superAdmins.length === 0) {
      console.log('No active super admins found to notify');
      return;
    }

    const phones = superAdmins
      .map((a: any) => String(a.phone).replace(/\D/g, '').slice(-10))
      .filter((p: string) => p.length === 10);

    if (phones.length === 0) return;

    const services = positions.length > 0 ? positions.join(', ') : 'N/A';
    await sendNotification({
      include_aliases: { external_id: phones },
      target_channel: 'push',
      headings: { en: 'New Professional Application' },
      contents: { en: `${applicantName} (${services}) has applied. Review in Verification screen.` },
    });
  } catch (error: any) {
    console.log('New professional notification error:', error?.response?.data || error.message);
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

// Push to professionals matching one or more services in one or more cities
export async function notifyProfessionalsInCity(service: string | string[], city: string | string[], message?: string) {
  try {
    const services = (Array.isArray(service) ? service : [service]).map(s => s.trim());
    const cities = (Array.isArray(city) ? city : [city]).map(c => c.trim());

    const serviceLabel = services.join(', ');
    const cityLabel = cities.join(', ');

    const { data } = await supabase
      .from('workforce')
      .select('phone')
      .overlaps('services', services)
      .in('preferred_city', cities)
      .eq('profile_status', 'Active');

    if (!data || data.length === 0) {
      throw new Error(`No active professionals found for "${serviceLabel}" in "${cityLabel}".`);
    }

    const phones = data
      .map((p: any) => String(p.phone).replace(/\D/g, '').slice(-10))
      .filter((p: string) => p.length === 10);

    if (phones.length === 0) throw new Error('No valid phone numbers found for matching professionals.');

    await sendNotification({
      include_aliases: { external_id: phones },
      target_channel: 'push',
      headings: { en: `HomeSewa — ${serviceLabel} in ${cityLabel}` },
      contents: { en: message || `New ${serviceLabel} booking in ${cityLabel}. Open HomeSewa to respond.` },
    });

    console.log(`City push sent to ${phones.length} professionals for "${serviceLabel}" in "${cityLabel}"`);
  } catch (error: any) {
    console.log('notifyProfessionalsInCity error:', error?.response?.data || error.message);
    throw error;
  }
}

// Push notification to up to 5 random professionals registered in the booking area
export async function pushAreaProfessionals(service: string, area: string, customerName?: string, city?: string) {
  try {
    const { data } = await supabase
      .from('workforce')
      .select('phone, first_name')
      .contains('services', [service])
      .contains('working_areas', [area])
      .eq('profile_status', 'Active');

    if (!data || data.length === 0) {
      console.log(`No active "${service}" professionals found in "${area}"`);
      return;
    }

    const targets = [...data].sort(() => Math.random() - 0.5).slice(0, 5);
    const maskedName = maskCustomerName(customerName);
    const location = [area, city].filter(Boolean).join(', ');

    await Promise.all(targets.map(async (pro) => {
      const phone = String(pro.phone).replace(/\D/g, '').slice(-10);
      await sendNotification({
        include_aliases: { external_id: [phone] },
        target_channel: 'push',
        headings: { en: 'HomeSewa Service Request' },
        contents: { en: `${maskedName} is looking for a ${service} in ${location}. Open HomeSewa to accept the booking!` },
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
      .contains('services', [service.trim()])
      .eq('preferred_city', city.trim())
      .eq('profile_status', 'Active');

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