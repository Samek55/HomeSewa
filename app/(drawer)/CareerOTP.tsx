import {
  View, Text, StyleSheet, TouchableOpacity,
  Alert, Dimensions, TouchableWithoutFeedback, Keyboard,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import React, { useEffect, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { router, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createCareer } from '@/api/PostApiCareer';
import { notifyAdminNewProfessional } from '@/api/notifications';
import SubmitOverlay from '@/components/bookings/SubmitOverlay';
import OtpInput from '@/components/bookings/OtpInput';
import Header3 from '@/components/Header3drawer';
import { heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { invokeEdgeFunction } from '@/api/functionsClient';
import { useTheme } from '@/context/ThemeContext';
import type { ThemeColors } from '@/theme/colors';
import { useResendCooldown } from '@/src/utils/useResendCooldown';

const { width, height } = Dimensions.get('window');
const scaleFont = (size: number) => (size * width) / 375;

interface SendOtpResponse { success: boolean; message?: string; waitSeconds?: number }
interface VerifyOtpResponse { verified: boolean; message?: string }

export default function CareerOTP() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { phone, name } = useLocalSearchParams<{ phone: string; name?: string }>();
  const [otp, setOtp] = useState(['', '', '', '']);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [overlayVisible, setOverlayVisible] = useState(false);
  const [overlayStatus, setOverlayStatus] = useState<'loading' | 'success'>('loading');
  const resendCooldown = useResendCooldown();

  const sendOtp = async () => {
    if (!resendCooldown.canResend) return;
    resendCooldown.start();
    try {
      const result = await invokeEdgeFunction<SendOtpResponse>(
        'send-otp',
        { phone: String(phone), purpose: 'career', name: String(name || '') },
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

  useEffect(() => { sendOtp(); }, []);

  useFocusEffect(React.useCallback(() => { setOtp(['', '', '', '']); }, []));

  const handleVerify = async () => {
    const entered = otp.join('');
    if (entered.length < 4) {
      Alert.alert('Validation Error', 'Please enter the complete 4-digit code.');
      return;
    }
    if (isSubmitting) return;
    setIsSubmitting(true);
    setOverlayStatus('loading');
    setOverlayVisible(true);

    try {
      const verifyResult = await invokeEdgeFunction<VerifyOtpResponse>(
        'verify-otp',
        { phone: String(phone), purpose: 'career', code: entered },
        'Could not verify the code. Please try again.'
      );
      if (!verifyResult.verified) {
        setOverlayVisible(false);
        Alert.alert('Invalid Code', verifyResult.message || 'The code you entered is incorrect. Please try again.');
        setIsSubmitting(false);
        return;
      }

      const stored = await AsyncStorage.getItem('pendingCareerData');
      if (!stored) throw new Error('Form data not found. Please go back and try again.');
      const careerData = JSON.parse(stored);
      await createCareer(careerData);
      await AsyncStorage.removeItem('pendingCareerData');

      // Send "application received, pending approval" SMS — login details come only after admin approves
      const firstName = String(careerData['Full Name'] || '').split(' ')[0] || 'Professional';
      const cleanPhone = String(careerData['Phone'] || '').replace(/\D/g, '').slice(-10);
      const pendingText =
        `Dear ${firstName}, your HomeSewa Professional application has been received successfully!\n\nYour application is currently under review. You will receive your login details via SMS once our team approves your profile.\n\nThank You for choosing HomeSewa\n( www.homesewa.app )`;
      invokeEdgeFunction('send-sms', { phone: cleanPhone, text: pendingText }, 'Could not send SMS').catch(() => {});

      // Notify super admin to review the new application
      const positions = Array.isArray(careerData['Your Expertise']) ? careerData['Your Expertise'] : [];
      notifyAdminNewProfessional(careerData['Full Name'] || firstName, positions).catch(() => {});

      setOverlayStatus('success');
    } catch (error: any) {
      setOverlayVisible(false);
      const alreadyRegistered = /already registered/i.test(error?.message || '');
      Alert.alert(
        alreadyRegistered ? 'Already Registered' : 'Submission Failed',
        error.message || 'Something went wrong. Please try again.',
        alreadyRegistered
          ? [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Go to Login', onPress: () => router.push('/Admin') },
            ]
          : undefined
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1, backgroundColor: colors.background }}>
      <Header3 />
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.container}>
          <Text style={styles.title}>Phone Verification</Text>
          <Text style={styles.subtitle}>
            Enter the 4-digit code sent to {phone}.
          </Text>
          <Text style={styles.prompt}>Enter your OTP to continue.</Text>

          <OtpInput value={otp} onChange={setOtp} containerStyle={styles.otpBox} boxStyle={styles.input} />

          {resendCooldown.canResend ? (
            <TouchableOpacity onPress={sendOtp}>
              <Text style={styles.resend}>
                {"Didn't get code? "}
                <Text style={{ color: colors.brand, fontWeight: 'bold' }}>Resend Code</Text>
              </Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.resend}>{`Resend code in ${resendCooldown.remaining}s`}</Text>
          )}

          <TouchableOpacity
            style={[styles.button, isSubmitting && { opacity: 0.6 }]}
            onPress={handleVerify}
            disabled={isSubmitting}
          >
            <Text style={styles.buttonText}>{isSubmitting ? 'Verifying...' : 'Submit'}</Text>
          </TouchableOpacity>
        </View>
      </TouchableWithoutFeedback>

      <SubmitOverlay
        visible={overlayVisible}
        status={overlayStatus}
        onClose={() => { setOverlayVisible(false); router.replace('/Career'); }}
        onClear={() => { setOverlayVisible(false); router.replace({ pathname: '/Career', params: { clearForm: 'true' } }); }}
      />
    </KeyboardAvoidingView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1, paddingHorizontal: '5%', paddingTop: height * 0.09, alignItems: 'center', backgroundColor: colors.background },
  title: { fontSize: scaleFont(27), fontWeight: '700', color: colors.textPrimary },
  subtitle: { width: '75%', textAlign: 'center', marginTop: height * 0.03, marginBottom: height * 0.06, fontSize: scaleFont(14), fontWeight: '400', lineHeight: 22, color: colors.textSecondary },
  prompt: { fontSize: scaleFont(16.5), marginBottom: height * 0.04, fontWeight: '400', color: colors.brand },
  otpBox: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 3 },
  input: { width: width * 0.14, height: width * 0.14, marginHorizontal: 5, borderWidth: 1, borderColor: colors.border, borderRadius: 5, textAlign: 'center', fontSize: scaleFont(20), backgroundColor: colors.surface, elevation: 3, color: colors.textPrimary },
  resend: { marginTop: 25, paddingHorizontal: 20, textAlign: 'center', lineHeight: 22, fontSize: hp('1.5%'), color: colors.textSecondary },
  button: { backgroundColor: colors.brand, height: height * 0.065, width: '60%', justifyContent: 'center', alignItems: 'center', borderRadius: 100, marginTop: height * 0.08 },
  buttonText: { fontSize: scaleFont(17), color: '#fff', fontWeight: '300' },
});
