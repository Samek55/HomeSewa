import React, { useEffect, useRef, useState } from 'react';
import {
    View,
    Text,
    Image,
    TouchableOpacity,
    KeyboardAvoidingView,
    ScrollView,
    Platform,
    StyleSheet,
    ActivityIndicator,
} from 'react-native';

import leftArrowIcon from '../../../assets/icons/admin/leftarrow.png';
import dropdownIcon from '../../../assets/icons/contact/DropDown.png';
import LocationPin from '../../../assets/icons/contact/location-pin.png';
import phoneIcon from '../../../assets/icons/admin/phone.png';
import { fetchBookingsFromAirtable } from '../../../api/helper/fetchBookingDataAirtable';

import {
    widthPercentageToDP as wp,
    heightPercentageToDP as hp,
} from 'react-native-responsive-screen';
import Header4 from '@/components/Header4Admin';
import { router, useLocalSearchParams } from 'expo-router';
import { updateBookingStatus } from '../../../api/helper/updateBookingStatus';

type StatusType = 'Completed' | 'Pending' | 'Cancelled';

export default function BookingDetails() {
    const scrollRef = useRef<any>(null);
    const { id } = useLocalSearchParams<{ id: string }>();

    const [booking, setBooking] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [openDropdown, setOpenDropdown] = useState(false);
    const [workStatus, setWorkStatus] = useState<StatusType>('Pending');

    const STATUS_OPTIONS: StatusType[] = ['Completed', 'Pending', 'Cancelled'];

    // This fires ONLY ONCE when the component mounts
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

            await updateBookingStatus(booking.id, workStatus);

            router.replace({
                pathname: '/admin/BookingHistory',
                params: {
                    refresh: Date.now(),
                },
            });
        } catch (error) {
            console.error('Failed to update status:', error);
            alert('Failed to update status');
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
                <ScrollView
                    ref={scrollRef}
                    contentContainerStyle={styles.scrollContent}
                >
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

                    {/* BIG CARD / LOADING HANDLING */}
                    {loading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color="green" />
                            <Text style={styles.loadingText}>Loading Details...</Text>
                        </View>
                    ) : booking ? (
                        <View style={[styles.card, { marginBottom: hp('10%') }]}>
                            <Text style={styles.heading}>{booking?.fullName}</Text>

                            <Text style={styles.labelMain}>
                                <Image
                                    source={phoneIcon}
                                    style={{ width: 14, height: 11.5, tintColor: '#555' }}
                                />{' '}
                                +977 {booking?.phone}
                            </Text>

                            <View style={styles.row}>
                                <Text style={styles.label}>Service(s)</Text>
                                <Text style={styles.value}>{booking?.service}</Text>
                            </View>

                            <View style={styles.rowLocation}>
                                <View>
                                    <Text style={styles.label}>Budget</Text>
                                    <Text style={styles.value}>{booking?.budget}</Text>
                                </View>
                                <View style={{ alignItems: 'flex-end' }}>
                                    <Text style={styles.label}>Status</Text>
                                    <Text
                                        style={[
                                            styles.value,
                                            booking?.status?.includes('Completed') && styles.completed,
                                            booking?.status?.includes('Pending') && styles.pending,
                                            booking?.status?.includes('Cancelled') && styles.cancelled,
                                        ]}
                                    >
                                        {booking?.status}
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.rowLocation}>
                                <View style={styles.rowLocationInside}>
                                    <Text style={styles.label}>Location</Text>
                                    <Text style={styles.value}>
                                        {booking?.area}, {booking?.city}
                                    </Text>
                                </View>
                                <View>
                                    <Image source={LocationPin} style={{ height: 30, width: 30 }} />
                                </View>
                            </View>

                            <View style={styles.row}>
                                <Text style={styles.label}>Booking Date & Time</Text>
                                <Text style={styles.value}>{booking?.bookingDate}</Text>
                            </View>

                            <View style={styles.row}>
                                <Text style={styles.label}>Service Date & Time</Text>
                                <Text style={styles.value}>{booking?.startingDate}</Text>
                            </View>

                            <View style={styles.row}>
                                <Text style={styles.label}>Special Request</Text>
                                <Text style={styles.value}>{booking?.specialRequests || 'None'}</Text>
                            </View>

                            <Text style={styles.statusLabel}>Work Status</Text>

                            {/* STATUS DROPDOWN */}
                            <View style={styles.dropdownWrapper}>
                                <TouchableOpacity
                                    style={styles.dropdownBtn}
                                    onPress={() => {
                                        setOpenDropdown(!openDropdown);
                                        setTimeout(() => {
                                            scrollRef.current?.scrollToEnd({ animated: true });
                                        }, 100);
                                    }}
                                >
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                        <Text style={styles.dropdownTextContainer}>{workStatus}</Text>
                                        <Image
                                            source={dropdownIcon}
                                            style={{ height: 20, width: 23, tintColor: 'green' }}
                                        />
                                    </View>
                                </TouchableOpacity>

                                {openDropdown && (
                                    <View style={styles.dropdownMenu}>
                                        {STATUS_OPTIONS.map((item) => (
                                            <TouchableOpacity
                                                key={item}
                                                style={styles.dropdownItem}
                                                onPress={() => handleStatusChange(item)}
                                            >
                                                <Text style={styles.dropdownTextInside}>{item}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                )}
                            </View>

                            {/* ButtonContainer */}
                            <View style={styles.ButtonContainer}>
                                <TouchableOpacity style={styles.AcceptButton} onPress={handleSubmit}>
                                    <Text style={styles.AcceptText}>Submit</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ) : (
                        <View style={styles.loadingContainer}>
                            <Text style={styles.loadingText}>No booking information available.</Text>
                        </View>
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
        tintColor: 'green',
        marginRight: wp('2%'),
    },
    title: {
        fontSize: hp('2.3%'),
        fontWeight: '600',
        color: 'green',
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
    row: {
        marginBottom: hp('1.8%'),
        paddingBottom: hp('1%'),
    },
    rowLocationInside: {
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
    labelMain: {
        fontSize: hp('1.7%'),
        fontWeight: '700',
        color: '#555',
        marginBottom: hp('2%'),
        marginTop: hp('1.2%'),
        letterSpacing: 0.5,
    },
    value: {
        fontSize: hp('1.8%'),
        fontWeight: '500',
        color: '#555',
        lineHeight: hp('2.3%'),
    },
    completed: {
        color: 'green',
        fontWeight: '700',
    },
    pending: {
        color: '#E8A317',
        fontWeight: '700',
    },
    cancelled: {
        color: 'red',
        fontWeight: '700',
    },
    dropdownWrapper: {
        width: '100%',
        marginTop: hp('1.5%'),
        zIndex: 999,
    },
    dropdownBtn: {
        backgroundColor: '#fff',
        paddingVertical: hp('1%'),
        paddingHorizontal: wp('4%'),
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'green',
    },
    dropdownTextContainer: {
        fontWeight: '600',
        color: '#555',
        fontSize: hp('1.7%'),
    },
    dropdownTextInside: {
        fontWeight: '600',
        color: '#555',
        fontSize: hp('1.5%'),
    },
    dropdownMenu: {
        backgroundColor: '#fff',
        marginTop: hp('1%'),
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#e5e5e5',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    dropdownItem: {
        paddingVertical: hp('1.8%'),
        paddingHorizontal: wp('4%'),
        borderBottomWidth: 0.5,
        borderBottomColor: '#eee',
    },
    statusLabel: {
        fontSize: hp('2.3%'),
        marginTop: hp('5%'),
        fontWeight: '700',
        color: '#111',
    },
    ButtonContainer: {
        marginTop: hp('3%'),
        marginBottom: hp('3%'),
        flexDirection: 'column',
        alignItems: 'center',
        width: '100%',
        paddingHorizontal: hp('2%'),
    },
    AcceptButton: {
        paddingVertical: hp('1.5%'),
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'green',
        borderWidth: 1,
        borderColor: 'rgba(0, 0, 0,0.1)',
        elevation: 3,
        width: '100%',
    },
    AcceptText: {
        fontSize: hp('1.8%'),
        fontWeight: '500',
        color: '#fff',
        letterSpacing: 0.5,
    },
    loadingContainer: {
        marginTop: hp('15%'),
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingText: {
        marginTop: hp('2%'),
        fontSize: hp('2%'),
        color: '#555',
    },
});