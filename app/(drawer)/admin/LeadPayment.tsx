import React, { useEffect, useRef, useState } from 'react';
import {
    View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Linking,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Header4 from '@/components/Header4Admin';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { initiateKhaltiPayment, lookupKhaltiPayment } from '@/api/khalti';
import { isLeadUnlocked, recordLeadUnlock } from '@/api/leadUnlocks';
import { LEAD_FEE_NPR, LEAD_FEE_REGULAR_NPR, LEAD_FEE_PAISA } from '@/src/constants/leadFee';

// 'recordFailed' is distinct from 'error': it means Khalti already confirmed the payment and
// only the follow-up unlock write failed, so its retry must NOT re-run the payment (no double charge).
type Stage = 'offer' | 'initiating' | 'waiting' | 'recording' | 'success' | 'error' | 'recordFailed';

export default function LeadPayment() {
    const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
    const [stage, setStage] = useState<Stage>('offer');
    const [errorMsg, setErrorMsg] = useState('');

    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const phoneRef = useRef('');
    const pidxRef = useRef('');

    useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

    // Runs once Khalti confirms the payment. Safe to call again on retry: it checks for an
    // existing unlock first, so a professional who already paid is never charged twice.
    const finalizeUnlock = async () => {
        setStage('recording');
        try {
            if (!(await isLeadUnlocked(bookingId!, phoneRef.current))) {
                await recordLeadUnlock(bookingId!, phoneRef.current, pidxRef.current, LEAD_FEE_PAISA);
            }
            setStage('success');
        } catch (e: any) {
            setErrorMsg('Payment succeeded, but we could not confirm the unlock. Tap Retry — you will not be charged again.');
            setStage('recordFailed');
        }
    };

    const handlePayNow = async () => {
        if (!bookingId) return;
        setStage('initiating');
        try {
            const phone = (await AsyncStorage.getItem('adminPhone')) || '';
            phoneRef.current = phone;
            const res = await initiateKhaltiPayment({
                amountPaisa: LEAD_FEE_PAISA,
                orderId: `LEAD-${bookingId}-${Date.now()}`,
                orderName: 'HomeSewa Lead Opening Fee',
                customerName: 'HomeSewa Professional',
                customerPhone: phone.replace(/\D/g, '').slice(-10),
            });
            pidxRef.current = res.pidx;

            Linking.openURL(res.payment_url);
            setStage('waiting');

            pollRef.current = setInterval(async () => {
                try {
                    const lookup = await lookupKhaltiPayment(res.pidx);
                    if (lookup.status === 'Completed') {
                        clearInterval(pollRef.current!);
                        await finalizeUnlock();
                    } else if (lookup.status === 'Expired' || lookup.status === 'User canceled') {
                        clearInterval(pollRef.current!);
                        setErrorMsg('Payment was not completed. Please try again.');
                        setStage('error');
                    }
                } catch {
                    // transient lookup error — keep polling
                }
            }, 4000);
        } catch (e: any) {
            setErrorMsg(e.message || 'Could not start payment. Please try again.');
            setStage('error');
        }
    };

    const goToBooking = () => {
        router.replace({ pathname: '/admin/BookingDetails_1', params: { id: bookingId } });
    };

    return (
        <View style={styles.screen}>
            <Header4 />
            <View style={styles.container}>

                {(stage === 'offer' || stage === 'initiating') && (
                    <View style={styles.center}>
                        <View style={styles.logoRow}>
                            <View style={styles.logoBox}>
                                <Text style={styles.logoK}>K</Text>
                            </View>
                            <Text style={styles.logoText}>khalti</Text>
                        </View>

                        <View style={styles.priceCard}>
                            <Text style={styles.regularPrice}>Regular Price NPR {LEAD_FEE_REGULAR_NPR}</Text>
                            <Text style={styles.price}>NPR {LEAD_FEE_NPR}</Text>
                            <Text style={styles.subtitle}>Pay to view contact</Text>
                        </View>

                        <TouchableOpacity
                            style={[styles.payBtn, stage === 'initiating' && { opacity: 0.6 }]}
                            onPress={handlePayNow}
                            disabled={stage === 'initiating'}
                            activeOpacity={0.85}
                        >
                            {stage === 'initiating' ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.payBtnText}>Pay Now</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                )}

                {stage === 'waiting' && (
                    <View style={styles.center}>
                        <ActivityIndicator size="large" color="#5C2D91" />
                        <Text style={styles.waitingText}>Waiting for payment confirmation…</Text>
                        <Text style={styles.waitingSub}>Complete the payment in the browser tab that just opened.</Text>
                    </View>
                )}

                {stage === 'recording' && (
                    <View style={styles.center}>
                        <ActivityIndicator size="large" color="#5C2D91" />
                        <Text style={styles.waitingText}>Payment received — unlocking contact…</Text>
                    </View>
                )}

                {stage === 'success' && (
                    <View style={styles.center}>
                        <View style={styles.successCircle}>
                            <Ionicons name="checkmark-circle" size={72} color="#16a34a" />
                        </View>
                        <Text style={styles.successTitle}>Successfully Paid!</Text>
                        <Text style={styles.successAmount}>NPR {LEAD_FEE_NPR}</Text>
                        <TouchableOpacity style={styles.payBtn} onPress={goToBooking} activeOpacity={0.85}>
                            <Text style={styles.payBtnText}>View Booking</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {stage === 'error' && (
                    <View style={styles.center}>
                        <Ionicons name="alert-circle-outline" size={52} color="#ef4444" />
                        <Text style={styles.errorText}>{errorMsg}</Text>
                        <TouchableOpacity style={styles.payBtn} onPress={() => setStage('offer')} activeOpacity={0.85}>
                            <Text style={styles.payBtnText}>Try Again</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {stage === 'recordFailed' && (
                    <View style={styles.center}>
                        <Ionicons name="alert-circle-outline" size={52} color="#ef4444" />
                        <Text style={styles.errorText}>{errorMsg}</Text>
                        <TouchableOpacity style={styles.payBtn} onPress={finalizeUnlock} activeOpacity={0.85}>
                            <Text style={styles.payBtnText}>Retry</Text>
                        </TouchableOpacity>
                    </View>
                )}

            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: '#fff' },
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: wp('8%'),
    },
    center: {
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
    },

    logoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: hp('3%'),
    },
    logoBox: {
        width: 46,
        height: 46,
        borderRadius: 12,
        backgroundColor: '#5C2D91',
        alignItems: 'center',
        justifyContent: 'center',
    },
    logoK: { fontSize: 24, fontWeight: '900', color: '#fff', fontStyle: 'italic' },
    logoText: { fontSize: 26, fontWeight: '800', color: '#5C2D91', letterSpacing: 0.5 },

    priceCard: {
        alignItems: 'center',
        marginBottom: hp('4%'),
    },
    regularPrice: {
        fontSize: hp('1.7%'),
        color: '#9BBAB8',
        textDecorationLine: 'line-through',
        marginBottom: 4,
    },
    price: {
        fontSize: hp('4.5%'),
        fontWeight: '900',
        color: '#1C2B2A',
    },
    subtitle: {
        fontSize: hp('1.9%'),
        color: '#5A7270',
        marginTop: 6,
        fontWeight: '600',
    },

    payBtn: {
        width: '100%',
        backgroundColor: '#295C59',
        borderRadius: 16,
        paddingVertical: hp('1.8%'),
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 4,
    },
    payBtnText: { fontSize: hp('2%'), fontWeight: '800', color: '#fff' },

    waitingText: { fontSize: hp('2%'), fontWeight: '600', color: '#1C2B2A', marginTop: 16, textAlign: 'center' },
    waitingSub: { fontSize: hp('1.6%'), color: '#5A7270', marginTop: 8, textAlign: 'center' },

    successCircle: {
        width: 110,
        height: 110,
        borderRadius: 55,
        backgroundColor: '#dcfce7',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    successTitle: { fontSize: hp('3%'), fontWeight: '800', color: '#16a34a', marginBottom: 8 },
    successAmount: { fontSize: hp('3.5%'), fontWeight: '900', color: '#1C2B2A', marginBottom: 24 },

    errorText: { fontSize: hp('1.9%'), color: '#ef4444', textAlign: 'center', marginTop: 12, marginBottom: 24 },
});
