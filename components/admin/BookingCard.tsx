import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import ResearchIcon from '../../assets/icons/admin/research.png'

import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';
import { useTheme } from '../../context/ThemeContext';
import type { ThemeColors } from '../../theme/colors';

// export type BookingStatus = "Completed" | "Pending" | "Cancelled";

export type BookingItem = {
  id: string;
  bookingId: string;

  fullName: string;
  email: string;
  phone: string;

  city?: string;
  area?: string;

  service: string;
  shift: string;

  budget: string;
  priority: string;

  bookingDate: string;
  status: string;
};

type Props = {
  item: BookingItem;
  isOpen: boolean;
  onToggle: () => void;
  onPress: () => void;
  displayName?: string;
};

const getStatusType = (status: string) => {
  const s = status?.toLowerCase() || '';

  if (s.includes('completed')) return 'Completed';
  if (s.includes('pending')) return 'Pending';
  if (s.includes('cancel')) return 'Cancelled';

  return 'Other';
};

const BookingCard = ({ item, isOpen, onToggle, onPress, displayName }: Props) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const statusType = getStatusType(item.status);
  return (
    <View style={styles.card}>

      {/* HEADER */}
      <View style={styles.cardHeader}>

        {/* LEFT SIDE */}
        <View style={styles.leftSection}>
          <Text style={styles.name}>{displayName ?? item.fullName}</Text>
          <Text style={styles.service}>{item.service}</Text>
          <Text style={styles.budget}>{item.budget}</Text>
          {/* INFO */}
          <View style={styles.infoContainer}>
            <Text
              style={[
                styles.status,
                statusType === 'Completed' && styles.completed,
                statusType === 'Pending' && styles.pending,
                statusType === 'Cancelled' && styles.cancelled,
              ]}
            >
              {item.status}
            </Text>
          </View>
        </View>

        {/* RIGHT SIDE */}
        <View style={styles.rightSection}>
          <Text style={styles.dateTop}>  {item.bookingDate}</Text>

          <TouchableOpacity
            style={styles.actionButton}
             onPress={onPress}
          >
            <Text style={styles.actionText}>View</Text>

            <Image
              source={ResearchIcon}
              style={styles.dropdownIcon}
            />
          </TouchableOpacity>
        </View>

      </View>

      

      <View style={{ borderBottomWidth: 1, borderColor: colors.brand, marginVertical: hp('1.5%') }} />
    </View >
  );
};

export default React.memo(BookingCard);

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  card: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: 12,

    borderColor: colors.border,
    paddingHorizontal: hp('4%'),
    paddingTop: hp('1.5%'),

  },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'stretch', // ✅ IMPORTANT
    width: '100%',
  },
  leftSection: {
    flex: 2,
    justifyContent: 'space-between',
  },

  rightSection: {
    alignItems: 'flex-end',
    flex: 1,
    justifyContent: 'space-between',

  },

  dateTop: {
    fontSize: hp('1.4%'),
    color: colors.textSecondary,
    paddingTop: hp('1%'),
    fontStyle: 'italic'

  },

  name: {
    fontSize: hp('2%'),
    fontWeight: '700',
    color: colors.textPrimary,
  },

  service: {
    marginTop: hp('0.3%'),
    fontSize: hp('1.5%'),
    color: colors.textSecondary,
  },
  budget: {
    fontSize: hp('1.6%'),
    color: colors.textSecondary,
    marginTop: hp('0.5%')
  },

  infoContainer: {
    marginTop: 3,
  },

  infoText: {
    fontSize: hp('1.4%'),
    color: colors.textSecondary,
  },

  status: {
    fontWeight: '700',
    fontSize: hp('1.6%'),
    color: colors.textPrimary,
  },

  completed: { color: colors.success },
  pending: { color: colors.warning },
  cancelled: { color: colors.danger },

  actionButton: {
    flexDirection: 'row',      // ✅ key fix
    alignItems: 'center',      // ✅ vertical alignment
    paddingHorizontal: 20,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
    marginBottom: hp('0.5%'),
    backgroundColor: colors.brand                 // ✅ space between text & icon
  },
  dropdownIcon: {
    height: 18,
    width: 18,
    resizeMode: 'contain',
    tintColor: '#fff'
  },

  actionText: {
    color: '#fff',
    fontWeight: '600',
  },
  dropdown: {
    position: 'relative',
    left: hp('20%'),
    top: hp('0.5%'),
    backgroundColor: colors.surface,
    borderRadius: 14,
    width: '50%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 8,

    borderWidth: 1,
    borderColor: colors.border,

    overflow: 'hidden',
    minWidth: wp('35%'),
    zIndex: 99999,
  },
  dropdownItem: {
    paddingVertical: hp('1.2%'),
    paddingHorizontal: wp('4%'),

    flexDirection: 'row',
    alignItems: 'center',

    backgroundColor: colors.surfaceMuted,
  },

  dropdownText: {
    fontSize: hp('1.4%'),
    width: '100%',
    textAlign: 'center',
    fontWeight: '500',
    textDecorationLine: 'underline',
    color: colors.textPrimary,
  },
});