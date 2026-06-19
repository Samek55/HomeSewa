import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  Alert, Dimensions, TouchableWithoutFeedback, Keyboard,
} from 'react-native';
import React, { useEffect, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { router, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createCareer } from '@/api/PostApiCareer';
import SubmitOverlay from '@/components/bookings/SubmitOverlay';
import Header3 from '@/components/Header3drawer';
import { heightPercentageToDP as hp } from 'react-native-responsive-screen';

const { width, height } = Dimensions.get('window');
const scaleFont = (size: number) => (size * width) / 375;

const SPARROW_TOKEN = process.env.EXPO_PUBLIC_SPARROW_TOKEN!;

const generateOtp = () => String(Math.floor(1000 + Math.random() * 9000));

const sendSparrowSms = async (phone: string, text: string) => {
  const to = '977' + phone.replace(/\D/g, '').slice(-10);
  await fetch('https://api.sparrowsms.com/v2/sms/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: SPARROW_TOKEN, from: 'TheAlert', to, text }),
  });
};

const sendSparrowOtp = async (phone: string, otp: string, firstName: string) => {
  const to = '977' + phone.replace(/\D/g, '').slice(-10);
  const text = `Dear ${firstName}, Your Professional Membership OTP code is ${otp}.\n\nThank You for using HomeSewa\n( www.homesewa.app )`;
  const response = await fetch('https://api.sparrowsms.com/v2/sms/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: SPARROW_TOKEN, from: 'TheAlert', to, text }),
  });
  const data = await response.json().catch(() => ({}));
  console.log('[Sparrow CareerOTP] status:', response.status, 'body:', JSON.stringify(data));
  if (!response.ok) throw new Error(`Sparrow error ${response.status}: ${JSON.stringify(data)}`);
};

export default function CareerOTP() {
  const { phone, name } = useLocalSearchParams<{ phone: string; name?: string }>();
  const [otp, setOtp] = useState(['', '', '', '']);
  const [sentOtp, setSentOtp] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [overlayVisible, setOverlayVisible] = useState(false);
  const [overlayStatus, setOverlayStatus] = useState<'loading' | 'success'>('loading');
  const inputRefs = useRef<Array<TextInput | null>>([]);

  const sendOtp = async () => {
    const code = generateOtp();
    setSentOtp(code);
    const firstName = String(name || '').split(' ')[0] || 'Customer';
    try {
      await sendSparrowOtp(String(phone), code, firstName);
    } catch (err: any) {
      Alert.alert('SMS Error', err?.message || 'Could not send verification code. Please try again.');
    }
  };

  useEffect(() => { sendOtp(); }, []);

  useFocusEffect(React.useCallback(() => { setOtp(['', '', '', '']); }, []));

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
      Alert.alert('Validation Error', 'Please enter the complete 4-digit code.');
      return;
    }
    if (entered !== sentOtp) {
      Alert.alert('Invalid Code', 'The code you entered is incorrect. Please try again.');
      return;
    }
    if (isSubmitting) return;
    setIsSubmitting(true);
    setOverlayStatus('loading');
    setOverlayVisible(true);

    try {
      const stored = await AsyncStorage.getItem('pendingCareerData');
      if (!stored) throw new Error('Form data not found. Please go back and try again.');
      const careerData = JSON.parse(stored);
      const result = await createCareer(careerData);
      await AsyncStorage.removeItem('pendingCareerData');

      // Send welcome SMS with login credentials
      const firstName = String(careerData['Full Name'] || '').split(' ')[0] || 'Professional';
      const cleanPhone = String(careerData['Phone'] || '').replace(/\D/g, '').slice(-10);
      const welcomeText =
        `Dear ${firstName}, you have been registered as a HomeSewa Professional!\n\nYour Login Details:\nPhone: ${cleanPhone}\nPIN: ${result.pin}\n\nYou can change your PIN from the login page.\n\nThanks for using HomeSewa\n( www.homesewa.app )`;
      sendSparrowSms(cleanPhone, welcomeText).catch(() => {});

      setOverlayStatus('success');
    } catch (error: any) {
      setOverlayVisible(false);
      Alert.alert('Submission Failed', error.message || 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <Header3 />
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.container}>
          <Text style={styles.title}>Phone Verification</Text>
          <Text style={styles.subtitle}>
            Enter the 4-digit code sent to {phone}.
          </Text>
          <Text style={styles.prompt}>Enter your OTP to continue.</Text>

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
            <Text style={styles.resend}>
              {"Didn't get code? "}
              <Text style={{ color: '#295C59', fontWeight: 'bold' }}>Resend Code</Text>
            </Text>
          </TouchableOpacity>

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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: '5%', paddingTop: height * 0.09, alignItems: 'center', backgroundColor: '#fff' },
  title: { fontSize: scaleFont(27), fontWeight: '700' },
  subtitle: { width: '75%', textAlign: 'center', marginTop: height * 0.03, marginBottom: height * 0.06, fontSize: scaleFont(14), fontWeight: '400', lineHeight: 22 },
  prompt: { fontSize: scaleFont(16.5), marginBottom: height * 0.04, fontWeight: '400', color: '#295C59' },
  otpBox: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 3 },
  input: { width: width * 0.14, height: width * 0.14, marginHorizontal: 5, borderWidth: 1, borderColor: 'hsl(0, 0%, 79%)', borderRadius: 5, textAlign: 'center', fontSize: scaleFont(20), backgroundColor: '#fff', elevation: 3 },
  resend: { marginTop: 25, paddingHorizontal: 20, textAlign: 'center', lineHeight: 22, fontSize: hp('1.5%') },
  button: { backgroundColor: '#295C59', height: height * 0.065, width: '60%', justifyContent: 'center', alignItems: 'center', borderRadius: 100, marginTop: height * 0.08 },
  buttonText: { fontSize: scaleFont(17), color: '#fff', fontWeight: '300' },
});
