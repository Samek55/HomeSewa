import React, { useMemo, useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    Alert, Dimensions, TouchableWithoutFeedback, Keyboard, Image, ScrollView,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { router, useLocalSearchParams } from 'expo-router';
import { updateBookingStatus } from '../../../api/helper/updateBookingStatus';
import { notifyJobCompleted } from '../../../api/notifications';
import Header4 from '@/components/Header4Admin';
import OtpInput from '@/components/bookings/OtpInput';
import CompletionPhotosPicker from '@/components/bookings/CompletionPhotosPicker';
import { uploadMultipleToStorage } from '../../../api/uploadToStorage';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import checkIcon from '../../../assets/icons/admin/check-mark.png';
import { invokeEdgeFunction } from '../../../api/functionsClient';
import { maybePromptReview } from '@/src/utils/storeReview';
import { useTheme } from '@/context/ThemeContext';
import type { ThemeColors } from '@/theme/colors';

const { width, height } = Dimensions.get('window');
const scaleFont = (size: number) => (size * width) / 375;

interface VerifyOtpResponse { verified: boolean; message?: string }

export default function WorkCompletionOTP() {
    const { customerName, customerPhone, budget, bookingId } = useLocalSearchParams<{ customerName: string; customerPhone: string; budget: string; bookingId: string }>();
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);
    const [otp, setOtp] = useState(['', '', '', '']);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [completionPhotos, setCompletionPhotos] = useState<string[]>([]);

    const handleVerify = async () => {
        const entered = otp.join('');
        if (entered.length < 4) {
            Alert.alert('Validation Error', 'Please enter the complete 4-digit OTP.');
            return;
        }
        if (completionPhotos.length === 0) {
            Alert.alert('Photos Required', 'Please add at least one photo of the finished job before confirming.');
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

            const photoUrls = await uploadMultipleToStorage(
                completionPhotos.map(uri => ({ uri, fileName: uri.split('/').pop() || 'photo.jpg' }))
            );
            await updateBookingStatus(bookingId, 'Completed', photoUrls);
            notifyJobCompleted(String(customerPhone), bookingId).catch(() => {});
            setSuccess(true);
            maybePromptReview();
        } catch (err: any) {
            Alert.alert('Error', err.message || 'Could not complete booking. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (success) {
        return (
            <View style={{ flex: 1, backgroundColor: colors.surface }}>
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
        <KeyboardAvoidingView behavior="padding" style={{ flex: 1, backgroundColor: colors.background }}>
            <Header4 />
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
                    <Text style={styles.title}>Confirm Completion</Text>
                    <Text style={styles.subtitle}>
                        An OTP was sent to {customerName} at +977 {customerPhone}.
                    </Text>
                    <Text style={styles.prompt}>
                        Ask the customer for their OTP and enter it below.
                    </Text>

                    <OtpInput value={otp} onChange={setOtp} containerStyle={styles.otpBox} boxStyle={styles.input} />

                    <View style={{ width: '100%' }}>
                        <CompletionPhotosPicker value={completionPhotos} onChange={setCompletionPhotos} />
                    </View>

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
                </ScrollView>
            </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
    );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: wp('6%'),
        paddingTop: height * 0.08,
        alignItems: 'center',
        backgroundColor: colors.background,
    },
    title: {
        fontSize: scaleFont(26),
        fontWeight: '700',
        color: colors.textPrimary,
        marginBottom: 10,
    },
    subtitle: {
        width: '80%',
        textAlign: 'center',
        fontSize: scaleFont(14),
        color: colors.textSecondary,
        lineHeight: 22,
        marginBottom: 8,
    },
    prompt: {
        fontSize: scaleFont(14),
        color: colors.brand,
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
        borderColor: colors.border,
        borderRadius: 10,
        textAlign: 'center',
        fontSize: scaleFont(22),
        fontWeight: '700',
        backgroundColor: colors.surface,
        elevation: 3,
        color: colors.textPrimary,
    },
    button: {
        backgroundColor: colors.brand,
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
        color: colors.textMuted,
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
        color: colors.brand,
        marginBottom: 10,
    },
    successSub: {
        fontSize: scaleFont(15),
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 40,
    },
    doneBtn: {
        backgroundColor: colors.brand,
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
