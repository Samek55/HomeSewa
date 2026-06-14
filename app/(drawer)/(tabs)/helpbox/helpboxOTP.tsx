import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    Alert,
    Dimensions,
    TouchableWithoutFeedback,
    Keyboard,
} from 'react-native';
import React, { useRef, useState } from 'react';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import { heightPercentageToDP as hp } from 'react-native-responsive-screen';
const { width, height } = Dimensions.get('window');
import { createHelpbox } from '../../../../api/PostApiHelpbox';
import { router } from 'expo-router';
import Header2 from '@/components/Header3drawer';

// 1. MODULAR SDK IMPORTS
import { getAuth, signInWithPhoneNumber } from '@react-native-firebase/auth';
import { globalFirebaseConfirmation } from '../../../../components/home/NumberBar'; 

const scaleFont = (size: number) => {
    const guidelineBaseWidth = 375;
    return (size * width) / guidelineBaseWidth;
};

export default function HelpboxOTP() {
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const inputRefs = useRef<Array<TextInput | null>>([]);
    const route = useRoute<any>();

    const phone = route.params?.phone;
    const [isSubmitting, setIsSubmitting] = useState(false);

    useFocusEffect(
        React.useCallback(() => {
            setOtp(['', '', '', '', '', '']);
        }, []),
    );

    const handleChange = (text: string, index: number) => {
        const newOtp = [...otp];
        newOtp[index] = text;
        setOtp(newOtp);

        if (text && index < otp.length - 1) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyPress = (event: any, index: number) => {
        if (event.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handleResendCode = async () => {
        if (!phone) return;
        try {
            Alert.alert('Resending', 'Requesting a new verification code...');
            
            // 2. FIX SYNC: Pass auth instance explicitly + pass boolean resend trigger
            const authInstance = getAuth();
            await (signInWithPhoneNumber as any)(authInstance, '+977' + phone, true);
            
            Alert.alert('Success', 'A new code has been successfully sent.');
        } catch (error: any) {
            Alert.alert('Resend Failed', error.message || 'Unable to re-send token code.');
        }
    };

    const handleNavigate = async () => {
        const enteredOtp = otp.join('');

        if (enteredOtp.length < 6) {
            Alert.alert('Validation Error', 'Please enter the complete 6-digit verification code.');
            return;
        }

        if (isSubmitting) return;
        setIsSubmitting(true);

        try {
            console.log(`Verifying phone: ${phone} with Firebase code: ${enteredOtp}`);
            
            if (!globalFirebaseConfirmation) {
                Alert.alert('Session Expired', 'Authentication context missing. Please go back and try again.');
                setIsSubmitting(false);
                return;
            }

            // 3. Confirm directly invokes the confirmation session resolution handler
            await globalFirebaseConfirmation.confirm(enteredOtp);

            const booking = {
                "Phone": phone,
            };

            await createHelpbox(booking);
            router.push('/helpbox/otpVerifiedHB');

        } catch (error: any) {
            console.log("BOOKING OR VERIFICATION ERROR:", error);
            Alert.alert('Verification Failed', error.message || 'The code entered is invalid or has expired.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <View style={{ flex: 1 }}>
            <Header2 />
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <View style={styles.container}>
                    <Text style={styles.thankYouText}>
                        Phone Verification
                    </Text>

                    <Text style={styles.bookingText}>
                        Enter the 6 digits code sent to your customer number {phone ? phone : '98*****011'} below.
                    </Text>

                    <Text style={styles.otpPromptText}>Enter your OTP to continue.</Text>

                    <View style={styles.otpBox}>
                        {otp.map((_, index) => (
                            <TextInput
                                key={index}
                                ref={ref => {
                                    inputRefs.current[index] = ref;
                                }}
                                style={styles.input}
                                keyboardType="numeric"
                                maxLength={1}
                                value={otp[index]}
                                onChangeText={text => handleChange(text, index)}
                                onKeyPress={event => handleKeyPress(event, index)}
                            />
                        ))}
                    </View>

                    <TouchableOpacity onPress={handleResendCode}>
                        <Text style={styles.resendcode}>
                            {`Didn't get code?`} <Text style={{ color: 'blue', fontWeight: 'bold' }}>Resend Code</Text>
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
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: '5%',
        paddingTop: height * 0.09,
        alignItems: 'center',
        backgroundColor:'#fff'
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
        color: 'green',
    },
    otpBox: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 3,
    },
    input: {
        width: width * 0.12,
        height: width * 0.12,
        marginHorizontal: 5,
        borderWidth: 1,
        borderColor: 'hsl(0, 0%, 79%)',
        borderRadius: 5,
        textAlign: 'center',
        fontSize: scaleFont(18),
        backgroundColor: '#fff',
        elevation: 3,
    },
    resendcode: {
        marginTop: 25,
        paddingHorizontal: 20,
        textAlign: 'center',
        lineHeight: 22,
        fontSize: hp('1.5%')
    },
    submitButton: {
        backgroundColor: 'green',
        height: height * 0.05,
        width: '80%',
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