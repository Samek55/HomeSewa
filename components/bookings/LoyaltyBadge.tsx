import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { getLoyaltyStatus, LoyaltyStatus, LoyaltyTier } from '@/api/loyalty';
import { useTheme } from '@/context/ThemeContext';
import type { ThemeColors } from '@/theme/colors';

const TIER_COLOR: Record<LoyaltyTier, string> = {
  Bronze: '#CD7F32',
  Silver: '#9CA3AF',
  Gold: '#F5A623',
};

type Props = { customerPhone: string };

export default function LoyaltyBadge({ customerPhone }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [status, setStatus] = useState<LoyaltyStatus | null>(null);

  useEffect(() => {
    let cancelled = false;
    getLoyaltyStatus(customerPhone)
      .then(s => { if (!cancelled) setStatus(s); })
      .catch(err => console.log('LoyaltyBadge load error:', err));
    return () => { cancelled = true; };
  }, [customerPhone]);

  if (!status) return null;

  const color = TIER_COLOR[status.tier];

  return (
    <View style={styles.card}>
      <View style={[styles.iconWrap, { backgroundColor: `${color}22` }]}>
        <Ionicons name="medal" size={26} color={color} />
      </View>
      <View style={styles.info}>
        <Text style={[styles.tierName, { color }]}>{status.tier} Member</Text>
        <Text style={styles.points}>{status.points} points · {status.completedBookings} completed booking{status.completedBookings !== 1 ? 's' : ''}</Text>
        {status.nextTier && status.bookingsToNextTier != null && (
          <Text style={styles.hint}>{status.bookingsToNextTier} more booking{status.bookingsToNextTier !== 1 ? 's' : ''} to {status.nextTier}</Text>
        )}
      </View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: wp('4%'),
    marginHorizontal: wp('6%'),
    marginBottom: hp('1.5%'),
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: wp('3.5%'),
  },
  info: { flex: 1 },
  tierName: { fontSize: wp('4%'), fontWeight: '800' },
  points: { fontSize: wp('3.2%'), color: colors.textSecondary, marginTop: 2 },
  hint: { fontSize: wp('3%'), color: colors.textMuted, marginTop: 2 },
});
