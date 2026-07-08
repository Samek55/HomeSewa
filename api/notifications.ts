import axios from 'axios';
import { supabase } from '../lib/supabase';
import { maskCustomerName } from '../src/utils/maskName';

const SPARROW_TOKEN = process.env.EXPO_PUBLIC_SPARROW_TOKEN!;

const ONESIGNAL_APP_ID = process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID;
const ONESIGNAL_REST_API_KEY = process.env.EXPO_PUBLIC_ONESIGNAL_REST_API_KEY;

const NOTIFICATION_DEFAULTS = {
  // Must match the actual generated drawable names (see onesignal-expo-plugin config in
  // app.json) — neither 'homesewa' nor 'notification_small_icon' exist as resources, which
  // was causing Android to silently fall back to a plain tinted circle for every notification.
  large_icon: 'ic_onesignal_large_icon_default',
  small_icon: 'ic_stat_onesignal_default',
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

// Persists a copy of every notification sent so the in-app "My Notifications" screen can show
// history — never blocks or fails the actual push send if this write has a problem.
type NotificationAudience = 'professional_open' | 'customer_specific' | 'customer_all' | 'admin_all' | 'super_admin' | 'all';
const logNotification = async (row: {
  title: string;
  body: string;
  screen?: string;
  linkId?: string;
  audience: NotificationAudience;
  service?: string;
  city?: string;
  phone?: string;
}) => {
  try {
    await supabase.from('notifications').insert([{
      title: row.title,
      body: row.body,
      screen: row.screen || null,
      link_id: row.linkId || null,
      audience: row.audience,
      audience_service: row.service || null,
      audience_city: row.city || null,
      audience_phone: row.phone || null,
    }]);
  } catch (e) {
    console.log('logNotification failed:', e);
  }
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
 * @param customerPhone The direct 10-digit phone number string (e.g., "9803179846")
 * @param customerName The customer's full name, for the greeting
 * @param providerPhone The accepting professional's phone number (this app authenticates
 *   admins/professionals via Supabase phone+PIN, not Firebase Auth, so there is no
 *   `auth.currentUser` to read this from — it must be passed in explicitly)
 * @param providerName The accepting professional's full name
 * @param providerGender Used to pick "He"/"She" in the message; falls back to "They" if unknown
 */
export async function notifyUsers(
  service: string,
  customerPhone: string,
  customerName: string,
  providerPhone?: string,
  providerName?: string,
  providerGender?: string | null,
) {
  try {
    const cleanCustomerPhone = customerPhone?.trim();

    if (!cleanCustomerPhone) {
      console.log('Notification skipped: No customer phone target provided.');
      return;
    }

    const cleanService = service?.trim() || '';
    const cleanProviderPhone = providerPhone?.replace(/\D/g, '').slice(-10) || '';
    const customerFirstName = (customerName || '').trim().split(/\s+/)[0] || 'Customer';
    const providerFirstName = (providerName || '').trim().split(/\s+/)[0] || 'HomeSewa Professional';
    const pronoun = providerGender === 'Male' ? 'He' : providerGender === 'Female' ? 'She' : 'They';

    const title = 'Booking Accepted';
    const body = `Dear ${customerFirstName}, your HomeSewa provider ${providerFirstName}, (${cleanProviderPhone}) has accepted your request for "${cleanService}". ${pronoun} will contact you shortly or you too can call for further information. Thank You`;

    await sendNotification({
      // Explicitly targeting the App Push channel along with your custom tags
      filters: [
        { field: 'tag', key: 'role', relation: '=', value: 'user' },
        { operator: 'AND' },
        { field: 'tag', key: 'phone', relation: '=', value: cleanCustomerPhone }
      ],
      // This forces OneSignal to only count users with valid, subscribed Push tokens
      is_wp_wns: false,
      headings: { en: title },
      contents: { en: body },
      data: { screen: '/Home' },
    });
    logNotification({ title, body, screen: '/Home', audience: 'customer_specific', phone: cleanCustomerPhone }).catch(() => {});

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
    const title = 'New Professional Application';
    const body = `Hi, ${applicantName}, (${services}) has filled the "Join as a Professional" form. Please, review it on the Professional Verification screen. Thanks`;
    await sendNotification({
      include_aliases: { external_id: phones },
      target_channel: 'push',
      headings: { en: title },
      contents: { en: body },
      data: { screen: '/admin/ProfessionalVerification' },
    });
    logNotification({ title, body, screen: '/admin/ProfessionalVerification', audience: 'super_admin' }).catch(() => {});
  } catch (error: any) {
    console.log('New professional notification error:', error?.response?.data || error.message);
  }
}

// Partnership form submitted → admin only
export async function notifyAdmins(applicantName: string) {
  try {
    const title = 'New Partnership Application';
    const body = `Hi, ${applicantName} has submitted a partnership application form. Please, review it now. Thanks`;
    await sendNotification({
      filters: [
        { field: 'tag', key: 'role', relation: '=', value: 'admin' },
      ],
      headings: { en: title },
      contents: { en: body },
      // No dedicated partnership-review screen exists yet — lands on Home for now.
      data: { screen: '/Home' },
    });
    logNotification({ title, body, screen: '/Home', audience: 'admin_all' }).catch(() => {});
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

    const title = `HomeSewa — ${serviceLabel} in ${cityLabel}`;
    const body = message || `New ${serviceLabel} booking in ${cityLabel}. Open HomeSewa to respond.`;
    await sendNotification({
      include_aliases: { external_id: phones },
      target_channel: 'push',
      headings: { en: title },
      contents: { en: body },
      data: { screen: '/admin/BookingHistory' },
    });
    logNotification({ title, body, screen: '/admin/BookingHistory', audience: 'professional_open', service: serviceLabel, city: cityLabel }).catch(() => {});

    console.log(`City push sent to ${phones.length} professionals for "${serviceLabel}" in "${cityLabel}"`);
  } catch (error: any) {
    console.log('notifyProfessionalsInCity error:', error?.response?.data || error.message);
    throw error;
  }
}

// Push notification to every active professional in the whole city matching this service
// (sent when a new booking is confirmed by an admin)
export async function pushAreaProfessionals(service: string, area: string, customerName?: string, city?: string, bookingId?: string) {
  try {
    const cleanService = service.trim();
    const cleanCity = (city || '').trim();

    const { data } = await supabase
      .from('workforce')
      .select('phone')
      .contains('services', [cleanService])
      .eq('preferred_city', cleanCity)
      .eq('profile_status', 'Active');

    if (!data || data.length === 0) {
      console.log(`No active "${cleanService}" professionals found in "${cleanCity}"`);
      return;
    }

    const phones = data
      .map((p: any) => String(p.phone).replace(/\D/g, '').slice(-10))
      .filter((p: string) => p.length === 10);

    if (phones.length === 0) return;

    const maskedName = maskCustomerName(customerName);
    const location = [area, city].filter(Boolean).join(', ');
    const title = 'HomeSewa Service Request';
    const body = `${maskedName} is looking for a ${cleanService} in ${location}. Open HomeSewa App to accept the booking! Thank You`;
    const screen = bookingId ? '/admin/BookingDetails_1' : '/admin/BookingHistory';

    await sendNotification({
      include_aliases: { external_id: phones },
      target_channel: 'push',
      headings: { en: title },
      contents: { en: body },
      data: bookingId ? { screen, id: bookingId } : { screen },
    });
    logNotification({ title, body, screen, linkId: bookingId, audience: 'professional_open', service: cleanService, city: cleanCity }).catch(() => {});

    console.log(`Push sent to ${phones.length} "${cleanService}" professionals in "${cleanCity}"`);
  } catch (error: any) {
    console.log('pushAreaProfessionals error:', error.message);
  }
}

// Push to all city professionals when a booking has been accepted (excluding the one who accepted)
export async function notifyProfessionalsAccepted(service: string, city: string, area: string, excludePhone?: string, acceptedByName?: string) {
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

    const title = 'Job No Longer Available';
    const body = `The ${service} in ${area} has been accepted by ${maskCustomerName(acceptedByName)}. Stay active for new bookings on HomeSewa.`;
    await sendNotification({
      include_aliases: { external_id: phones },
      target_channel: 'push',
      headings: { en: title },
      contents: { en: body },
      data: { screen: '/admin/BookingHistory' },
    });
    logNotification({ title, body, screen: '/admin/BookingHistory', audience: 'professional_open', service, city }).catch(() => {});

    console.log(`Accepted push sent to ${phones.length} professionals for "${service}" in "${city}"`);
  } catch (error: any) {
    console.log('notifyProfessionalsAccepted error:', error?.response?.data || error.message);
  }
}

// Push to all city professionals when one professional rejects a booking, so it "resubmits"
// to the rest of the pool (excluding the professional who just rejected it).
export async function notifyProfessionalsRejected(service: string, city: string, excludePhone?: string, bookingId?: string, customerName?: string, area?: string) {
  try {
    const cleanService = service.trim();
    const cleanCity = city.trim();

    const { data } = await supabase
      .from('workforce')
      .select('phone')
      .contains('services', [cleanService])
      .eq('preferred_city', cleanCity)
      .eq('profile_status', 'Active');

    if (!data || data.length === 0) {
      console.log(`No professionals found for "${cleanService}" in "${cleanCity}"`);
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

    const title = 'Re-request HomeSewa Service';
    const body = `${maskCustomerName(customerName)} is again looking for a ${cleanService} in ${[area, cleanCity].filter(Boolean).join(', ')}. Open HomeSewa App to accept the booking! Thank You`;
    const screen = bookingId ? '/admin/BookingDetails_1' : '/admin/BookingHistory';

    await sendNotification({
      include_aliases: { external_id: phones },
      target_channel: 'push',
      headings: { en: title },
      contents: { en: body },
      data: bookingId ? { screen, id: bookingId } : { screen },
    });
    logNotification({ title, body, screen, linkId: bookingId, audience: 'professional_open', service: cleanService, city: cleanCity }).catch(() => {});

    console.log(`Rejected-job push sent to ${phones.length} professionals for "${cleanService}" in "${cleanCity}"`);
  } catch (error: any) {
    console.log('notifyProfessionalsRejected error:', error?.response?.data || error.message);
  }
}

// Push to customers only
export async function notifyCustomers(title: string, message: string) {
  try {
    await sendNotification({
      filters: [{ field: 'tag', key: 'role', relation: '=', value: 'user' }],
      headings: { en: title },
      contents: { en: message },
      data: { screen: '/Home' },
    });
    logNotification({ title, body: message, screen: '/Home', audience: 'customer_all' }).catch(() => {});
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
      data: { screen: '/Home' },
    });
    logNotification({ title, body: message, screen: '/Home', audience: 'all' }).catch(() => {});
    console.log('Broadcast notification sent:', title);
  } catch (error: any) {
    console.log('Broadcast notification error:', error?.response?.data || error.message);
  }
}