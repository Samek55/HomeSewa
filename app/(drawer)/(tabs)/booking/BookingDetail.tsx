import { router, useLocalSearchParams } from "expo-router";
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { LinearGradient } from 'expo-linear-gradient';
import Header2 from '@/components/Header2';
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';
import { useState } from "react";
import SubmitOverlay from "@/components/bookings/SubmitOverlay";

// 1. IMPORT MODULAR FIREBASE AUTH METHODS
import { getAuth, signInWithPhoneNumber } from '@react-native-firebase/auth';

// 2. EXPORT THE MEMORY HOLDER VARIABLE FOR SCREEN ORCHESTRATION
export let globalBookingFirebaseConfirmation: any = null;

const { width, height } = Dimensions.get('window');

const Row = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.row}>
    <Text style={styles.rowLabel}>{label}</Text>
    <Text style={styles.rowValue}>{value}</Text>
  </View>
);

export default function BookingDetails() {
  const [overlayVisible, setOverlayVisible] = useState(false);
  const [overlayStatus, setOverlayStatus] = useState<'loading' | 'success'>('loading');
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

  const formattedDate = (() => {
    if (!date) return '';
    const d = new Date(date as string);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  })();

  const handleSubmit = async () => {
    // Aggressively clean string to extract pure digits
    const cleanNumber = String(number || '').replace(/[^0-9]/g, '');

    if (cleanNumber.length !== 10) {
      Alert.alert('Validation Error', 'The associated phone number must be exactly 10 digits.');
      return;
    }

    try {
      setOverlayStatus('loading');
      setOverlayVisible(true);

      const formattedPhone = '+977' + cleanNumber;
      console.log("Initializing Firebase SMS to:", formattedPhone);

      // 3. EXECUTE THE MODULAR API CHALLENGE SIGN-IN
      const authInstance = getAuth();
      const confirmation = await signInWithPhoneNumber(authInstance, formattedPhone);
      
      // Save verification session
      globalBookingFirebaseConfirmation = confirmation;

      setOverlayVisible(false);

      router.push({
        pathname: '/booking/BookingOtp',
        params: {
          name,
          number: cleanNumber, // pass down clean string safely
          selectedService,
          selectedShift,
          selectedArea,
          selectedPriority,
          selectedBudget,
          message,
          date,
        },
      });

    } catch (error: any) {
      setOverlayVisible(false);
      console.log("FIREBASE BOOKING SMS ERROR:", error);
      Alert.alert('SMS Dispatch Error', error.message || 'Something went wrong while sending the code.');
    }
  };

  return (
    <View style={styles.screen}>
      <Header2 />
      <SubmitOverlay
        visible={overlayVisible}
        status={overlayStatus}
        onClose={() => setOverlayVisible(false)}
        onClear={() => setOverlayVisible(false)}
      />
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.titleArea}>
          <Text style={styles.title}>Booking Summary</Text>
          <Text style={styles.subtitle}>
            Review your details before confirming
          </Text>
        </View>

        <View style={styles.card}>
          <Row label="Full Name" value={name as string} />
          <View style={styles.divider} />
          <Row label="Phone Number" value={number as string} />
          <View style={styles.divider} />
          <Row label="Service" value={selectedService as string} />
          <View style={styles.divider} />
          <Row label="Date" value={formattedDate} />
          <View style={styles.divider} />
          <Row label="Preferred Time" value={selectedShift as string} />
          <View style={styles.divider} />
          <Row label="Location" value={selectedArea as string} />
          <View style={styles.divider} />
          <Row label="Priority" value={selectedPriority as string} />
          <View style={styles.divider} />
          <Row label="Budget" value={selectedBudget as string} />
          {message ? (
            <>
              <View style={styles.divider} />
              <View style={styles.messageBlock}>
                <Text style={styles.rowLabel}>Message</Text>
                <Text style={styles.messageText}>{message}</Text>
              </View>
            </>
          ) : null}
        </View>

        <TouchableOpacity onPress={handleSubmit} activeOpacity={0.85}>
          <LinearGradient
            colors={['#1E4542', '#295C59', '#3D7A76']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.confirmBtn}
          >
            <Text style={styles.confirmBtnText}>Confirm Booking</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.replace('/Book')}
          activeOpacity={0.7}
        >
          <Text style={styles.backBtnText}>Edit Booking</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#295C59' },
  container: { paddingHorizontal: width * 0.05, paddingBottom: hp('6%') },
  titleArea: { paddingTop: hp('3%'), paddingBottom: hp('2%'), paddingHorizontal: 4 },
  title: { fontSize: width * 0.065, fontWeight: '800', color: '#fff', marginBottom: 5, letterSpacing: 0.2 },
  subtitle: { fontSize: width * 0.033, color: 'rgba(255,255,255,0.70)', fontWeight: '400' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: wp('5%'),
    paddingVertical: 4,
    elevation: 12,
    shadowColor: '#1E4542',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    marginBottom: hp('3%'),
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: hp('1.8%') },
  rowLabel: { fontSize: wp('3.4%'), color: '#9BBAB8', fontWeight: '500', flex: 1 },
  rowValue: { fontSize: wp('3.5%'), color: '#1C2B2A', fontWeight: '700', flex: 1.6, textAlign: 'right' },
  messageBlock: { paddingVertical: hp('1.8%'), gap: 6 },
  messageText: { fontSize: wp('3.5%'), color: '#5A7270', fontWeight: '500', lineHeight: 20 },
  divider: { height: 1, backgroundColor: '#F0F7F6' },
  confirmBtn: { height: hp('6.5%'), borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: hp('1.8%') },
  confirmBtnText: { color: '#fff', fontSize: wp('4.2%'), fontWeight: '700', letterSpacing: 0.5 },
  backBtn: { height: hp('6.5%'), borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.40)' },
  backBtnText: { color: 'rgba(255,255,255,0.85)', fontSize: wp('4.2%'), fontWeight: '600' },
});