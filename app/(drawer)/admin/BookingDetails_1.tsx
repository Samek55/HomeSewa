import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    View,
    Text,
    Image,
    TouchableOpacity,
    ScrollView,
    Platform,
    StyleSheet,
    Modal,
    Alert,
    Linking,
    TextInput,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { Ionicons } from '@expo/vector-icons';

import leftArrowIcon from '../../../assets/icons/admin/leftarrow.png';
import LocationPin from '../../../assets/icons/contact/location-pin.png';
import { fetchBookings } from '../../../api/helper/fetchBookingData';
import { shareBookingPdf } from '../../../api/helper/shareBookingPdf';
import { claimBooking } from '../../../api/helper/updateBookingStatus';
import { supabase } from '../../../lib/supabase';

import {
    widthPercentageToDP as wp,
    heightPercentageToDP as hp,
} from 'react-native-responsive-screen';
import Header4 from '@/components/Header4Admin';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { notifyUsers, notifyProfessionalsAccepted, notifyProfessionalsRejected } from '@/api/notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { isLeadUnlocked } from '@/api/leadUnlocks';
import { recordLeadRejection } from '@/api/leadRejections';
import { maskCustomerName } from '@/src/utils/maskName';
import { LEAD_FEE_NPR } from '@/src/constants/leadFee';
import { invokeEdgeFunction } from '@/api/functionsClient';
import { useTheme } from '@/context/ThemeContext';
import type { ThemeColors } from '@/theme/colors';

const sendAcceptanceSms = async (customerPhone: string, customerName: string, professionalName: string, professionalPhone: string) => {
    const text =
        `Dear ${customerName}, your booking request has been accepted by ${professionalName} ${professionalPhone}.\n\nThank You for using HomeSewa\n( www.homesewa.app )`;
    await invokeEdgeFunction('send-sms', { phone: customerPhone, text }, 'Could not send SMS');
};

const fetchProfessionalInfo = async (phone: string): Promise<{ name: string; gender: string | null }> => {
    try {
        const clean = phone.replace(/\D/g, '');
        const { data } = await supabase
            .from('workforce')
            .select('first_name, middle_name, last_name, gender')
            .or(`phone.eq.${clean},phone.eq.977${clean}`)
            .maybeSingle();
        const fullName = data ? [data.first_name, data.middle_name, data.last_name].filter(Boolean).join(' ') : '';
        return { name: fullName || 'HomeSewa Professional', gender: data?.gender || null };
    } catch {
        return { name: 'HomeSewa Professional', gender: null };
    }
};

export default function BookingDetails() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { colors, isDark } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);

    const [booking, setBooking] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [visible, setVisible] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);

    const [isSuperAdmin, setIsSuperAdmin] = useState(false);
    const [unlocked, setUnlocked] = useState(false);
    const hasFullAccess = isSuperAdmin || unlocked;

    const [dealModalVisible, setDealModalVisible] = useState(false);
    const [dealAmount, setDealAmount] = useState('');
    const [dealNote, setDealNote] = useState('');
    const [accepting, setAccepting] = useState(false);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const data = await fetchBookings();
                const found = data.find((item: any) => item.id === id);
                setBooking(found || null);
            } catch (error) {
                console.error("Error fetching booking details:", error);
            } finally {
                setLoading(false);
            }
        };

        load();
    }, [id]);

    // Re-checked on every focus so returning from the lead-payment screen unlocks contact immediately
    useFocusEffect(
        useCallback(() => {
            const checkAccess = async () => {
                const [table, phone] = await Promise.all([
                    AsyncStorage.getItem('adminTable'),
                    AsyncStorage.getItem('adminPhone'),
                ]);
                const superAdmin = table === 'admins';
                setIsSuperAdmin(superAdmin);
                if (!superAdmin && id && phone) {
                    setUnlocked(await isLeadUnlocked(id, phone));
                }
            };
            checkAccess();
        }, [id])
    );

    const photoUrls: string[] = booking?.photos || [];
    const completionPhotoUrls: string[] = booking?.completionPhotos || [];

    const [completionVisible, setCompletionVisible] = useState(false);
    const [completionSelectedIndex, setCompletionSelectedIndex] = useState(0);

    const openImage = (index: number) => {
        setSelectedIndex(index);
        setVisible(true);
    };

    const goPrev = () => setSelectedIndex(i => (i - 1 + photoUrls.length) % photoUrls.length);
    const goNext = () => setSelectedIndex(i => (i + 1) % photoUrls.length);

    const openCompletionImage = (index: number) => {
        setCompletionSelectedIndex(index);
        setCompletionVisible(true);
    };

    const goCompletionPrev = () => setCompletionSelectedIndex(i => (i - 1 + completionPhotoUrls.length) % completionPhotoUrls.length);
    const goCompletionNext = () => setCompletionSelectedIndex(i => (i + 1) % completionPhotoUrls.length);

    // Opens the deal-amount prompt; the actual accept only fires once that's confirmed.
    const openAcceptModal = () => {
        if (!booking || !hasFullAccess || accepting) return;
        setDealAmount('');
        setDealNote('');
        setDealModalVisible(true);
    };

    // Ignored while `accepting` is true — the modal is the only thing stopping a second
    // tap on "Accept This Offer" from firing a duplicate accept while the first is still
    // in flight, so it can't be dismissed (overlay tap, X button, or hardware back) mid-request.
    const closeAcceptModal = () => {
        if (accepting) return;
        setDealModalVisible(false);
    };

    // Handle Offer Acceptance
    const handleAcceptOffer = async (amount: number, note: string) => {
        if (!booking || !hasFullAccess) return;

        try {
            const adminPhone = await AsyncStorage.getItem('adminPhone') || '';

            // Atomically claim the booking first — without this, two professionals who both
            // open this "New / Open" booking before either changes its status can both accept it.
            // `accepted_by_phone` is recorded here so customer-facing features keyed by phone
            // (Favorites, ratings) can later look up who actually did the work. `deal_amount`/
            // `deal_note` capture the actual negotiated price at accept time — internal only,
            // separate from the customer's original `budget` range.
            const claimed = await claimBooking(String(booking.id), 'New / Open', 'Pending', {
                accepted_by_phone: adminPhone,
                deal_amount: amount,
                deal_note: note || null,
            });
            if (!claimed) {
                Alert.alert('Already Accepted', 'This booking was just accepted by another professional.');
                router.replace('/admin/BookingHistory');
                return;
            }

            const customerPhone = booking?.phone || "";
            const customerName = booking?.fullName || "Customer";

            console.log("Passing customer phone directly to notification:", customerPhone);

            const { name: professionalName, gender: professionalGender } = await fetchProfessionalInfo(adminPhone);

            await notifyUsers(booking?.service, customerPhone, customerName, adminPhone, professionalName, professionalGender, String(booking.id));

            const bookingService = String(booking?.service || '').split(',')[0].trim();
            notifyProfessionalsAccepted(bookingService, booking?.city || '', booking?.area || '', adminPhone, professionalName).catch(() => {});

            // Send acceptance SMS to customer
            try {
                await sendAcceptanceSms(customerPhone, customerName, professionalName, adminPhone);
            } catch (smsErr) {
                console.error('[Sparrow Accept SMS] failed:', smsErr);
            }

            router.push({
                pathname: '/admin/BookingDetails_2',
                params: { id: booking?.id?.toString() },
            });
        } catch (error) {
            console.error("Failed to process order acceptance:", error);
            Alert.alert('Error', 'Could not accept this booking. Please try again.');
        }
    };

    const handleConfirmDeal = async () => {
        const amount = Number(dealAmount);
        if (!dealAmount.trim() || !Number.isFinite(amount) || amount <= 0) {
            Alert.alert('Enter Deal Amount', 'Please enter the agreed price as a valid positive number.');
            return;
        }
        setAccepting(true);
        try {
            // Modal stays open (Confirm disabled, showing "Accepting…") for the whole
            // request — closing it early would let the user tap "Accept This Offer"
            // again while claimBooking/notifications/SMS are still in flight.
            await handleAcceptOffer(amount, dealNote.trim());
            setDealModalVisible(false);
        } finally {
            setAccepting(false);
        }
    };

    const handleSharePDF = () => shareBookingPdf(booking);

    // Passing on a lead only affects this professional's own view — the booking stays
    // "New / Open" and fully available for every other professional to accept.
    const handleReject = () => {
        if (!booking) return;

        Alert.alert(
            'Pass on this job?',
            'It will no longer appear in your list, but stays open for other professionals to accept.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Yes, Pass',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const adminPhone = await AsyncStorage.getItem('adminPhone') || '';
                            await recordLeadRejection(String(booking.id), adminPhone);

                            const bookingService = String(booking?.service || '').split(',')[0].trim();
                            notifyProfessionalsRejected(bookingService, booking?.city || '', adminPhone, String(booking.id), booking?.fullName || '', booking?.area || '').catch(() => {});

                            router.push('/admin/BookingHistory');
                        } catch (error) {
                            console.error('Failed to record lead rejection:', error);
                            Alert.alert('Error', 'Could not pass on this job. Please try again.');
                        }
                    },
                },
            ]
        );
    };

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <Header4 />

            <KeyboardAvoidingView
                style={styles.container}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
            >
                <ScrollView contentContainerStyle={styles.scrollContent}>

                    {/* HEADER */}
                    <View style={styles.headerRow}>
                        <TouchableOpacity onPress={() => router.back()} style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                            <Image source={leftArrowIcon} style={styles.backIcon} />
                            <Text style={styles.title}>
                                {booking?.bookingId ? `Booking ID: B${booking.bookingId}` : 'Booking Details'}
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={handleSharePDF} disabled={!booking} style={{ padding: 4 }}>
                            <Ionicons name="share-outline" size={22} color={colors.brand} />
                        </TouchableOpacity>
                    </View>

                    {/* BIG CARD */}
                    {loading ? (
                        <Text style={styles.loadingText}>Loading details...</Text>
                    ) : booking ? (
                        <View style={styles.card}>
                            <Text style={styles.heading}>
                                {hasFullAccess ? booking?.fullName : maskCustomerName(booking?.fullName)}
                            </Text>
                            {hasFullAccess && !!booking?.phone && (
                                <TouchableOpacity onPress={() => Linking.openURL(`tel:+977${booking.phone}`)}>
                                    <Text style={styles.phoneLink}>📞 +977 {booking.phone}</Text>
                                </TouchableOpacity>
                            )}

                            <View style={styles.rowflex}>
                                <Text style={styles.labelFlex}>Service(s)</Text>
                                <Text style={styles.valueFlex}>{booking?.service}</Text>
                            </View>

                            <View style={styles.rowflex}>
                                <Text style={styles.labelFlex}>Budget</Text>
                                <Text style={[styles.valueFlex, { paddingLeft: hp('4%') }]}>{booking?.budget}</Text>
                            </View>

                            <View style={styles.rowLocation}>
                                <View style={styles.rowLocationInside}>
                                    <Text style={styles.labelFlex}>Location</Text>
                                    <Text style={[styles.value, { paddingLeft: hp('3%'), flex: 1 }]}>
                                        {[booking?.area, booking?.city].filter(Boolean).join(', ')}
                                    </Text>
                                </View>
                                <View>
                                    <Image
                                        source={LocationPin}
                                        style={{ height: 20, width: 20, tintColor: isDark ? '#fff' : undefined }}
                                    />
                                </View>
                            </View>

                            <View style={styles.row}>
                                <Text style={styles.label}>Booking Date</Text>
                                <Text style={styles.value}>{booking?.bookingDate}</Text>
                            </View>

                            <View style={styles.row}>
                                <Text style={styles.label}>Service Starting Date</Text>
                                <Text style={styles.value}>{booking?.startingDate}</Text>
                            </View>

                            <View style={styles.row}>
                                <Text style={styles.label}>Service Ending Date</Text>
                                <Text style={styles.value}>{booking?.completionDate}</Text>
                            </View>

                            <View style={styles.rowflex}>
                                <Text style={styles.labelFlex}>Approx Days to complete</Text>
                                <Text style={styles.valueFlex}>
                                    {booking?.approxDays != null ? `${booking.approxDays} Day${booking.approxDays !== 1 ? 's' : ''}` : 'N/A'}
                                </Text>
                            </View>

                            <View style={styles.row}>
                                <Text style={styles.label}>Special Request</Text>
                                <Text style={[styles.value, { paddingTop: hp('1%') }]}>
                                    {booking?.specialRequests || 'None'}
                                </Text>
                            </View>

                            {photoUrls.length > 0 && (
                            <View style={styles.row}>
                                <Text style={styles.label}>Photos</Text>
                                <View style={styles.photos}>
                                    {photoUrls.map((url, index) => (
                                        <TouchableOpacity
                                            key={index}
                                            onPress={() => openImage(index)}
                                        >
                                            <Image source={{ uri: url }} style={styles.photoItem} />
                                        </TouchableOpacity>
                                    ))}
                                </View>

                                {/* Fullscreen Popup with navigation */}
                                <Modal
                                    visible={visible}
                                    transparent
                                    animationType="fade"
                                    onRequestClose={() => setVisible(false)}
                                >
                                    <View style={styles.modalContainer}>
                                        {/* Close on background tap */}
                                        <TouchableOpacity
                                            style={StyleSheet.absoluteFill}
                                            activeOpacity={1}
                                            onPress={() => setVisible(false)}
                                        />

                                        {/* Close button */}
                                        <TouchableOpacity
                                            style={styles.closeButton}
                                            onPress={() => setVisible(false)}
                                        >
                                            <Text style={styles.closeButtonText}>✕</Text>
                                        </TouchableOpacity>

                                        <Image
                                            source={{ uri: photoUrls[selectedIndex] }}
                                            style={styles.fullImage}
                                            resizeMode="contain"
                                        />

                                        {/* Counter */}
                                        <Text style={styles.photoCounter}>
                                            {selectedIndex + 1} / {photoUrls.length}
                                        </Text>

                                        {/* Prev / Next arrows */}
                                        <TouchableOpacity style={styles.arrowLeft} onPress={goPrev}>
                                            <Text style={styles.arrowText}>‹</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity style={styles.arrowRight} onPress={goNext}>
                                            <Text style={styles.arrowText}>›</Text>
                                        </TouchableOpacity>
                                    </View>
                                </Modal>
                            </View>
                            )}

                            {completionPhotoUrls.length > 0 && (
                            <View style={styles.row}>
                                <Text style={styles.label}>Completion Photos</Text>
                                <View style={styles.photos}>
                                    {completionPhotoUrls.map((url, index) => (
                                        <TouchableOpacity
                                            key={index}
                                            onPress={() => openCompletionImage(index)}
                                        >
                                            <Image source={{ uri: url }} style={styles.photoItem} />
                                        </TouchableOpacity>
                                    ))}
                                </View>

                                {/* Fullscreen Popup with navigation */}
                                <Modal
                                    visible={completionVisible}
                                    transparent
                                    animationType="fade"
                                    onRequestClose={() => setCompletionVisible(false)}
                                >
                                    <View style={styles.modalContainer}>
                                        {/* Close on background tap */}
                                        <TouchableOpacity
                                            style={StyleSheet.absoluteFill}
                                            activeOpacity={1}
                                            onPress={() => setCompletionVisible(false)}
                                        />

                                        {/* Close button */}
                                        <TouchableOpacity
                                            style={styles.closeButton}
                                            onPress={() => setCompletionVisible(false)}
                                        >
                                            <Text style={styles.closeButtonText}>✕</Text>
                                        </TouchableOpacity>

                                        <Image
                                            source={{ uri: completionPhotoUrls[completionSelectedIndex] }}
                                            style={styles.fullImage}
                                            resizeMode="contain"
                                        />

                                        {/* Counter */}
                                        <Text style={styles.photoCounter}>
                                            {completionSelectedIndex + 1} / {completionPhotoUrls.length}
                                        </Text>

                                        {/* Prev / Next arrows */}
                                        <TouchableOpacity style={styles.arrowLeft} onPress={goCompletionPrev}>
                                            <Text style={styles.arrowText}>‹</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity style={styles.arrowRight} onPress={goCompletionNext}>
                                            <Text style={styles.arrowText}>›</Text>
                                        </TouchableOpacity>
                                    </View>
                                </Modal>
                            </View>
                            )}

                            {/* ButtonContainer */}
                            <View style={styles.ButtonContainer}>
                                {hasFullAccess ? (
                                    <>
                                        <TouchableOpacity
                                            style={styles.AcceptButton}
                                            onPress={openAcceptModal}
                                        >
                                            <Text style={styles.AcceptText}>Accept This Offer</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={styles.RejectButton}
                                            onPress={handleReject}
                                        >
                                            <Text style={styles.AcceptText}>Reject</Text>
                                        </TouchableOpacity>
                                    </>
                                ) : (
                                    <TouchableOpacity
                                        style={styles.AcceptButton}
                                        onPress={() => router.push({
                                            pathname: '/admin/LeadPayment',
                                            params: { bookingId: booking?.id?.toString() },
                                        })}
                                    >
                                        <Text style={styles.AcceptText}>Pay NPR {LEAD_FEE_NPR} to View Contact</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>
                    ) : (
                        <Text style={styles.loadingText}>No details found for this booking.</Text>
                    )}
                </ScrollView>
            </KeyboardAvoidingView>

            <Modal
                visible={dealModalVisible}
                transparent
                animationType="slide"
                onRequestClose={closeAcceptModal}
            >
                <TouchableOpacity
                    style={styles.dealModalOverlay}
                    activeOpacity={1}
                    onPress={closeAcceptModal}
                >
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                        style={{ width: '100%' }}
                    >
                        <TouchableOpacity activeOpacity={1} onPress={() => {}}>
                            <View style={styles.dealModalSheet}>
                                <View style={styles.dealModalHeader}>
                                    <Text style={styles.dealModalTitle}>Confirm Deal Terms</Text>
                                    <TouchableOpacity onPress={closeAcceptModal} disabled={accepting}>
                                        <Ionicons name="close" size={22} color={accepting ? colors.textMuted : colors.textPrimary} />
                                    </TouchableOpacity>
                                </View>

                                <Text style={styles.dealModalLabel}>Deal Amount (NPR)</Text>
                                <TextInput
                                    style={styles.dealModalInput}
                                    placeholder="e.g. 15000"
                                    placeholderTextColor={colors.textMuted}
                                    keyboardType="numeric"
                                    value={dealAmount}
                                    onChangeText={setDealAmount}
                                    autoFocus
                                />

                                <Text style={styles.dealModalLabel}>Note (optional)</Text>
                                <TextInput
                                    style={[styles.dealModalInput, styles.dealModalNoteInput]}
                                    placeholder="Any details about the agreed deal…"
                                    placeholderTextColor={colors.textMuted}
                                    multiline
                                    value={dealNote}
                                    onChangeText={setDealNote}
                                />

                                <TouchableOpacity
                                    style={[styles.AcceptButton, accepting && { opacity: 0.6 }]}
                                    onPress={handleConfirmDeal}
                                    disabled={accepting}
                                >
                                    <Text style={styles.AcceptText}>{accepting ? 'Accepting…' : 'Confirm & Accept'}</Text>
                                </TouchableOpacity>
                            </View>
                        </TouchableOpacity>
                    </KeyboardAvoidingView>
                </TouchableOpacity>
            </Modal>
        </View>
    );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    scrollContent: {
        flexGrow: 1,
        alignItems: 'center',
        paddingBottom: hp('5%'),
        paddingTop: hp('8%'),
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'stretch',
        marginTop: hp('1%'),
        marginLeft: wp('3%'),
        marginRight: wp('3%'),
        position: 'absolute',
        top: hp('-1%'),
        left: hp('-1%'),
        right: 0,
        zIndex: 999,
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        marginTop: hp('1%'),
        marginLeft: wp('3%'),
        position: 'absolute',
        top: hp('-1%'),
        left: hp('-1%'),
        zIndex: 999,
    },
    backIcon: {
        width: hp('3.5%'),
        height: hp('3.5%'),
        tintColor: colors.brand,
        marginRight: wp('2%'),
    },
    title: {
        fontSize: hp('2.3%'),
        fontWeight: '600',
        color: colors.brand,
    },
    card: {
        width: wp('90%'),
        backgroundColor: colors.surface,
        borderRadius: 18,
        paddingVertical: hp('2%'),
        paddingHorizontal: wp('5%'),
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
    },
    heading: {
        fontSize: hp('2.8%'),
        fontWeight: '700',
        color: colors.textPrimary,
        marginBottom: hp('0.6%'),
    },
    phoneLink: {
        fontSize: hp('1.8%'),
        fontWeight: '600',
        color: colors.brand,
        marginBottom: hp('1%'),
    },
    bookingId: {
        fontSize: hp('1.2%'),
        marginBottom: hp('1%'),
        color: colors.textSecondary,
    },
    row: {
        marginBottom: hp('1%'),
        paddingBottom: hp('0.5%'),
    },
    rowflex: {
        marginBottom: hp('1%'),
        flexDirection: 'row',
    },
    rowLocationInside: {
        flexDirection: 'row',
        flex: 1,
    },
    rowLocation: {
        marginBottom: hp('1%'),
        paddingBottom: hp('0.5%'),
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    label: {
        fontSize: hp('1.8%'),
        fontWeight: '700',
        color: colors.textPrimary,
        marginBottom: hp('1%'),
    },
    labelFlex: {
        fontSize: hp('1.8%'),
        fontWeight: '700',
        color: colors.textPrimary,
    },
    value: {
        fontSize: hp('1.8%'),
        fontWeight: '500',
        color: colors.textSecondary,
        lineHeight: hp('2.3%'),
    },
    valueFlex: {
        fontSize: hp('1.8%'),
        fontWeight: '500',
        color: colors.textSecondary,
        lineHeight: hp('2.3%'),
        textAlignVertical: 'center',
        flex: 1,
        flexWrap: 'wrap',
        paddingLeft: hp('1.5%'),
    },
    ButtonContainer: {
        marginTop: hp('1%'),
        marginBottom: hp('2%'),
        flexDirection: 'row',
        alignItems: 'center',
        gap: wp('3%'),
        width: '100%',
    },
    AcceptButton: {
        paddingVertical: hp('1.5%'),
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.brand,
        borderWidth: 1,
        borderColor: 'rgba(0, 0, 0,0.1)',
        elevation: 3,
        flex: 1.6,
    },
    AcceptText: {
        fontSize: hp('1.6%'),
        fontWeight: '500',
        color: '#fff',
        letterSpacing: 0.5,
    },
    RejectButton: {
        paddingVertical: hp('1.5%'),
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.danger,
        borderWidth: 1,
        borderColor: 'rgba(0, 0, 0,0.1)',
        flex: 1,
        elevation: 3,
    },

    photos: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'flex-start',
        gap: wp('2%'),
    },
    photoItem: {
        height: 40,
        width: 50,
        marginVertical: hp('1%'),
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 10,
    },
    modalContainer: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.9)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeButton: {
        position: 'absolute',
        top: hp('5%'),
        right: wp('5%'),
        backgroundColor: 'rgba(0,0,0,0.45)',
        borderRadius: 20,
        width: 36,
        height: 36,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },
    closeButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
    },
    fullImage: {
        width: '90%',
        height: '70%',
    },
    photoCounter: {
        position: 'absolute',
        bottom: hp('12%'),
        color: '#fff',
        fontSize: hp('2%'),
        fontWeight: '600',
        backgroundColor: 'rgba(0,0,0,0.4)',
        paddingHorizontal: wp('3%'),
        paddingVertical: hp('0.5%'),
        borderRadius: 20,
    },
    arrowLeft: {
        position: 'absolute',
        left: wp('4%'),
        top: '50%',
        backgroundColor: 'rgba(0,0,0,0.45)',
        borderRadius: 30,
        width: 48,
        height: 48,
        justifyContent: 'center',
        alignItems: 'center',
    },
    arrowRight: {
        position: 'absolute',
        right: wp('4%'),
        top: '50%',
        backgroundColor: 'rgba(0,0,0,0.45)',
        borderRadius: 30,
        width: 48,
        height: 48,
        justifyContent: 'center',
        alignItems: 'center',
    },
    arrowText: {
        color: '#fff',
        fontSize: 32,
        lineHeight: 36,
        fontWeight: '300',
    },
    loadingText: {
        fontSize: hp('2%'),
        color: colors.textSecondary,
        marginTop: hp('10%'),
        textAlign: 'center',
    },
    dealModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'flex-end',
    },
    dealModalSheet: {
        backgroundColor: colors.surface,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingTop: 8,
        paddingBottom: hp('4%'),
        paddingHorizontal: wp('5%'),
    },
    dealModalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: hp('1.8%'),
        borderBottomWidth: 1,
        borderBottomColor: colors.divider,
        marginBottom: hp('1.5%'),
    },
    dealModalTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: colors.textPrimary,
    },
    dealModalLabel: {
        fontSize: hp('1.6%'),
        fontWeight: '700',
        color: colors.textPrimary,
        marginBottom: hp('0.8%'),
    },
    dealModalInput: {
        backgroundColor: colors.background,
        borderRadius: 12,
        paddingHorizontal: wp('4%'),
        paddingVertical: hp('1.4%'),
        fontSize: 14,
        color: colors.textPrimary,
        marginBottom: hp('1.6%'),
    },
    dealModalNoteInput: {
        minHeight: hp('9%'),
        textAlignVertical: 'top',
    },
});