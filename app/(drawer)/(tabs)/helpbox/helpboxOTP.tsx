import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
    Dimensions,
    TouchableWithoutFeedback,
    Keyboard,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import React, { useEffect, useState, useMemo } from 'react';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import { heightPercentageToDP as hp } from 'react-native-responsive-screen';
const { width, height } = Dimensions.get('window');
import { createHelpbox } from '../../../../api/PostApiHelpbox';
import { router } from 'expo-router';
import Header2 from '@/components/Header3drawer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import OtpInput from '@/components/bookings/OtpInput';
import { invokeEdgeFunction } from '../../../../api/functionsClient';
import { useTheme } from '@/context/ThemeContext';
import type { ThemeColors } from '@/theme/colors';
import { useResendCooldown } from '@/src/utils/useResendCooldown';

const LAST_HELP_REQUEST_KEY = 'lastHelpRequestAt';

const scaleFont = (size: number) => (size * width) / 375;

interface SendOtpResponse { success: boolean; message?: string; waitSeconds?: number }
interface VerifyOtpResponse { verified: boolean; message?: string }

export default function HelpboxOTP() {
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);
    const [otp, setOtp] = useState(['', '', '', '']);
    const route = useRoute<any>();
    const phone = route.params?.phone;
    const [isSubmitting, setIsSubmitting] = useState(false);
    const resendCooldown = useResendCooldown();

    const sendOtp = async () => {
        if (!resendCooldown.canResend) return;
        resendCooldown.start();
        try {
            const result = await invokeEdgeFunction<SendOtpResponse>(
                'send-otp',
                { phone: String(phone), purpose: 'helpbox' },
                'Could not send verification code. Please try again.'
            );
            if (!result.success) {
                if (result.waitSeconds) resendCooldown.start(result.waitSeconds);
                Alert.alert('SMS Error', result.message || 'Could not send verification code. Please try again.');
            }
        } catch (err: any) {
            Alert.alert('SMS Error', err?.message || 'Could not send verification code. Please try again.');
        }
    };

    useEffect(() => {
        sendOtp();
    }, []);

    useFocusEffect(
        React.useCallback(() => {
            setOtp(['', '', '', '']);
        }, []),
    );

    const handleNavigate = async () => {
        const enteredOtp = otp.join('');

        if (enteredOtp.length < 4) {
            Alert.alert('Validation Error', 'Please enter the complete 4-digit verification code.');
            return;
        }

        if (isSubmitting) return;
        setIsSubmitting(true);

        try {
            const verifyResult = await invokeEdgeFunction<VerifyOtpResponse>(
                'verify-otp',
                { phone: String(phone), purpose: 'helpbox', code: enteredOtp },
                'Could not verify the code. Please try again.'
            );
            if (!verifyResult.verified) {
                Alert.alert('Invalid Code', verifyResult.message || 'The code you entered is incorrect. Please try again.');
                setIsSubmitting(false);
                return;
            }

            const booking = { "Phone": phone };
            await createHelpbox(booking);
            await AsyncStorage.setItem(LAST_HELP_REQUEST_KEY, String(Date.now()));
            router.push('/helpbox/otpVerifiedHB');
        } catch (error: any) {
            Alert.alert('Submission Failed', error.message || 'Something went wrong. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <KeyboardAvoidingView behavior="padding" style={{ flex: 1, backgroundColor: colors.background }}>
            <Header2 />
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <View style={styles.container}>
                    <Text style={styles.thankYouText}>Phone Verification</Text>

                    <Text style={styles.bookingText}>
                        Enter the 4 digit code sent to your number {phone ? phone : '98*****011'} below.
                    </Text>

                    <Text style={styles.otpPromptText}>Enter your OTP to continue.</Text>

                    <OtpInput value={otp} onChange={setOtp} containerStyle={styles.otpBox} boxStyle={styles.input} />

                    {resendCooldown.canResend ? (
                        <TouchableOpacity onPress={sendOtp}>
                            <Text style={styles.resendcode}>
                                {`Didn't get code? `}
                                <Text style={{ color: colors.brand, fontWeight: 'bold' }}>Resend Code</Text>
                            </Text>
                        </TouchableOpacity>
                    ) : (
                        <Text style={styles.resendcode}>{`Resend code in ${resendCooldown.remaining}s`}</Text>
                    )}

                    <TouchableOpacity
                        style={[styles.submitButton, isSubmitting && { opacity: 0.6 }]}
                        onPress={handleNavigate}
                        disabled={isSubmitting}
                    >
                        <Text style={styles.submitButtonText}>
                            {isSubmitting ? 'Verifying...' : 'Submit'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
    );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: '5%',
        paddingTop: height * 0.09,
        alignItems: 'center',
        backgroundColor: colors.background,
    },
    thankYouText: {
        marginTop: hp('3%'),
        fontSize: scaleFont(27),
        fontWeight: '500',
        color: colors.textPrimary,
    },
    bookingText: {
        width: '70%',
        textAlign: 'center',
        marginBottom: height * 0.08,
        fontSize: scaleFont(13),
        marginTop: height * 0.03,
        fontWeight: '400',
        lineHeight: 23,
        color: colors.textSecondary,
    },
    otpPromptText: {
        fontSize: scaleFont(16.5),
        marginBottom: height * 0.04,
        fontWeight: '400',
        color: colors.brand,
    },
    otpBox: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 3,
    },
    input: {
        width: width * 0.14,
        height: width * 0.14,
        marginHorizontal: 5,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 5,
        textAlign: 'center',
        fontSize: scaleFont(20),
        backgroundColor: colors.surface,
        color: colors.textPrimary,
        elevation: 3,
    },
    resendcode: {
        marginTop: 25,
        paddingHorizontal: 20,
        textAlign: 'center',
        lineHeight: 22,
        fontSize: hp('1.5%'),
        color: colors.textSecondary,
    },
    submitButton: {
        backgroundColor: colors.brand,
        height: height * 0.07,
        width: '60%',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 100,
        marginTop: height * 0.08,
    },
    submitButtonText: {
        fontSize: scaleFont(17),
        color: '#fff',
        fontWeight: '300',
    },
});
