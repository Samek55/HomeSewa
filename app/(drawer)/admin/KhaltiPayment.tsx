import React, { useEffect, useRef, useState } from 'react';
import {
    View, Text, StyleSheet, Dimensions, Image,
    ActivityIndicator, Animated, Easing, TouchableOpacity,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Header4 from '@/components/Header4Admin';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { initiateKhaltiPayment, lookupKhaltiPayment } from '@/api/khalti';

const { width } = Dimensions.get('window');
const scaleFont = (s: number) => (s * width) / 375;

function parseBudgetPaisa(budget: string): number {
    const match = budget.replace(/,/g, '').match(/\d+/);
    const npr = match ? parseInt(match[0], 10) : 100;
    return npr * 100;
}

function parseBudgetDisplay(budget: string): string {
    const match = budget.replace(/,/g, '').match(/\d+/);
    return match ? `NPR ${parseInt(match[0], 10).toLocaleString()}` : budget;
}

type Stage = 'loading' | 'qr' | 'success' | 'error';

export default function KhaltiPayment() {
    const { customerName, customerPhone, budget, professionalPhone, professionalName } =
        useLocalSearchParams<{
            customerName: string;
            customerPhone: string;
            budget: string;
            professionalPhone: string;
            professionalName: string;
        }>();

    const [stage, setStage] = useState<Stage>('loading');
    const [paymentUrl, setPaymentUrl] = useState('');
    const [pidx, setPidx] = useState('');
    const [receivedAmount, setReceivedAmount] = useState('');
    const [errorMsg, setErrorMsg] = useState('');

    const pulseAnim = useRef(new Animated.Value(1)).current;
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const successAnim = useRef(new Animated.Value(0)).current;

    const cleanPhone = (professionalPhone ?? '').replace(/\D/g, '').slice(-10);
    const amountPaisa = parseBudgetPaisa(budget || '');
    const amountDisplay = parseBudgetDisplay(budget || '');

    // Initiate payment via Khalti merchant API
    useEffect(() => {
        (async () => {
            try {
                const orderId = `HS-${Date.now()}`;
                const res = await initiateKhaltiPayment({
                    amountPaisa,
                    orderId,
                    orderName: 'HomeSewa Service Payment',
                    customerName: customerName || 'Customer',
                    customerPhone: (customerPhone || '').replace(/\D/g, '').slice(-10),
                });
                setPaymentUrl(res.payment_url);
                setPidx(res.pidx);
                setStage('qr');
            } catch (e: any) {
                // Merchant API not activated — fall back to phone QR
                setStage('qr');
            }
        })();
        return () => { if (pollRef.current) clearInterval(pollRef.current); };
    }, []);

    // Poll for payment completion (merchant API flow only)
    useEffect(() => {
        if (stage !== 'qr' || !pidx) return;
        pollRef.current = setInterval(async () => {
            try {
                const lookup = await lookupKhaltiPayment(pidx);
                if (lookup.status === 'Completed') {
                    clearInterval(pollRef.current!);
                    const npr = Math.round(lookup.total_amount / 100);
                    setReceivedAmount(`NPR ${npr.toLocaleString()}`);
                    setStage('success');
                }
            } catch {}
        }, 5000);
        return () => { if (pollRef.current) clearInterval(pollRef.current); };
    }, [stage, pidx]);

    // Pulse animation
    useEffect(() => {
        if (stage !== 'qr') return;
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1.04, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
            ])
        );
        loop.start();
        return () => loop.stop();
    }, [stage]);

    // Success auto-navigate
    useEffect(() => {
        if (stage !== 'success') return;
        Animated.timing(successAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
        const t = setTimeout(() => router.replace('/admin/BookingHistory'), 3000);
        return () => clearTimeout(t);
    }, [stage]);

    // Only render a QR when we have a real, scannable Khalti payment_url. A QR encoding a bare
    // phone number isn't actionable — scanning it just shows the digits as text, it doesn't open
    // Khalti or trigger any payment, so showing one there would look functional but do nothing.
    const qrUrl = paymentUrl
        ? `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(paymentUrl)}&size=300x300&margin=10`
        : null;

    // ── Loading ──
    if (stage === 'loading') {
        return (
            <View style={styles.screen}>
                <Header4 />
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#5C2D91" />
                    <Text style={styles.loadingText}>Setting up payment…</Text>
                </View>
            </View>
        );
    }

    // ── Error ──
    if (stage === 'error') {
        return (
            <View style={styles.screen}>
                <Header4 />
                <View style={styles.center}>
                    <Ionicons name="alert-circle-outline" size={52} color="#ef4444" />
                    <Text style={[styles.loadingText, { color: '#ef4444', marginTop: 12 }]}>{errorMsg}</Text>
                </View>
            </View>
        );
    }

    // ── Success ──
    if (stage === 'success') {
        return (
            <View style={styles.screen}>
                <Header4 />
                <Animated.View style={[styles.center, { opacity: successAnim }]}>
                    <View style={styles.successCircle}>
                        <Ionicons name="checkmark-circle" size={72} color="#16a34a" />
                    </View>
                    <Text style={styles.successTitle}>Payment Received!</Text>
                    <Text style={styles.successAmount}>{receivedAmount || amountDisplay}</Text>
                    <Text style={styles.successSub}>Payment from {customerName} confirmed via Khalti.</Text>
                    <Text style={styles.redirectNote}>Redirecting to bookings…</Text>
                </Animated.View>
            </View>
        );
    }

    // ── QR Screen ──
    return (
        <View style={styles.screen}>
            <Header4 />
            <View style={styles.container}>

                {/* Khalti logo */}
                <View style={styles.logoRow}>
                    <View style={styles.logoBox}>
                        <Text style={styles.logoK}>K</Text>
                    </View>
                    <Text style={styles.logoText}>khalti</Text>
                </View>

                {/* Professional info */}
                <Text style={styles.proName}>{professionalName || 'Professional'}</Text>
                <Text style={styles.proPhone}>Khalti Phone # : {cleanPhone || '—'}</Text>

                {/* QR Code (only when Khalti gave us a real, scannable payment link) */}
                <Animated.View style={[styles.qrCard, { transform: [{ scale: pulseAnim }] }]}>
                    {qrUrl ? (
                        <Image source={{ uri: qrUrl }} style={styles.qrImage} resizeMode="contain" />
                    ) : (
                        <View style={styles.qrFallback}>
                            <Ionicons name="call-outline" size={28} color="#5C2D91" />
                            <Text style={styles.qrFallbackPhone}>{cleanPhone || '—'}</Text>
                            <Text style={styles.qrFallbackNote}>
                                Ask the customer to send payment to this Khalti number directly, then confirm below.
                            </Text>
                        </View>
                    )}
                </Animated.View>

                {/* Payment Received button (manual confirm while merchant API is pending activation) */}
                {!pidx && (
                    <TouchableOpacity style={styles.confirmBtn} onPress={() => setStage('success')} activeOpacity={0.85}>
                        <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                        <Text style={styles.confirmText}>Payment Received</Text>
                    </TouchableOpacity>
                )}

                {/* Note */}
                <Text style={styles.note}>
                    Note : Accept payment for{'\n'}payment verification and further records.
                </Text>

                {/* Polling indicator (when merchant API is active) */}
                {!!pidx && (
                    <View style={styles.waitingRow}>
                        <ActivityIndicator size="small" color="#5C2D91" />
                        <Text style={styles.waitingText}>Waiting for customer to complete payment…</Text>
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
        paddingHorizontal: wp('8%'),
        paddingTop: hp('3%'),
    },
    center: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: wp('8%'),
    },
    loadingText: { fontSize: scaleFont(15), color: '#5A7270', marginTop: 16, textAlign: 'center' },

    logoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: hp('2%'),
    },
    logoBox: {
        width: 46,
        height: 46,
        borderRadius: 12,
        backgroundColor: '#5C2D91',
        alignItems: 'center',
        justifyContent: 'center',
    },
    logoK: { fontSize: scaleFont(24), fontWeight: '900', color: '#fff', fontStyle: 'italic' },
    logoText: { fontSize: scaleFont(26), fontWeight: '800', color: '#5C2D91', letterSpacing: 0.5 },

    proName: {
        fontSize: scaleFont(17),
        fontWeight: '700',
        color: '#1C2B2A',
        textAlign: 'center',
        marginBottom: 6,
    },
    proPhone: {
        fontSize: scaleFont(14),
        color: '#444',
        fontWeight: '500',
        marginBottom: hp('2.5%'),
        textAlign: 'center',
    },

    qrCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 12,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        marginBottom: hp('2.5%'),
    },
    qrImage: { width: 240, height: 240 },
    qrFallback: {
        width: 240,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: hp('3%'),
        gap: 8,
    },
    qrFallbackPhone: { fontSize: scaleFont(22), fontWeight: '800', color: '#1C2B2A' },
    qrFallbackNote: { fontSize: scaleFont(12), color: '#5A7270', textAlign: 'center', lineHeight: 18 },

    confirmBtn: {
        width: '100%',
        backgroundColor: '#5C2D91',
        borderRadius: 16,
        paddingVertical: hp('1.8%'),
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        elevation: 4,
        marginBottom: hp('2%'),
    },
    confirmText: { fontSize: scaleFont(16), fontWeight: '800', color: '#fff' },

    note: {
        fontSize: scaleFont(13),
        color: '#555',
        textAlign: 'center',
        fontStyle: 'italic',
        lineHeight: 22,
        marginBottom: hp('1.5%'),
    },

    waitingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    waitingText: { fontSize: scaleFont(12), color: '#9BBAB8', fontStyle: 'italic' },

    successCircle: {
        width: 110,
        height: 110,
        borderRadius: 55,
        backgroundColor: '#dcfce7',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    successTitle: { fontSize: scaleFont(28), fontWeight: '800', color: '#16a34a', marginBottom: 8 },
    successAmount: { fontSize: scaleFont(36), fontWeight: '900', color: '#1C2B2A', marginBottom: 10 },
    successSub: { fontSize: scaleFont(14), color: '#5A7270', textAlign: 'center', lineHeight: 22, marginBottom: 20 },
    redirectNote: { fontSize: scaleFont(12), color: '#B0BEC5', fontStyle: 'italic' },
});
