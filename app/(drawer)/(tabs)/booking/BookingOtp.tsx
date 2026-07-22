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
import { useFocusEffect } from '@react-navigation/native';
import { createBooking } from '../../../../api/PostApiBooking';
import { heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { router, useLocalSearchParams } from 'expo-router';
import Header2 from '@/components/Header2';
import { OneSignal } from 'react-native-onesignal';
import { supabase } from '../../../../lib/supabase';
import { invokeEdgeFunction } from '../../../../api/functionsClient';
import OtpInput from '@/components/bookings/OtpInput';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '@/context/ThemeContext';
import type { ThemeColors } from '@/theme/colors';
import { useResendCooldown } from '@/src/utils/useResendCooldown';

const { width, height } = Dimensions.get('window');

const scaleFont = (size: number) => (size * width) / 375;

interface SendOtpResponse { success: boolean; message?: string; waitSeconds?: number }
interface VerifyOtpResponse { verified: boolean; message?: string }

export default function BookingOtp() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [otp, setOtp] = useState(['', '', '', '']);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const resendCooldown = useResendCooldown();

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
    if (!resendCooldown.canResend) return;
    resendCooldown.start();
    try {
      const result = await invokeEdgeFunction<SendOtpResponse>(
        'send-otp',
        { phone: String(number), purpose: 'booking', name: String(name || '') },
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

  const formatDate = (d: any) => new Date(d).toISOString().split('T')[0];

  const handleNavigate = async () => {
    const enteredOtp = otp.join('');
    if (isSubmitting) return;

    if (enteredOtp.length < 4) {
      Alert.alert('Validation Error', 'Please enter the complete 4-digit verification code.');
      return;
    }

    setIsSubmitting(true);

    try {
      const verifyResult = await invokeEdgeFunction<VerifyOtpResponse>(
        'verify-otp',
        { phone: String(number), purpose: 'booking', code: enteredOtp },
        'Could not verify the code. Please try again.'
      );
      if (!verifyResult.verified) {
        Alert.alert('Invalid Code', verifyResult.message || 'The code you entered is incorrect. Please try again.');
        setIsSubmitting(false);
        return;
      }

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
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1, backgroundColor: colors.background }}>
      <Header2 />
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.container}>
          <Text style={styles.thankYouText}>Phone Verification</Text>

          <Text style={styles.bookingText}>
            Booking request received. Awaiting confirmation!
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
  container: { flex: 1, paddingHorizontal: '5%', paddingTop: height * 0.09, alignItems: 'center', backgroundColor: colors.background },
  thankYouText: { fontSize: scaleFont(27), fontWeight: '700', color: colors.textPrimary },
  bookingText: { width: '70%', textAlign: 'center', marginBottom: height * 0.08, fontSize: scaleFont(17), marginTop: height * 0.03, fontWeight: '500', lineHeight: 23, color: colors.textSecondary },
  otpPromptText: { fontSize: scaleFont(16.5), marginBottom: height * 0.04, fontWeight: '400', color: colors.brand },
  otpBox: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 3 },
  input: { width: width * 0.14, height: width * 0.14, marginHorizontal: 5, borderWidth: 1, borderColor: colors.border, borderRadius: 5, textAlign: 'center', fontSize: scaleFont(20), backgroundColor: colors.surface, color: colors.textPrimary, elevation: 3 },
  resendcode: { marginTop: 25, paddingHorizontal: 20, textAlign: 'center', lineHeight: 22, fontSize: hp('1.5%'), color: colors.textSecondary },
  submitButton: { backgroundColor: colors.brand, height: height * 0.065, width: '60%', justifyContent: 'center', alignItems: 'center', borderRadius: 100, marginTop: height * 0.08 },
  submitButtonText: { fontSize: scaleFont(17), color: '#fff', fontWeight: '300' },
});
