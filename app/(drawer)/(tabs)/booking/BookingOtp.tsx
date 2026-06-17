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
import React, { useEffect, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { createBooking } from '../../../../api/PostApiBooking';
import { notifyProfessionals } from '../../../../api/notifications';
import { heightPercentageToDP as hp } from 'react-native-responsive-screen';
import base from '../../../../api/airtable';
import { router, useLocalSearchParams } from 'expo-router';
import Header2 from '@/components/Header2';
import { OneSignal } from 'react-native-onesignal';

const { width, height } = Dimensions.get('window');

const scaleFont = (size: number) => (size * width) / 375;

const SPARROW_TOKEN = process.env.EXPO_PUBLIC_SPARROW_TOKEN!;

const sendSparrowOtp = async (phone: string, otp: string) => {
  const to = '977' + phone;
  console.log('[Sparrow] token:', SPARROW_TOKEN);
  console.log('[Sparrow] to:', to);
  const response = await fetch('https://api.sparrowsms.com/v2/sms/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token: SPARROW_TOKEN,
      from: 'HomeSewa',
      to,
      text: `Your HomeSewa verification code is: ${otp}`,
    }),
  });
  const data = await response.json().catch(() => ({}));
  console.log('[Sparrow] response status:', response.status, 'body:', JSON.stringify(data));
  if (!response.ok) throw new Error(`Sparrow error ${response.status}: ${JSON.stringify(data)}`);
};

const generateOtp = () => String(Math.floor(1000 + Math.random() * 9000));

export default function BookingOtp() {
  const [otp, setOtp] = useState(['', '', '', '']);
  const [sentOtp, setSentOtp] = useState('');
  const inputRefs = useRef<Array<TextInput | null>>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    name,
    number,
    selectedService,
    selectedShift,
    selectedArea,
    selectedPriority,
    selectedBudget,
    message,
    date,
    endDate,
  } = useLocalSearchParams();

  const sendOtp = async () => {
    const code = generateOtp();
    setSentOtp(code);
    try {
      await sendSparrowOtp(String(number), code);
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

  const formatDate = (d: any) => new Date(d).toISOString().split('T')[0];

  const handleNavigate = async () => {
    const enteredOtp = otp.join('');
    if (isSubmitting) return;

    if (enteredOtp.length < 4) {
      Alert.alert('Validation Error', 'Please enter the complete 4-digit verification code.');
      return;
    }

    if (enteredOtp !== sentOtp) {
      Alert.alert('Invalid Code', 'The code you entered is incorrect. Please try again.');
      return;
    }

    setIsSubmitting(true);

    try {
      if (number) {
        try {
          OneSignal.login(String(number));
          OneSignal.User.addTags({ role: 'user', phone: String(number) });
        } catch {}
      }

      const serviceRecords = await base('Services').select().all();
      const serviceMap = serviceRecords.map((rec: any) => ({ id: rec.id, name: rec.fields.Name }));

      const serviceIds = Array.isArray(selectedService)
        ? selectedService.map((n: string) => serviceMap.find((s: any) => s.name === n)?.id).filter(Boolean)
        : [serviceMap.find((s: any) => s.name === selectedService)?.id].filter(Boolean);

      if (serviceIds.length === 0) {
        Alert.alert('Error', 'No valid service selected');
        setIsSubmitting(false);
        return;
      }

      const booking = {
        'Full name': name,
        'Phone': number,
        'Select Services': serviceIds,
        'Area': selectedArea,
        'Priority': selectedPriority,
        'Select Shift': selectedShift,
        'Work Description': message,
        'Budget': selectedBudget,
        'Starting Date': formatDate(date),
        ...(endDate ? { 'Service Completion Date': formatDate(endDate) } : {}),
        'Status': 'New / Open',
      };

      await createBooking(booking);

      try {
        const targetService = Array.isArray(selectedService) ? selectedService[0] : selectedService;
        const targetArea = Array.isArray(selectedArea) ? selectedArea[0] : selectedArea;
        await notifyProfessionals(String(targetService).trim(), String(targetArea).trim());
      } catch {}

      router.push('/booking/BookingVerify');
    } catch (error: any) {
      Alert.alert('Submission Failed', error.message || 'An error occurred while processing your request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <Header2 />
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.container}>
          <Text style={styles.thankYouText}>Phone Verification</Text>

          <Text style={styles.bookingText}>
            Booking request received. Awaiting confirmation!
          </Text>

          <Text style={styles.otpPromptText}>Enter your OTP to continue.</Text>

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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: '5%', paddingTop: height * 0.09, alignItems: 'center', backgroundColor: '#fff' },
  thankYouText: { fontSize: scaleFont(27), fontWeight: '700' },
  bookingText: { width: '70%', textAlign: 'center', marginBottom: height * 0.08, fontSize: scaleFont(17), marginTop: height * 0.03, fontWeight: '500', lineHeight: 23 },
  otpPromptText: { fontSize: scaleFont(16.5), marginBottom: height * 0.04, fontWeight: '400', color: '#295C59' },
  otpBox: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 3 },
  input: { width: width * 0.14, height: width * 0.14, marginHorizontal: 5, borderWidth: 1, borderColor: 'hsl(0, 0%, 79%)', borderRadius: 5, textAlign: 'center', fontSize: scaleFont(20), backgroundColor: '#fff', elevation: 3 },
  resendcode: { marginTop: 25, paddingHorizontal: 20, textAlign: 'center', lineHeight: 22, fontSize: hp('1.5%') },
  submitButton: { backgroundColor: '#295C59', height: height * 0.065, width: '60%', justifyContent: 'center', alignItems: 'center', borderRadius: 100, marginTop: height * 0.08 },
  submitButtonText: { fontSize: scaleFont(17), color: '#fff', fontWeight: '300' },
});
