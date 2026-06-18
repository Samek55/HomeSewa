import React, { useRef, useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, TextInput,
    Alert, Dimensions, TouchableWithoutFeedback, Keyboard, Image,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { updateBookingStatus } from '../../../api/helper/updateBookingStatus';
import Header4 from '@/components/Header4Admin';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import checkIcon from '../../../assets/icons/admin/check-mark.png';

const { width, height } = Dimensions.get('window');
const scaleFont = (size: number) => (size * width) / 375;

export default function WorkCompletionOTP() {
    const { customerName, customerPhone } = useLocalSearchParams<{ customerName: string; customerPhone: string }>();
    const [otp, setOtp] = useState(['', '', '', '']);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const inputRefs = useRef<Array<TextInput | null>>([]);

    const handleChange = (text: string, index: number) => {
        const newOtp = [...otp];
        newOtp[index] = text;
        setOtp(newOtp);
        if (text && index < 3) inputRefs.current[index + 1]?.focus();
    };

    const handleKeyPress = (event: any, index: number) => {
        if (event.nativeEvent.key === 'Backspace' && !otp[index] && index > 0)
            inputRefs.current[index - 1]?.focus();
    };

    const handleVerify = async () => {
        const entered = otp.join('');
        if (entered.length < 4) {
            Alert.alert('Validation Error', 'Please enter the complete 4-digit OTP.');
            return;
        }
        if (isSubmitting) return;
        setIsSubmitting(true);

        try {
            const stored = await AsyncStorage.getItem('completionOtp');
            if (!stored) throw new Error('OTP session expired. Please go back and try again.');
            const { otp: sentOtp, bookingId } = JSON.parse(stored);

            if (entered !== sentOtp) {
                Alert.alert('Invalid OTP', 'The code is incorrect. Please ask the customer for the correct OTP.');
                setIsSubmitting(false);
                return;
            }

            await updateBookingStatus(bookingId, 'Completed');
            await AsyncStorage.removeItem('completionOtp');
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
        <View style={{ flex: 1 }}>
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

                    <View style={styles.otpBox}>
                        {otp.map((_, index) => (
                            <TextInput
                                key={index}
                                ref={ref => { inputRefs.current[index] = ref; }}
                                style={styles.input}
                                keyboardType="numeric"
                                maxLength={1}
                                value={otp[index]}
                                onChangeText={text => handleChange(text, index)}
                                onKeyPress={event => handleKeyPress(event, index)}
                            />
                        ))}
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
                </View>
            </TouchableWithoutFeedback>
        </View>
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
