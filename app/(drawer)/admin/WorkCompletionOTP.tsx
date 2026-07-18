import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    Alert, Dimensions, TouchableWithoutFeedback, Keyboard, Image,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { router, useLocalSearchParams } from 'expo-router';
import { updateBookingStatus } from '../../../api/helper/updateBookingStatus';
import Header4 from '@/components/Header4Admin';
import OtpInput from '@/components/bookings/OtpInput';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import checkIcon from '../../../assets/icons/admin/check-mark.png';
import { invokeEdgeFunction } from '../../../api/functionsClient';

const { width, height } = Dimensions.get('window');
const scaleFont = (size: number) => (size * width) / 375;

interface VerifyOtpResponse { verified: boolean; message?: string }

export default function WorkCompletionOTP() {
    const { customerName, customerPhone, budget, bookingId } = useLocalSearchParams<{ customerName: string; customerPhone: string; budget: string; bookingId: string }>();
    const [otp, setOtp] = useState(['', '', '', '']);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleVerify = async () => {
        const entered = otp.join('');
        if (entered.length < 4) {
            Alert.alert('Validation Error', 'Please enter the complete 4-digit OTP.');
            return;
        }
        if (isSubmitting) return;
        setIsSubmitting(true);

        try {
            const verifyResult = await invokeEdgeFunction<VerifyOtpResponse>(
                'verify-otp',
                { phone: String(customerPhone), purpose: 'work-completion', code: entered },
                'Could not verify the code. Please try again.'
            );
            if (!verifyResult.verified) {
                Alert.alert('Invalid OTP', verifyResult.message || 'The code is incorrect. Please ask the customer for the correct OTP.');
                setIsSubmitting(false);
                return;
            }

            await updateBookingStatus(bookingId, 'Completed');
            setSuccess(true);
        } catch (err: any) {
            Alert.alert('Error', err.message || 'Could not complete booking. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (success) {
        return (
            <View style={{ flex: 1, backgroundColor: '#fff' }}>
                <Header4 />
                <View style={styles.successContainer}>
                    <Image source={checkIcon} style={styles.checkIcon} resizeMode="contain" />
                    <Text style={styles.successTitle}>Work Completed!</Text>
                    <Text style={styles.successSub}>
                        Booking for {customerName} has been marked as completed.
                    </Text>
                    <TouchableOpacity
                        style={styles.doneBtn}
                        onPress={() => router.replace('/admin/BookingHistory')}
                    >
                        <Text style={styles.doneBtnText}>Back to Bookings</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return (
        <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
            <Header4 />
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <View style={styles.container}>
                    <Text style={styles.title}>Confirm Completion</Text>
                    <Text style={styles.subtitle}>
                        An OTP was sent to {customerName} at +977 {customerPhone}.
                    </Text>
                    <Text style={styles.prompt}>
                        Ask the customer for their OTP and enter it below.
                    </Text>

                    <OtpInput value={otp} onChange={setOtp} containerStyle={styles.otpBox} boxStyle={styles.input} />

                    <TouchableOpacity
                        style={[styles.button, isSubmitting && { opacity: 0.6 }]}
                        onPress={handleVerify}
                        disabled={isSubmitting}
                    >
                        <Text style={styles.buttonText}>
                            {isSubmitting ? 'Verifying...' : 'Mark as Completed'}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
                        <Text style={styles.backText}>Go Back</Text>
                    </TouchableOpacity>
                </View>
            </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: wp('6%'),
        paddingTop: height * 0.08,
        alignItems: 'center',
        backgroundColor: '#fff',
    },
    title: {
        fontSize: scaleFont(26),
        fontWeight: '700',
        color: '#1C2B2A',
        marginBottom: 10,
    },
    subtitle: {
        width: '80%',
        textAlign: 'center',
        fontSize: scaleFont(14),
        color: '#5A7270',
        lineHeight: 22,
        marginBottom: 8,
    },
    prompt: {
        fontSize: scaleFont(14),
        color: '#295C59',
        fontWeight: '600',
        textAlign: 'center',
        marginBottom: height * 0.05,
    },
    otpBox: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: height * 0.05,
    },
    input: {
        width: width * 0.14,
        height: width * 0.14,
        marginHorizontal: 6,
        borderWidth: 1.5,
        borderColor: '#D6E8E7',
        borderRadius: 10,
        textAlign: 'center',
        fontSize: scaleFont(22),
        fontWeight: '700',
        backgroundColor: '#fff',
        elevation: 3,
        color: '#1C2B2A',
    },
    button: {
        backgroundColor: '#295C59',
        height: height * 0.065,
        width: '80%',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 12,
        elevation: 4,
    },
    buttonText: {
        fontSize: scaleFont(16),
        color: '#fff',
        fontWeight: '700',
    },
    backText: {
        fontSize: scaleFont(14),
        color: '#9BBAB8',
        fontWeight: '500',
    },
    successContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: wp('8%'),
    },
    checkIcon: {
        width: width * 0.45,
        height: width * 0.45,
        marginBottom: 24,
    },
    successTitle: {
        fontSize: scaleFont(28),
        fontWeight: '800',
        color: '#295C59',
        marginBottom: 10,
    },
    successSub: {
        fontSize: scaleFont(15),
        color: '#5A7270',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 40,
    },
    doneBtn: {
        backgroundColor: '#295C59',
        height: height * 0.065,
        width: '80%',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 12,
        elevation: 4,
    },
    doneBtnText: {
        fontSize: scaleFont(16),
        color: '#fff',
        fontWeight: '700',
    },
});
