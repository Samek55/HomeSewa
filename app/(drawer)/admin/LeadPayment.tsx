import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Linking,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Header4 from '@/components/Header4Admin';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { initiateLeadPayment, confirmLeadUnlock } from '@/api/khalti';
import { LEAD_FEE_NPR, LEAD_FEE_REGULAR_NPR } from '@/src/constants/leadFee';
import { useTheme } from '@/context/ThemeContext';
import type { ThemeColors } from '@/theme/colors';

// 'recordFailed' is distinct from 'error': it means Khalti already confirmed the payment and
// only the follow-up unlock confirmation failed, so its retry must NOT re-run the payment
// (confirmLeadUnlock is idempotent — safe to call again with the same pidx).
type Stage = 'offer' | 'initiating' | 'waiting' | 'recording' | 'success' | 'error' | 'recordFailed';

const POLL_INTERVAL_MS = 4000;
// Safety net for the "still Pending" / transient-error branches below, which would
// otherwise poll forever — Khalti's own checkout session eventually expires and
// flips lookup.status to 'Expired', but that can take a while, so cap it here too.
const MAX_POLL_MS = 5 * 60_000;

export default function LeadPayment() {
    const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);
    const [stage, setStage] = useState<Stage>('offer');
    const [errorMsg, setErrorMsg] = useState('');

    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const phoneRef = useRef('');
    const pidxRef = useRef('');

    useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

    // Asks the khalti-confirm-lead-unlock Edge Function to look up the payment with Khalti
    // and record the unlock server-side. Safe to call again on retry — it's idempotent.
    const finalizeUnlock = async () => {
        setStage('recording');
        try {
            const result = await confirmLeadUnlock(bookingId!, phoneRef.current, pidxRef.current);
            if (result.success) {
                setStage('success');
            } else {
                setErrorMsg('Payment succeeded, but we could not confirm the unlock. Tap Retry — you will not be charged again.');
                setStage('recordFailed');
            }
        } catch {
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
            const res = await initiateLeadPayment(bookingId, phone.replace(/\D/g, '').slice(-10));
            pidxRef.current = res.pidx;

            Linking.openURL(res.payment_url);
            setStage('waiting');

            const pollStartedAt = Date.now();
            pollRef.current = setInterval(async () => {
                try {
                    const result = await confirmLeadUnlock(bookingId, phoneRef.current, res.pidx);
                    if (result.success) {
                        clearInterval(pollRef.current!);
                        setStage('success');
                        return;
                    }
                    if (result.status === 'Expired' || result.status === 'User canceled') {
                        clearInterval(pollRef.current!);
                        setErrorMsg('Payment was not completed. Please try again.');
                        setStage('error');
                        return;
                    }
                    // A `status` field only ever accompanies a Khalti lookup that's genuinely
                    // still pending (Pending/Initiated) — worth continuing to poll silently.
                    // Its *absence* means confirmLeadUnlock hit a real error instead (lookup
                    // failed, amount mismatch, DB error, pidx reused) — that won't resolve on
                    // its own, so stop and let the user manually retry via the recordFailed UI
                    // rather than polling against it forever.
                    if (!result.status) {
                        clearInterval(pollRef.current!);
                        setErrorMsg(result.error || 'Payment succeeded, but we could not confirm the unlock. Tap Retry — you will not be charged again.');
                        setStage('recordFailed');
                        return;
                    }
                } catch {
                    // transient error calling our own edge function — keep polling, bounded by
                    // the overall MAX_POLL_MS check below.
                }

                if (Date.now() - pollStartedAt > MAX_POLL_MS) {
                    clearInterval(pollRef.current!);
                    setErrorMsg('This is taking longer than expected. Please try again.');
                    setStage('error');
                }
            }, POLL_INTERVAL_MS);
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
                            <Ionicons name="checkmark-circle" size={72} color={colors.success} />
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
                        <Ionicons name="alert-circle-outline" size={52} color={colors.danger} />
                        <Text style={styles.errorText}>{errorMsg}</Text>
                        <TouchableOpacity style={styles.payBtn} onPress={() => setStage('offer')} activeOpacity={0.85}>
                            <Text style={styles.payBtnText}>Try Again</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {stage === 'recordFailed' && (
                    <View style={styles.center}>
                        <Ionicons name="alert-circle-outline" size={52} color={colors.danger} />
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

const createStyles = (colors: ThemeColors) => StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
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
        color: colors.textMuted,
        textDecorationLine: 'line-through',
        marginBottom: 4,
    },
    price: {
        fontSize: hp('4.5%'),
        fontWeight: '900',
        color: colors.textPrimary,
    },
    subtitle: {
        fontSize: hp('1.9%'),
        color: colors.textSecondary,
        marginTop: 6,
        fontWeight: '600',
    },

    payBtn: {
        width: '100%',
        backgroundColor: colors.brand,
        borderRadius: 16,
        paddingVertical: hp('1.8%'),
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 4,
    },
    payBtnText: { fontSize: hp('2%'), fontWeight: '800', color: '#fff' },

    waitingText: { fontSize: hp('2%'), fontWeight: '600', color: colors.textPrimary, marginTop: 16, textAlign: 'center' },
    waitingSub: { fontSize: hp('1.6%'), color: colors.textSecondary, marginTop: 8, textAlign: 'center' },

    successCircle: {
        width: 110,
        height: 110,
        borderRadius: 55,
        backgroundColor: '#dcfce7',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    successTitle: { fontSize: hp('3%'), fontWeight: '800', color: colors.success, marginBottom: 8 },
    successAmount: { fontSize: hp('3.5%'), fontWeight: '900', color: colors.textPrimary, marginBottom: 24 },

    errorText: { fontSize: hp('1.9%'), color: colors.danger, textAlign: 'center', marginTop: 12, marginBottom: 24 },
});
