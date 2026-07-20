import { router, useLocalSearchParams } from "expo-router";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from "react-native";
import { LinearGradient } from 'expo-linear-gradient';
import Header2 from '@/components/Header2';
import { useMemo } from 'react';
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';
import { useTheme } from '@/context/ThemeContext';
import type { ThemeColors } from '@/theme/colors';

const { width } = Dimensions.get('window');

const Row = ({ label, value }: { label: string; value: string }) => {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
};

export default function BookingDetails() {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
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

  const fmtDate = (iso: any) => {
    if (!iso) return '';
    const d = new Date(iso as string);
    return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
  };
  const formattedDate = fmtDate(date);
  const formattedEndDate = fmtDate(endDate);

  const handleSubmit = () => {
    const cleanNumber = String(number || '').replace(/[^0-9]/g, '');
    router.push({
      pathname: '/booking/BookingOtp',
      params: {
        name,
        number: cleanNumber,
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
      },
    });
  };

  return (
    <View style={styles.screen}>
      <Header2 />
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
          <Row label="Starting Date" value={formattedDate} />
          <View style={styles.divider} />
          <Row label="Ending Date" value={formattedEndDate} />
          <View style={styles.divider} />
          <Row label="Preferred Time" value={selectedShift as string} />
          <View style={styles.divider} />
          <Row label="City" value={selectedCity as string} />
          <View style={styles.divider} />
          <Row label="Area" value={selectedArea as string} />
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

const createStyles = (colors: ThemeColors, isDark: boolean) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: isDark ? colors.background : colors.brand },
  container: { paddingHorizontal: width * 0.05, paddingBottom: hp('6%') },
  titleArea: { paddingTop: hp('3%'), paddingBottom: hp('2%'), paddingHorizontal: 4 },
  title: { fontSize: width * 0.065, fontWeight: '800', color: isDark ? colors.textPrimary : '#fff', marginBottom: 5, letterSpacing: 0.2 },
  subtitle: { fontSize: width * 0.033, color: isDark ? colors.textSecondary : 'rgba(255,255,255,0.70)', fontWeight: '400' },
  card: {
    backgroundColor: colors.surface,
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
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: hp('1%') },
  rowLabel: { fontSize: wp('3.4%'), color: colors.textMuted, fontWeight: '500', flex: 1 },
  rowValue: { fontSize: wp('3.5%'), color: colors.textPrimary, fontWeight: '700', flex: 1.6, textAlign: 'right' },
  messageBlock: { paddingVertical: hp('1.8%'), gap: 6 },
  messageText: { fontSize: wp('3.5%'), color: colors.textSecondary, fontWeight: '500', lineHeight: 20 },
  divider: { height: 1, backgroundColor: colors.divider },
  confirmBtn: { height: hp('6.5%'), borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: hp('1.8%') },
  confirmBtnText: { color: '#fff', fontSize: wp('4.2%'), fontWeight: '700', letterSpacing: 0.5 },
  backBtn: { height: hp('6.5%'), borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: isDark ? colors.border : 'rgba(255,255,255,0.40)' },
  backBtnText: { color: isDark ? colors.textSecondary : 'rgba(255,255,255,0.85)', fontSize: wp('4.2%'), fontWeight: '600' },
});