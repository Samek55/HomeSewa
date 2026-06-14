import axios from 'axios';
import { getAuth } from 'firebase/auth';

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
        sms_body: `🚀 RocketSingh Alert: New "${cleanService}" job is available in ${cleanArea}. Open your app to accept the booking!`,
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
        headings: { en: '🚀 New Job Available!' },
        contents: { en: `New "${cleanService}" booking in ${cleanArea}. Open RocketSingh to respond.` },
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
      headings: { en: 'Booking Accepted 🚀' },
      contents: { en: `Provider (${providerPhone}) has accepted your request for "${cleanService}" in ${cleanArea}.` },
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