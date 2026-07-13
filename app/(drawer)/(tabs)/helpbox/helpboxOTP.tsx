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
import React, { useEffect, useState } from 'react';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import { heightPercentageToDP as hp } from 'react-native-responsive-screen';
const { width, height } = Dimensions.get('window');
import { createHelpbox } from '../../../../api/PostApiHelpbox';
import { router } from 'expo-router';
import Header2 from '@/components/Header3drawer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import OtpInput from '@/components/bookings/OtpInput';

const LAST_HELP_REQUEST_KEY = 'lastHelpRequestAt';
const SPARROW_TOKEN = process.env.EXPO_PUBLIC_SPARROW_TOKEN!;

const scaleFont = (size: number) => (size * width) / 375;

const generateOtp = () => String(Math.floor(1000 + Math.random() * 9000));

const sendSparrowOtp = async (phone: string, otp: string) => {
    const to = '977' + phone.replace(/\D/g, '').slice(-10);
    console.log('[Sparrow] token:', SPARROW_TOKEN);
    console.log('[Sparrow] to:', to);
    const response = await fetch('https://api.sparrowsms.com/v2/sms/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            token: SPARROW_TOKEN,
            from: 'TheAlert',
            to,
            text: `Hi, Thank you for submitting help request. Your OTP code is ${otp}.\n\nThank You for using HomeSewa\n( www.homesewa.app )`,
        }),
    });
    const data = await response.json().catch(() => ({}));
    console.log('[Sparrow] response status:', response.status, 'body:', JSON.stringify(data));
    if (!response.ok) throw new Error(`Sparrow error ${response.status}: ${JSON.stringify(data)}`);
};

export default function HelpboxOTP() {
    const [otp, setOtp] = useState(['', '', '', '']);
    const [sentOtp, setSentOtp] = useState('');
    const route = useRoute<any>();
    const phone = route.params?.phone;
    const [isSubmitting, setIsSubmitting] = useState(false);

    const sendOtp = async () => {
        const code = generateOtp();
        setSentOtp(code);
        try {
            await sendSparrowOtp(String(phone), code);
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

        if (enteredOtp !== sentOtp) {
            Alert.alert('Invalid Code', 'The code you entered is incorrect. Please try again.');
            return;
        }

        if (isSubmitting) return;
        setIsSubmitting(true);

        try {
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
        <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
            <Header2 />
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <View style={styles.container}>
                    <Text style={styles.thankYouText}>Phone Verification</Text>

                    <Text style={styles.bookingText}>
                        Enter the 4 digit code sent to your number {phone ? phone : '98*****011'} below.
                    </Text>

                    <Text style={styles.otpPromptText}>Enter your OTP to continue.</Text>

                    <OtpInput value={otp} onChange={setOtp} containerStyle={styles.otpBox} boxStyle={styles.input} />

                    <TouchableOpacity onPress={sendOtp}>
                        <Text style={styles.resendcode}>
                            {`Didn't get code? `}
                            <Text style={{ color: '#295C59', fontWeight: 'bold' }}>Resend Code</Text>
                        </Text>
                    </TouchableOpacity>

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

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: '5%',
        paddingTop: height * 0.09,
        alignItems: 'center',
        backgroundColor: '#fff',
    },
    thankYouText: {
        marginTop: hp('3%'),
        fontSize: scaleFont(27),
        fontWeight: '500',
    },
    bookingText: {
        width: '70%',
        textAlign: 'center',
        marginBottom: height * 0.08,
        fontSize: scaleFont(13),
        marginTop: height * 0.03,
        fontWeight: '400',
        lineHeight: 23,
    },
    otpPromptText: {
        fontSize: scaleFont(16.5),
        marginBottom: height * 0.04,
        fontWeight: '400',
        color: '#295C59',
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
        borderColor: 'hsl(0, 0%, 79%)',
        borderRadius: 5,
        textAlign: 'center',
        fontSize: scaleFont(20),
        backgroundColor: '#fff',
        elevation: 3,
    },
    resendcode: {
        marginTop: 25,
        paddingHorizontal: 20,
        textAlign: 'center',
        lineHeight: 22,
        fontSize: hp('1.5%'),
    },
    submitButton: {
        backgroundColor: '#295C59',
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
