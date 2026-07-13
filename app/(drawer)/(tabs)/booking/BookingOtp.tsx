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
import { useFocusEffect } from '@react-navigation/native';
import { createBooking } from '../../../../api/PostApiBooking';
import { heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { router, useLocalSearchParams } from 'expo-router';
import Header2 from '@/components/Header2';
import { OneSignal } from 'react-native-onesignal';
import { supabase } from '../../../../lib/supabase';
import OtpInput from '@/components/bookings/OtpInput';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

const scaleFont = (size: number) => (size * width) / 375;

const SPARROW_TOKEN = process.env.EXPO_PUBLIC_SPARROW_TOKEN!;

const sendSparrowOtp = async (phone: string, otp: string, firstName: string) => {
  const to = '977' + phone;
  const text = `Dear ${firstName}, Your Service Booking OTP code is ${otp}.\n\nThank You for using HomeSewa\n( www.homesewa.app )`;
  const response = await fetch('https://api.sparrowsms.com/v2/sms/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token: SPARROW_TOKEN,
      from: 'TheAlert',
      to,
      text,
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
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    name,
    number,
    selectedService,
    selectedShift,
    selectedCity,
    selectedArea,
    selectedPriority,
    selectedBudget,
    message,
    date,
    endDate,
    photos,
  } = useLocalSearchParams();

  const sendOtp = async () => {
    const code = generateOtp();
    setSentOtp(code);
    const firstName = String(name || '').split(' ')[0] || 'Customer';
    try {
      await sendSparrowOtp(String(number), code, firstName);
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
        // Remembers this device's own customer phone so the in-app Notifications
        // screen can pull back "customer_specific" pushes (e.g. Booking Accepted)
        // addressed to this number — there's no login/session for plain customers
        // to key that lookup on otherwise.
        AsyncStorage.setItem('customerPhone', String(number)).catch(() => {});
      }

      const serviceNames = Array.isArray(selectedService)
        ? selectedService.map(String)
        : [String(selectedService)].filter(Boolean);

      if (serviceNames.length === 0) {
        Alert.alert('Error', 'No valid service selected');
        setIsSubmitting(false);
        return;
      }

      const photoUrls = photos ? JSON.parse(String(photos)) : [];

      const booking = {
        'Full name': name,
        'Phone': number,
        'City': selectedCity,
        'Area': selectedArea,
        'Priority': selectedPriority,
        'Select Shift': selectedShift,
        'Work Description': message,
        'Budget': selectedBudget,
        'Starting Date': formatDate(date),
        ...(endDate ? { 'Service Completion Date': formatDate(endDate) } : {}),
        // Bookings start unconfirmed — HomeSewa staff must review and confirm
        // before professionals are notified (see BookingHistory/BookingDetails_2).
        'Status': 'Pending Confirmation',
        'Photos': photoUrls,
        service_names: serviceNames,
      };

      // Check if this customer's phone is blocked by admin
      const { data: blocked } = await supabase
        .from('blocked_customers')
        .select('phone')
        .eq('phone', String(number))
        .maybeSingle();
      if (blocked) {
        Alert.alert('Account Restricted', 'Your account has been restricted. Please contact HomeSewa support.');
        setIsSubmitting(false);
        return;
      }

      await createBooking(booking);

      // Professionals are notified only after an Admin/Super Admin confirms
      // this booking (BookingDetails_2's "Confirm & Notify Professionals").

      router.push('/booking/BookingVerify');
    } catch (error: any) {
      Alert.alert('Submission Failed', error.message || 'An error occurred while processing your request.');
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
            Booking request received. Awaiting confirmation!
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
