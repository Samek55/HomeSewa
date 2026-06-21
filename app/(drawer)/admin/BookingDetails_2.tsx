import React, { useEffect, useState } from 'react';
import {
    View, Text, Image, TouchableOpacity,
    StyleSheet, ActivityIndicator, Alert, Linking, Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import leftArrowIcon from '../../../assets/icons/admin/leftarrow.png';
import dropdownIcon from '../../../assets/icons/contact/DropDown.png';
import { fetchBookingsFromAirtable } from '../../../api/helper/fetchBookingDataAirtable';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import Header4 from '@/components/Header4Admin';
import { router, useLocalSearchParams } from 'expo-router';
import { updateBookingStatus } from '../../../api/helper/updateBookingStatus';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SPARROW_TOKEN = process.env.EXPO_PUBLIC_SPARROW_TOKEN!;

const generateOtp = () => String(Math.floor(1000 + Math.random() * 9000));

const sendCompletionOtp = async (phone: string, customerName: string, otp: string) => {
    const to = '977' + phone.replace(/\D/g, '').slice(-10);
    const firstName = customerName.split(' ')[0] || 'Customer';
    const text = `Dear ${firstName}, your HomeSewa service is being marked as completed.\n\nYour completion OTP is: ${otp}\n\nShare this code with the professional to confirm.\n\nHomeSewa ( www.homesewa.app )`;
    await fetch('https://api.sparrowsms.com/v2/sms/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: SPARROW_TOKEN, from: 'TheAlert', to, text }),
    });
};

type StatusType = 'Completed' | 'Pending' | 'Cancelled' | 'Dispute';

export default function BookingDetails() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const [booking, setBooking] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [openDropdown, setOpenDropdown] = useState(false);
    const [workStatus, setWorkStatus] = useState<StatusType>('Pending');
    const [isLocked, setIsLocked] = useState(false);

    const STATUS_OPTIONS: StatusType[] = ['Completed', 'Pending', 'Cancelled', 'Dispute'];

    useEffect(() => {
        const loadBooking = async () => {
            setLoading(true);
            try {
                const data = await fetchBookingsFromAirtable();
                const found = data.find((item: any) => item.id === id);
                if (found) {
                    setBooking(found);
                    if (found.status) {
                        setWorkStatus(found.status);
                        if (found.status.toLowerCase().includes('completed')) setIsLocked(true);
                    }
                }
            } catch (error) {
                console.error('Error loading booking data:', error);
            } finally {
                setLoading(false);
            }
        };
        loadBooking();
    }, [id]);

    const handleStatusChange = (newStatus: StatusType) => {
        setWorkStatus(newStatus);
        setOpenDropdown(false);
    };

    const handleSubmit = async () => {
        try {
            if (!booking?.id) return;
            if (workStatus === 'Completed') {
                const otp = generateOtp();
                const customerPhone = booking?.phone || '';
                const customerName = booking?.fullName || 'Customer';
                try { await sendCompletionOtp(customerPhone, customerName, otp); } catch {}
                await AsyncStorage.setItem('completionOtp', JSON.stringify({ otp, bookingId: booking.id }));
                router.push({ pathname: '/admin/WorkCompletionOTP', params: { customerName, customerPhone } });
                return;
            }
            await updateBookingStatus(booking.id, workStatus);
            router.replace({ pathname: '/admin/BookingHistory', params: { refresh: Date.now() } });
        } catch (error) {
            Alert.alert('Error', 'Failed to update status');
        }
    };

    const handleSharePDF = async () => {
        if (!booking) return;
        const location = [booking.area, booking.city].filter(Boolean).join(', ');

        // Try real PDF first — works in production/dev builds, silently falls
        // through to text sharing when native modules aren't available (Expo Go).
        try {
            const Print = require('expo-print');
            const Sharing = require('expo-sharing');
            const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/>
<style>
  body{font-family:Arial,sans-serif;padding:32px;color:#222;max-width:600px;margin:auto}
  h1{color:#295C59;font-size:22px;margin-bottom:4px}
  .sub{color:#888;font-size:13px;margin-bottom:20px}
  hr{border:none;border-top:1px solid #ddd;margin:16px 0}
  .row{display:flex;justify-content:space-between;margin-bottom:12px}
  .col{flex:1}
  .lbl{font-size:11px;color:#888;font-weight:bold;text-transform:uppercase;margin-bottom:2px}
  .val{font-size:14px;color:#222}
  .footer{font-size:11px;color:#aaa;margin-top:24px;text-align:center}
</style></head><body>
<h1>HomeSewa — Booking Receipt</h1>
<div class="sub">Booking ID: #${booking.bookingId}</div><hr/>
<div class="row">
  <div class="col"><div class="lbl">Customer</div><div class="val">${booking.fullName}</div></div>
  <div class="col"><div class="lbl">Phone</div><div class="val">+977 ${booking.phone}</div></div>
</div>
<div class="row">
  <div class="col"><div class="lbl">Service</div><div class="val">${booking.service}</div></div>
  <div class="col"><div class="lbl">Status</div><div class="val" style="color:#22c55e;font-weight:700">${booking.status}</div></div>
</div>
<div class="row">
  <div class="col"><div class="lbl">Budget</div><div class="val">${booking.budget}</div></div>
  <div class="col"><div class="lbl">Location</div><div class="val">${location}</div></div>
</div>
<div class="row">
  <div class="col"><div class="lbl">Booking Date</div><div class="val">${booking.bookingDate}</div></div>
  <div class="col"><div class="lbl">Starting Date</div><div class="val">${booking.startingDate}</div></div>
</div>
${booking.completionDate ? `<div class="row"><div class="col"><div class="lbl">Ending Date</div><div class="val">${booking.completionDate}</div></div></div>` : ''}
${booking.approxDays != null ? `<div class="row"><div class="col"><div class="lbl">Approx Days to Complete</div><div class="val">${booking.approxDays} Day${booking.approxDays !== 1 ? 's' : ''}</div></div></div>` : ''}
${booking.specialRequests ? `<hr/><div class="lbl">Special Request</div><div class="val">${booking.specialRequests}</div>` : ''}
<div class="footer">Generated by HomeSewa · www.homesewa.app</div>
</body></html>`;
            const { uri } = await Print.printToFileAsync({ html });
            await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: `Booking #${booking.bookingId}` });
            return;
        } catch {
            // Native PDF modules unavailable (Expo Go) — fall through to text share
        }

        // Text fallback for Expo Go
        try {
            await Share.share({
                message: `HomeSewa Booking Receipt\nBooking ID: #${booking.bookingId}\n\nCustomer: ${booking.fullName}\nPhone: +977 ${booking.phone}\nService: ${booking.service}\nStatus: ${booking.status}\nBudget: ${booking.budget}\nLocation: ${location}\nBooking Date: ${booking.bookingDate}\nStarting Date: ${booking.startingDate}${booking.completionDate ? `\nEnding Date: ${booking.completionDate}` : ''}${booking.approxDays != null ? `\nApprox Days: ${booking.approxDays} Day${booking.approxDays !== 1 ? 's' : ''}` : ''}${booking.specialRequests ? `\nSpecial Request: ${booking.specialRequests}` : ''}\n\nwww.homesewa.app`,
                title: `Booking #${booking.bookingId}`,
            });
        } catch {
            Alert.alert('Error', 'Could not share booking');
        }
    };

    const statusColor = (s: string) => {
        const ls = s?.toLowerCase() || '';
        if (ls.includes('completed')) return '#22c55e';
        if (ls.includes('pending')) return '#E8A317';
        if (ls.includes('cancel')) return '#ef4444';
        if (ls.includes('dispute')) return '#B8860B';
        return '#555';
    };

    return (
        <View style={styles.screen}>
            <Header4 />

            {/* HEADER ROW */}
            <View style={styles.headerRow}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Image source={leftArrowIcon} style={styles.backIcon} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>
                    {booking?.bookingId ? `Booking ID: ${booking.bookingId}` : 'Booking Details'}
                </Text>
                <TouchableOpacity onPress={handleSharePDF} style={styles.shareBtn} disabled={!booking}>
                    <Ionicons name="share-outline" size={22} color="#295C59" />
                </TouchableOpacity>
            </View>

            {/* CONTENT */}
            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#295C59" />
                    <Text style={styles.loadingText}>Loading...</Text>
                </View>
            ) : !booking ? (
                <View style={styles.center}>
                    <Text style={styles.loadingText}>No booking found.</Text>
                </View>
            ) : (
                <View style={styles.card}>
                    {/* TOP: booking info */}
                    <View>
                        <Text style={styles.heading}>{booking.fullName}</Text>
                        <TouchableOpacity onPress={() => Linking.openURL(`tel:+977${booking.phone}`)}>
                            <Text style={styles.phone}>📞  +977 {booking.phone}</Text>
                        </TouchableOpacity>

                        <View style={styles.divider} />

                        <View style={styles.field}>
                            <Text style={styles.label}>Service</Text>
                            <Text style={styles.value}>{booking.service}</Text>
                        </View>

                        <View style={styles.field}>
                            <Text style={styles.label}>Location</Text>
                            <Text style={styles.value}>{[booking.area, booking.city].filter(Boolean).join(', ')}</Text>
                        </View>

                        <View style={styles.field}>
                            <Text style={styles.label}>Budget</Text>
                            <Text style={styles.value}>{booking.budget}</Text>
                        </View>

                        <View style={styles.field}>
                            <Text style={styles.label}>Booking Date</Text>
                            <Text style={styles.value}>{booking.bookingDate}</Text>
                        </View>

                        <View style={styles.field}>
                            <Text style={styles.label}>Starting Date</Text>
                            <Text style={styles.value}>{booking.startingDate}</Text>
                        </View>

                        {booking.completionDate ? (
                            <View style={styles.field}>
                                <Text style={styles.label}>Ending Date</Text>
                                <Text style={styles.value}>{booking.completionDate}</Text>
                            </View>
                        ) : null}

                        {booking.approxDays != null ? (
                            <View style={styles.field}>
                                <Text style={styles.label}>Approx Days to Complete</Text>
                                <Text style={styles.value}>{booking.approxDays} Day{booking.approxDays !== 1 ? 's' : ''}</Text>
                            </View>
                        ) : null}

                        {booking.specialRequests ? (
                            <View style={styles.field}>
                                <Text style={styles.label}>Special Request</Text>
                                <Text style={styles.value}>{booking.specialRequests}</Text>
                            </View>
                        ) : null}
                    </View>

                    {/* BOTTOM: status control — pinned to bottom */}
                    <View>
                        <View style={styles.divider} />
                        <Text style={styles.statusLabel}>Work Status</Text>
                        {isLocked && (
                            <Text style={styles.lockedNote}>Completed — cannot be modified.</Text>
                        )}

                        <View style={styles.dropdownWrapper}>
                            <TouchableOpacity
                                style={[styles.dropdownBtn, isLocked && { opacity: 0.4 }]}
                                disabled={isLocked}
                                onPress={() => setOpenDropdown(!openDropdown)}
                            >
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                    <Text style={styles.dropdownText}>{workStatus}</Text>
                                    <Image source={dropdownIcon} style={{ height: 18, width: 20, tintColor: '#295C59' }} />
                                </View>
                            </TouchableOpacity>
                            {openDropdown && (
                                <View style={styles.dropdownMenu}>
                                    {STATUS_OPTIONS.map(item => (
                                        <TouchableOpacity
                                            key={item}
                                            style={styles.dropdownItem}
                                            onPress={() => handleStatusChange(item)}
                                        >
                                            <Text style={styles.dropdownItemText}>{item}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}
                        </View>

                        <TouchableOpacity
                            style={[styles.submitBtn, isLocked && { opacity: 0.4 }]}
                            disabled={isLocked}
                            onPress={handleSubmit}
                        >
                            <Text style={styles.submitText}>Submit</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: '#f6f7fb' },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    loadingText: { marginTop: 12, fontSize: hp('2%'), color: '#555' },

    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: wp('4%'),
        paddingVertical: hp('1.2%'),
    },
    backBtn: { padding: 4 },
    backIcon: { width: hp('3.2%'), height: hp('3.2%'), tintColor: '#295C59' },
    headerTitle: { flex: 1, fontSize: hp('2.2%'), fontWeight: '600', color: '#295C59', marginLeft: wp('2%') },
    shareBtn: { padding: 4 },

    card: {
        backgroundColor: '#fff',
        marginHorizontal: wp('4%'),
        borderRadius: 16,
        paddingHorizontal: wp('5%'),
        paddingVertical: hp('2%'),
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.09,
        shadowRadius: 5,
    },

    heading: { fontSize: hp('2.4%'), fontWeight: '700', color: '#222' },
    phone: { fontSize: hp('1.6%'), color: '#295C59', fontWeight: '600', marginTop: hp('0.4%') },

    divider: { height: 1, backgroundColor: '#E8F4F3', marginVertical: hp('0.6%') },

    field: { marginBottom: hp('0.7%') },

    label: { fontSize: hp('1.8%'), fontWeight: '700', color: '#888', marginBottom: 3 },
    value: { fontSize: hp('2.1%'), fontWeight: '500', color: '#333' },

    statusLabel: { fontSize: hp('2.3%'), fontWeight: '700', color: '#111', marginBottom: hp('0.5%') },
    lockedNote: { fontSize: hp('1.7%'), color: '#22c55e', fontWeight: '500', marginBottom: hp('0.5%') },

    dropdownWrapper: { zIndex: 999, marginBottom: hp('1%') },
    dropdownBtn: {
        backgroundColor: '#fff',
        paddingVertical: hp('0.9%'),
        paddingHorizontal: wp('4%'),
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#295C59',
    },
    dropdownText: { fontWeight: '600', color: '#555', fontSize: hp('1.7%') },
    dropdownMenu: {
        backgroundColor: '#fff',
        marginTop: 4,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#e5e5e5',
        elevation: 6,
        position: 'absolute',
        width: '100%',
        top: hp('4.5%'),
        zIndex: 1000,
    },
    dropdownItem: {
        paddingVertical: hp('1.4%'),
        paddingHorizontal: wp('4%'),
        borderBottomWidth: 0.5,
        borderBottomColor: '#eee',
    },
    dropdownItemText: { fontWeight: '600', color: '#555', fontSize: hp('1.6%') },

    submitBtn: {
        backgroundColor: '#295C59',
        paddingVertical: hp('1.3%'),
        borderRadius: 8,
        alignItems: 'center',
        elevation: 3,
    },
    submitText: { fontSize: hp('1.8%'), fontWeight: '600', color: '#fff', letterSpacing: 0.4 },
});
