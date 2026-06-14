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
import { useFocusEffect } from '@react-navigation/native';
import { createBooking } from '../../../../api/PostApiBooking';
import { notifyProfessionals } from '../../../../api/notifications';
import { heightPercentageToDP as hp } from 'react-native-responsive-screen';
import base from '../../../../api/airtable';
import { router, useLocalSearchParams } from 'expo-router';
import Header2 from '@/components/Header2';

// ONESIGNAL SDK IMPORT
import { OneSignal } from 'react-native-onesignal';

const { width, height } = Dimensions.get('window');

const scaleFont = (size: number) => {
  const guidelineBaseWidth = 375;
  return (size * width) / guidelineBaseWidth;
};

export default function BookingOtp() {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const inputRefs = useRef<Array<TextInput | null>>([]);
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
  } = useLocalSearchParams();

  useFocusEffect(
    React.useCallback(() => {
      setOtp(['', '', '', '', '', '']);
    }, []),
  );

  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const formatDate = (date: any) => {
    return new Date(date).toISOString().split('T')[0];
  };

  // PLACEHOLDER: Handle resend via your own custom API if needed
  const handleResendCode = async () => {
    if (!number) return;
    Alert.alert('Resend', 'Resend functionality needs to be linked to your custom SMS gateway.');
  };

  const handleNavigate = async () => {
    const enteredOtp = otp.join('');

    if (isSubmitting) return;

    if (enteredOtp.length < 6) {
      Alert.alert('Validation Error', 'Please enter the complete 6-digit verification code.');
      return;
    }

    setIsSubmitting(true);

    try {
      // ==========================================
      // ONESIGNAL USER CREATION & TAGGING
      // ==========================================
      if (number) {
        try {
          // Identify/Create the user in OneSignal using phone number as external ID
          OneSignal.login(String(number));

          // Add targeted tags
          OneSignal.User.addTags({
            role: 'user',
            phone: String(number),
          });

          console.log("OneSignal user registered and tagged successfully.");
        } catch (oneSignalError) {
          console.log("OneSignal integration error:", oneSignalError);
        }
      }

      // ==========================================
      // DATABASE POST PROCESSING (AIRTABLE)
      // ==========================================
      const serviceRecords = await base("Services").select().all();

      const serviceMap = serviceRecords.map((rec: any) => ({
        id: rec.id,
        name: rec.fields.Name,
      }));

      const serviceIds = Array.isArray(selectedService)
        ? selectedService
            .map((name: string) => serviceMap.find((s: any) => s.name === name)?.id)
            .filter(Boolean)
        : [serviceMap.find((s: any) => s.name === selectedService)?.id].filter(Boolean);

      if (serviceIds.length === 0) {
        Alert.alert("Error", "No valid service selected");
        setIsSubmitting(false);
        return;
      }

      const booking = {
        "Full name": name,
        "Phone": number,
        "Select Services": serviceIds,
        "Area": selectedArea,
        "Priority": selectedPriority,
        "Select Shift": selectedShift,
        "Work Description": message,
        "Budget": selectedBudget,
        "Starting Date": formatDate(date),
        "Status": "New / Open"
      };

      await createBooking(booking);

      try {
        const targetService = Array.isArray(selectedService) ? selectedService[0] : selectedService;
        const targetArea = Array.isArray(selectedArea) ? selectedArea[0] : selectedArea;
        console.log(`Sending notification matching service: ${targetService} and area: ${targetArea}`);

        await notifyProfessionals(
          String(targetService).trim(),
          String(targetArea).trim()
        );
      } catch (e) {
        console.log("Notification background delivery failed contextually", e);
      }

      router.push('/booking/BookingVerify');

    } catch (error: any) {
      console.log("BOOKING ERROR:", error);
      Alert.alert('Submission Failed', error.message || 'An error occurred while processing your request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={{ flex: 1 }} >
      <Header2 />
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} >
        <View style={styles.container}>
          <Text style={styles.thankYouText}>
            Phone Verification
          </Text>

          <Text style={styles.bookingText}>
            Booking request received. Awaiting confirmation!
          </Text>

          <Text style={styles.otpPromptText}>Enter your verification code below.</Text>

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
    </View >
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: '5%', paddingTop: height * 0.09, alignItems: 'center', backgroundColor: '#fff' },
  thankYouText: { fontSize: scaleFont(27), fontWeight: '700' },
  bookingText: { width: '70%', textAlign: 'center', marginBottom: height * 0.08, fontSize: scaleFont(17), marginTop: height * 0.03, fontWeight: '500', lineHeight: 23 },
  otpPromptText: { fontSize: scaleFont(16.5), marginBottom: height * 0.04, fontWeight: '400', color: 'green' },
  otpBox: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 3 },
  input: { width: width * 0.12, height: width * 0.12, marginHorizontal: 5, borderWidth: 1, borderColor: 'hsl(0, 0%, 79%)', borderRadius: 5, textAlign: 'center', fontSize: scaleFont(18), backgroundColor: '#fff', elevation: 3 },
  resendcode: { marginTop: 25, paddingHorizontal: 20, textAlign: 'center', lineHeight: 22, fontSize: hp('1.5%') },
  submitButton: { backgroundColor: 'green', height: height * 0.05, width: '80%', justifyContent: 'center', alignItems: 'center', borderRadius: 100, marginTop: height * 0.08 },
  submitButtonText: { fontSize: scaleFont(17), color: '#fff', fontWeight: '300' },
});