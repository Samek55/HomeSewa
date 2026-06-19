import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    Image,
    TouchableOpacity,
    KeyboardAvoidingView,
    ScrollView,
    Platform,
    StyleSheet,
    Modal,
    Alert,
} from 'react-native';

import leftArrowIcon from '../../../assets/icons/admin/leftarrow.png';
import LocationPin from '../../../assets/icons/contact/location-pin.png';
import { fetchBookingsFromAirtable } from '../../../api/helper/fetchBookingDataAirtable';
import { supabase } from '../../../lib/supabase';

import {
    widthPercentageToDP as wp,
    heightPercentageToDP as hp,
} from 'react-native-responsive-screen';
import Header4 from '@/components/Header4Admin';
import { router, useLocalSearchParams } from 'expo-router';
import { notifyUsers, notifyProfessionalsAccepted } from '@/api/notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SPARROW_TOKEN = process.env.EXPO_PUBLIC_SPARROW_TOKEN!;
const WORKFORCE_URL = process.env.EXPO_PUBLIC_AIRTABLE_API_URL_CAREER!;
const AIRTABLE_TOKEN = process.env.EXPO_PUBLIC_AIRTABLE_TOKEN!;

const sendAcceptanceSms = async (customerPhone: string, customerName: string, professionalName: string, professionalPhone: string) => {
    const to = '977' + customerPhone.replace(/\D/g, '').slice(-10);
    const text =
        `Dear ${customerName}, your booking request has been accepted by ${professionalName} ${professionalPhone}.\n\nThank You for using HomeSewa\n( www.homesewa.app )`;
    const response = await fetch('https://api.sparrowsms.com/v2/sms/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: SPARROW_TOKEN, from: 'TheAlert', to, text }),
    });
    const data = await response.json().catch(() => ({}));
    console.log('[Sparrow Accept SMS] status:', response.status, 'body:', JSON.stringify(data));
};

const fetchProfessionalName = async (phone: string): Promise<string> => {
    try {
        const clean = phone.replace(/\D/g, '');
        const { data } = await supabase
            .from('workforce')
            .select('full_name')
            .eq('phone', clean)
            .single();
        return data?.full_name || 'HomeSewa Professional';
    } catch {
        return 'HomeSewa Professional';
    }
};

export default function BookingDetails() {
    const { id } = useLocalSearchParams<{ id: string }>();

    const [booking, setBooking] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [visible, setVisible] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const data = await fetchBookingsFromAirtable();
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

    const photoUrls: string[] = booking?.photos || [];

    const openImage = (index: number) => {
        setSelectedIndex(index);
        setVisible(true);
    };

    const goPrev = () => setSelectedIndex(i => (i - 1 + photoUrls.length) % photoUrls.length);
    const goNext = () => setSelectedIndex(i => (i + 1) % photoUrls.length);
    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const data = await fetchBookingsFromAirtable();
                const found = data.find((item: any) => item.id === id);

                // 👇 ADD THIS LINE TO SEE ALL AVAILABLE KEYS
                console.log("👉 CURRENT BOOKING OBJECT DATA:", found);

                setBooking(found || null);
            } catch (error) {
                console.error("Error fetching booking details:", error);
            } finally {
                setLoading(false);
            }
        };

        load();
    }, [id]);

    // Handle Offer Acceptance
    const handleAcceptOffer = async () => {
        if (!booking) return;

        try {
            const customerPhone = booking?.phone || "";
            const customerName = booking?.fullName || "Customer";

            console.log("Passing customer phone directly to notification:", customerPhone);

            await notifyUsers(booking?.service, booking?.area, customerPhone);

            const bookingService = String(booking?.service || '').split(',')[0].trim();
            const adminPhone = await AsyncStorage.getItem('adminPhone') || '';
            notifyProfessionalsAccepted(bookingService, booking?.city || '', booking?.area || '', adminPhone).catch(() => {});

            // Send acceptance SMS to customer
            try {
                const professionalName = await fetchProfessionalName(adminPhone);
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

            router.push({
                pathname: '/admin/BookingDetails_2',
                params: { id: booking?.id?.toString() },
            });
        }
    };

    return (
        <View style={{ flex: 1 }}>
            <Header4 />

            <KeyboardAvoidingView
                style={styles.container}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
            >
                <ScrollView contentContainerStyle={styles.scrollContent}>

                    {/* HEADER */}
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => router.back()}
                    >
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Image source={leftArrowIcon} style={styles.backIcon} />
                            <Text style={styles.title}>
                                {booking?.bookingId ? `Booking ID: ${booking.bookingId}` : 'Booking Details'}
                            </Text>
                        </View>
                    </TouchableOpacity>

                    {/* BIG CARD */}
                    {loading ? (
                        <Text style={styles.loadingText}>Loading details...</Text>
                    ) : booking ? (
                        <View style={styles.card}>
                            <Text style={styles.heading}>{booking?.fullName}</Text>

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
                                    <Image source={LocationPin} style={{ height: 20, width: 20 }} />
                                </View>
                            </View>

                            <View style={styles.row}>
                                <Text style={styles.label}>Booking Date & Time</Text>
                                <Text style={styles.value}>{booking?.bookingDate}</Text>
                            </View>

                            <View style={styles.row}>
                                <Text style={styles.label}>Service Starting Date & Time</Text>
                                <Text style={styles.value}>{booking?.startingDate}</Text>
                            </View>

                            <View style={styles.row}>
                                <Text style={styles.label}>Service Ending Date & Time</Text>
                                <Text style={styles.value}>{booking?.completionDate}</Text>
                            </View>

                            <View style={styles.rowflex}>
                                <Text style={styles.labelFlex}>Approx Days to complete</Text>
                                <Text style={styles.valueFlex}>10 Days</Text>
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

                            {/* ButtonContainer */}
                            <View style={styles.ButtonContainer}>
                                <TouchableOpacity
                                    style={styles.AcceptButton}
                                    onPress={handleAcceptOffer}
                                >
                                    <Text style={styles.AcceptText}>Accept This Offer</Text>
                                </TouchableOpacity>
                                 <TouchableOpacity
                                    style={styles.RejectButton}
                                    onPress={()=> router.push('/admin/BookingHistory')}
                                >
                                    <Text style={styles.AcceptText}>Cancel</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ) : (
                        <Text style={styles.loadingText}>No details found for this booking.</Text>
                    )}
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f6f7fb',
    },
    scrollContent: {
        flexGrow: 1,
        alignItems: 'center',
        paddingBottom: hp('5%'),
        paddingTop: hp('8%'),
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
        tintColor: '#295C59',
        marginRight: wp('2%'),
    },
    title: {
        fontSize: hp('2.3%'),
        fontWeight: '600',
        color: '#295C59',
    },
    card: {
        width: wp('90%'),
        backgroundColor: '#fff',
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
        color: '#222',
    },
    bookingId: {
        fontSize: hp('1.2%'),
        marginBottom: hp('1%'),
        color: '#666',
    },
    row: {
        marginBottom: hp('1.8%'),
        paddingBottom: hp('1%'),
    },
    rowflex: {
        marginBottom: hp('1.8%'),
        flexDirection: 'row',
    },
    rowLocationInside: {
        flexDirection: 'row',
        flex: 1,
    },
    rowLocation: {
        marginBottom: hp('1.8%'),
        paddingBottom: hp('1%'),
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    label: {
        fontSize: hp('1.8%'),
        fontWeight: '700',
        color: '#111',
        marginBottom: hp('1%'),
    },
    labelFlex: {
        fontSize: hp('1.8%'),
        fontWeight: '700',
        color: '#111',
    },
    value: {
        fontSize: hp('1.8%'),
        fontWeight: '500',
        color: '#555',
        lineHeight: hp('2.3%'),
    },
    valueFlex: {
        fontSize: hp('1.8%'),
        fontWeight: '500',
        color: '#555',
        lineHeight: hp('2.3%'),
        textAlignVertical: 'center',
        flex: 1,
        flexWrap: 'wrap',
        paddingLeft: hp('1.5%'),
    },
    ButtonContainer: {
        marginTop: hp('1%'),
        marginBottom: hp('2%'),
        flexDirection: 'column',
        alignItems: 'center',
        width: '100%',
    },
    AcceptButton: {
        paddingVertical: hp('1.5%'),
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#295C59',
        borderWidth: 1,
        borderColor: 'rgba(0, 0, 0,0.1)',
        elevation: 3,
        width: '100%',
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
        backgroundColor: 'red',
        borderWidth: 1,
        borderColor: 'rgba(0, 0, 0,0.1)',
        elevation: 3,
        width: '100%',
        marginTop:hp('2%')
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
        borderColor: '#d3d3d3',
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
        color: '#555',
        marginTop: hp('10%'),
        textAlign: 'center',
    },
});