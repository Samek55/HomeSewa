import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    View, Text, Image, TouchableOpacity, ScrollView,
    StyleSheet, ActivityIndicator, Alert, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import leftArrowIcon from '../../../assets/icons/admin/leftarrow.png';
import dropdownIcon from '../../../assets/icons/contact/DropDown.png';
import { fetchBookings } from '../../../api/helper/fetchBookingData';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import Header4 from '@/components/Header4Admin';
import { router, useLocalSearchParams } from 'expo-router';
import { claimBooking } from '../../../api/helper/updateBookingStatus';
import { shareBookingPdf } from '../../../api/helper/shareBookingPdf';
import { pushAreaProfessionals } from '../../../api/notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '@/context/ThemeContext';
import type { ThemeColors } from '@/theme/colors';

const normalizePhone = (phone?: string | null) => (phone || '').replace(/\D/g, '').replace(/^977/, '');

type StatusType = 'Completed' | 'Pending' | 'Cancelled' | 'Dispute';

export default function BookingDetails() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);
    const [booking, setBooking] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [openDropdown, setOpenDropdown] = useState(false);
    const scrollRef = useRef<ScrollView>(null);
    const [workStatus, setWorkStatus] = useState<StatusType>('Pending');
    const [isLocked, setIsLocked] = useState(false);
    const [isSuperAdmin, setIsSuperAdmin] = useState(false);
    const [confirming, setConfirming] = useState(false);
    const [adminPhone, setAdminPhone] = useState<string | null>(null);

    const STATUS_OPTIONS: StatusType[] = ['Completed', 'Pending', 'Cancelled', 'Dispute'];

    useEffect(() => {
        const loadBooking = async () => {
            setLoading(true);
            try {
                const [data, adminTable, phone] = await Promise.all([
                    fetchBookings(),
                    AsyncStorage.getItem('adminTable'),
                    AsyncStorage.getItem('adminPhone'),
                ]);
                if (adminTable === 'admins') setIsSuperAdmin(true);
                setAdminPhone(phone);
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

    const isMine = !!adminPhone && !!booking?.acceptedByPhone && normalizePhone(adminPhone) === normalizePhone(booking.acceptedByPhone);

    const handleStatusChange = (newStatus: StatusType) => {
        setWorkStatus(newStatus);
        setOpenDropdown(false);
    };

    const handleSubmit = async () => {
        try {
            if (!booking?.id) return;
            if (workStatus === 'Completed') {
                const customerPhone = booking?.phone || '';
                const customerName = booking?.fullName || 'Customer';
                // WorkCompletionOTP sends its own OTP on mount (and can resend on failure) —
                // same pattern as every other OTP screen, so a failed send here can no longer
                // be silently swallowed with no recovery path for the professional.
                router.push({
                    pathname: '/admin/WorkCompletionOTP',
                    params: { customerName, customerPhone, budget: booking.budget || '', bookingId: String(booking.id) },
                });
                return;
            }
            const claimed = await claimBooking(String(booking.id), booking.status, workStatus);
            if (!claimed) {
                Alert.alert('Status Changed', 'This booking was already updated by someone else. Please reload and try again.');
                return;
            }
            router.replace({ pathname: '/admin/BookingHistory', params: { refresh: Date.now() } });
        } catch (error) {
            Alert.alert('Error', 'Failed to update status');
        }
    };

    const handleSharePDF = () => shareBookingPdf(booking);

    const isPendingConfirmation = (booking?.status || '').toLowerCase().trim() === 'pending confirmation';

    const handleConfirmBooking = async () => {
        if (!booking?.id) return;
        setConfirming(true);
        try {
            const claimed = await claimBooking(String(booking.id), 'Pending Confirmation', 'New / Open');
            if (!claimed) {
                Alert.alert('Already Confirmed', 'This booking was already confirmed.');
                router.replace({ pathname: '/admin/BookingHistory', params: { refresh: Date.now() } });
                return;
            }
            const targetService = String(booking.service || '').split(',')[0].trim();
            pushAreaProfessionals(targetService, booking.area || '', booking.fullName, booking.city, String(booking.id)).catch(() => {});
            router.replace({ pathname: '/admin/BookingHistory', params: { refresh: Date.now() } });
        } catch (error) {
            Alert.alert('Error', 'Failed to confirm booking');
        } finally {
            setConfirming(false);
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
                    {booking?.bookingId ? `Booking ID: B${booking.bookingId}` : 'Booking Details'}
                </Text>
                {isMine && (
                    <TouchableOpacity
                        onPress={() => router.push({ pathname: '/Chat' as any, params: { id: booking.id } })}
                        style={styles.shareBtn}
                    >
                        <Ionicons name="chatbubble-ellipses-outline" size={22} color={colors.brand} />
                    </TouchableOpacity>
                )}
                <TouchableOpacity onPress={handleSharePDF} style={styles.shareBtn} disabled={!booking}>
                    <Ionicons name="share-outline" size={22} color={colors.brand} />
                </TouchableOpacity>
            </View>

            {/* CONTENT */}
            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={colors.brand} />
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

                        {booking.completionPhotos?.length > 0 ? (
                            <View style={styles.field}>
                                <Text style={styles.label}>Completion Photos</Text>
                                <ScrollView
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    contentContainerStyle={styles.completionPhotosRow}
                                >
                                    {booking.completionPhotos.map((url: string, i: number) => (
                                        <Image key={url + i} source={{ uri: url }} style={styles.completionPhotoThumb} />
                                    ))}
                                </ScrollView>
                            </View>
                        ) : null}
                    </View>

                    {/* BOTTOM: status control — pinned to bottom */}
                    <View>
                        <View style={styles.divider} />

                        {isPendingConfirmation ? (
                            isSuperAdmin ? (
                                <>
                                    <Text style={styles.statusLabel}>Booking Confirmation</Text>
                                    <Text style={styles.pendingNote}>
                                        This booking hasn&apos;t been reviewed yet. Confirming it notifies nearby professionals.
                                    </Text>
                                    <TouchableOpacity
                                        style={[styles.submitBtn, confirming && { opacity: 0.6 }]}
                                        onPress={handleConfirmBooking}
                                        disabled={confirming}
                                    >
                                        {confirming
                                            ? <ActivityIndicator color="#fff" />
                                            : <Text style={styles.submitText}>Confirm & Notify Professionals</Text>
                                        }
                                    </TouchableOpacity>
                                </>
                            ) : (
                                <Text style={styles.pendingNote}>Awaiting confirmation from HomeSewa staff.</Text>
                            )
                        ) : (
                            <>
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
                                            <Image source={dropdownIcon} style={{ height: 18, width: 20, tintColor: colors.brand }} />
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
                            </>
                        )}
                    </View>
                </ScrollView>
            )}
        </View>
    );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    loadingText: { marginTop: 12, fontSize: hp('2%'), color: colors.textSecondary },

    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: wp('4%'),
        paddingVertical: hp('1.2%'),
    },
    backBtn: { padding: 4 },
    backIcon: { width: hp('3.2%'), height: hp('3.2%'), tintColor: colors.brand },
    headerTitle: { flex: 1, fontSize: hp('2.2%'), fontWeight: '600', color: colors.brand, marginLeft: wp('2%') },
    shareBtn: { padding: 4 },

    card: {
        backgroundColor: colors.surface,
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

    heading: { fontSize: hp('2.2%'), fontWeight: '700', color: colors.textPrimary, marginBottom: hp('0.6%') },
    phone: { fontSize: hp('1.5%'), color: colors.brand, fontWeight: '600', marginTop: hp('0.4%') },

    divider: { height: 1, backgroundColor: colors.divider, marginVertical: hp('1%') },

    field: { marginBottom: hp('1.1%') },

    label: { fontSize: hp('1.55%'), fontWeight: '700', color: colors.textMuted, marginBottom: 3 },
    value: { fontSize: hp('1.65%'), fontWeight: '500', color: colors.textPrimary },
    completionPhotosRow: { flexDirection: 'row', gap: 8, paddingTop: 4 },
    completionPhotoThumb: { width: wp('20%'), height: wp('20%'), borderRadius: 10, backgroundColor: colors.surfaceMuted },

    statusLabel: { fontSize: hp('2%'), fontWeight: '700', color: colors.textPrimary, marginBottom: hp('0.5%') },
    lockedNote: { fontSize: hp('1.7%'), color: colors.success, fontWeight: '500', marginBottom: hp('0.5%') },
    pendingNote: { fontSize: hp('1.7%'), color: colors.warning, fontWeight: '500', marginBottom: hp('1%') },

    dropdownWrapper: { marginBottom: hp('1%') },
    dropdownBtn: {
        backgroundColor: colors.surface,
        paddingVertical: hp('0.9%'),
        paddingHorizontal: wp('4%'),
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.brand,
    },
    dropdownText: { fontWeight: '600', color: colors.textSecondary, fontSize: hp('1.7%') },
    dropdownMenu: {
        backgroundColor: colors.surface,
        marginTop: 4,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: colors.border,
        elevation: 6,
    },
    dropdownItem: {
        paddingVertical: hp('1.4%'),
        paddingHorizontal: wp('4%'),
        borderBottomWidth: 0.5,
        borderBottomColor: colors.divider,
    },
    dropdownItemText: { fontWeight: '600', color: colors.textSecondary, fontSize: hp('1.6%') },

    submitBtn: {
        backgroundColor: colors.brand,
        paddingVertical: hp('1.3%'),
        borderRadius: 8,
        alignItems: 'center',
        elevation: 3,
    },
    submitText: { fontSize: hp('1.8%'), fontWeight: '600', color: '#fff', letterSpacing: 0.4 },
});
