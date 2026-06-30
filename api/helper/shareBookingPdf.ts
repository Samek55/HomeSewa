import { Share, Alert } from 'react-native';
import { buildBookingPdfHtml } from './bookingPdfTemplate';

export async function shareBookingPdf(booking: any) {
    if (!booking) return;

    const location = [booking.area, booking.city].filter(Boolean).join(', ');
    const bookingId = booking.bookingId ?? booking.id ?? 'Unknown';

    // Try PDF (native build only — not available in Expo Go)
    try {
        const Sharing = require('expo-sharing');
        const isAvailable = await Sharing.isAvailableAsync().catch(() => false);

        if (isAvailable) {
            const Print = require('expo-print');
            const FileSystem = require('expo-file-system');

            const html = buildBookingPdfHtml(booking);
            const { uri } = await Print.printToFileAsync({ html, width: 1080, height: 1920 });

            const cacheDir = FileSystem.cacheDirectory ?? uri.substring(0, uri.lastIndexOf('/') + 1);
            const namedUri = `${cacheDir}HomeSewa-${bookingId}.pdf`;

            const info = await FileSystem.getInfoAsync(namedUri);
            if (info.exists) await FileSystem.deleteAsync(namedUri, { idempotent: true });
            await FileSystem.moveAsync({ from: uri, to: namedUri });

            await Sharing.shareAsync(namedUri, {
                mimeType: 'application/pdf',
                dialogTitle: `HomeSewa Booking #${bookingId}`,
                UTI: 'com.adobe.pdf',
            });
            return;
        }
    } catch (err: any) {
        console.warn('[SharePDF] PDF failed, using text fallback:', err?.message);
    }

    // Text fallback (Expo Go / simulator)
    try {
        await Share.share({
            message: [
                `HomeSewa Booking Receipt`,
                `Booking ID: #${bookingId}`,
                ``,
                `Customer: ${booking.fullName ?? '—'}`,
                `Phone: +977 ${booking.phone ?? '—'}`,
                `Service: ${booking.service ?? '—'}`,
                booking.status ? `Status: ${booking.status}` : null,
                `Budget: ${booking.budget ?? '—'}`,
                location ? `Location: ${location}` : null,
                booking.bookingDate ? `Booking Date: ${booking.bookingDate}` : null,
                booking.startingDate ? `Starting Date: ${booking.startingDate}` : null,
                booking.completionDate ? `Ending Date: ${booking.completionDate}` : null,
                booking.approxDays != null ? `Approx Days: ${booking.approxDays} Day${booking.approxDays !== 1 ? 's' : ''}` : null,
                booking.specialRequests ? `Special Request: ${booking.specialRequests}` : null,
                ``,
                `Helpline: +977 98520 24 365`,
                `www.homesewa.app`,
            ].filter(Boolean).join('\n'),
            title: `HomeSewa Booking #${bookingId}`,
        });
    } catch {
        Alert.alert('Error', 'Could not share booking details.');
    }
}
