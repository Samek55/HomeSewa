import React, { useEffect, useRef, useState } from 'react';
import {
    View, Text, Image, TouchableOpacity, ScrollView,
    StyleSheet, ActivityIndicator, Alert, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import leftArrowIcon from '../../../assets/icons/admin/leftarrow.png';
import dropdownIcon from '../../../assets/icons/contact/DropDown.png';
import { fetchBookingsFromAirtable } from '../../../api/helper/fetchBookingDataAirtable';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import Header4 from '@/components/Header4Admin';
import { router, useLocalSearchParams } from 'expo-router';
import { updateBookingStatus } from '../../../api/helper/updateBookingStatus';
import { shareBookingPdf } from '../../../api/helper/shareBookingPdf';
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
    const scrollRef = useRef<ScrollView>(null);
    const [workStatus, setWorkStatus] = useState<StatusType>('Pending');
    const [isLocked, setIsLocked] = useState(false);
    const [isSuperAdmin, setIsSuperAdmin] = useState(false);

    const STATUS_OPTIONS: StatusType[] = ['Completed', 'Pending', 'Cancelled', 'Dispute'];

    useEffect(() => {
        const loadBooking = async () => {
            setLoading(true);
            try {
                const [data, adminTable] = await Promise.all([
                    fetchBookingsFromAirtable(),
                    AsyncStorage.getItem('adminTable'),
                ]);
                if (adminTable === 'admins') setIsSuperAdmin(true);
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
                router.push({ pathname: '/admin/WorkCompletionOTP', params: { customerName, customerPhone, budget: booking.budget || '' } });
                return;
            }
            await updateBookingStatus(booking.id, workStatus);
            router.replace({ pathname: '/admin/BookingHistory', params: { refresh: Date.now() } });
        } catch (error) {
            Alert.alert('Error', 'Failed to update status');
        }
    };

    const handleSharePDF = () => shareBookingPdf(booking);

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
                <ScrollView
                    ref={scrollRef}
                    style={styles.card}
                    contentContainerStyle={styles.cardContent}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
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
                        {isLocked && !isSuperAdmin && (
                            <Text style={styles.lockedNote}>Completed — cannot be modified.</Text>
                        )}

                        <View style={styles.dropdownWrapper}>
                            <TouchableOpacity
                                style={[styles.dropdownBtn, isLocked && !isSuperAdmin && { opacity: 0.4 }]}
                                disabled={isLocked && !isSuperAdmin}
                                onPress={() => {
                                    const next = !openDropdown;
                                    setOpenDropdown(next);
                                    if (next) {
                                        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
                                    }
                                }}
                            >
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                    <Text style={styles.dropdownText}>{workStatus}</Text>
                                    <Image source={dropdownIcon} style={{ height: 18, width: 20, tintColor: '#295C59' }} />
                                </View>
                            </TouchableOpacity>
                            {openDropdown && (
                                <View style={styles.dropdownMenu}>
                                    {STATUS_OPTIONS.filter(item => item !== workStatus).map(item => (
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
                            style={[styles.submitBtn, isLocked && !isSuperAdmin && { opacity: 0.4 }]}
                            disabled={isLocked && !isSuperAdmin}
                            onPress={handleSubmit}
                        >
                            <Text style={styles.submitText}>Submit</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
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
        flexGrow: 0,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.09,
        shadowRadius: 5,
    },
    cardContent: {
        paddingHorizontal: wp('5%'),
        paddingVertical: hp('2%'),
        paddingBottom: hp('3%'),
    },

    heading: { fontSize: hp('2.2%'), fontWeight: '700', color: '#222' },
    phone: { fontSize: hp('1.5%'), color: '#295C59', fontWeight: '600', marginTop: hp('0.4%') },

    divider: { height: 1, backgroundColor: '#E8F4F3', marginVertical: hp('1%') },

    field: { marginBottom: hp('1.1%') },

    label: { fontSize: hp('1.55%'), fontWeight: '700', color: '#888', marginBottom: 3 },
    value: { fontSize: hp('1.65%'), fontWeight: '500', color: '#333' },

    statusLabel: { fontSize: hp('2%'), fontWeight: '700', color: '#111', marginBottom: hp('0.5%') },
    lockedNote: { fontSize: hp('1.7%'), color: '#22c55e', fontWeight: '500', marginBottom: hp('0.5%') },

    dropdownWrapper: { marginBottom: hp('1%') },
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
