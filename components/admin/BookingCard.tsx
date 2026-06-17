import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import ResearchIcon from '../../assets/icons/admin/research.png'

import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';

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
};

const getStatusType = (status: string) => {
  const s = status?.toLowerCase() || '';

  if (s.includes('completed')) return 'Completed';
  if (s.includes('pending')) return 'Pending';
  if (s.includes('cancel')) return 'Cancelled';

  return 'Other';
};

const BookingCard = ({ item, isOpen, onToggle, onPress }: Props) => {
  const statusType = getStatusType(item.status);
  return (
    <View style={styles.card}>

      {/* HEADER */}
      <View style={styles.cardHeader}>

        {/* LEFT SIDE */}
        <View style={styles.leftSection}>
          <Text style={styles.name}>{item.fullName}</Text>
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
          <Text style={styles.dateTop}>  {item.bookingDate
            ? new Date(item.bookingDate).toDateString()
            : ''}</Text>

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

      

      <View style={{ borderBottomWidth: 1, borderColor: '#295C59', marginVertical: hp('1.5%') }} />
    </View >
  );
};

export default React.memo(BookingCard);

const styles = StyleSheet.create({
  card: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 12,

    borderColor: '#E5E5E5',
    paddingHorizontal: hp('4%'),

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
    color: '#444',
    paddingTop: hp('1%'),
    fontStyle: 'italic'

  },

  name: {
    fontSize: hp('2%'),
    fontWeight: '700',
  },

  service: {
    marginTop: hp('0.3%'),
    fontSize: hp('1.5%'),
    color: '#555',
  },
  budget: {
    fontSize: hp('1.6%'),
    color: '#555',
    marginTop: hp('0.5%')
  },

  infoContainer: {
    marginTop: 3,
  },

  infoText: {
    fontSize: hp('1.4%'),
    color: '#444',
  },

  status: {
    fontWeight: '700',
    fontSize: hp('1.6%')
  },

  completed: { color: 'green' },
  pending: { color: '#E8A317' },
  cancelled: { color: 'red' },

  actionButton: {
    flexDirection: 'row',      // ✅ key fix
    alignItems: 'center',      // ✅ vertical alignment
    paddingHorizontal: 20,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
    marginBottom: hp('0.5%'),
    backgroundColor: '#295C59'                 // ✅ space between text & icon
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
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    width: '50%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 8,

    borderWidth: 1,
    borderColor: '#F0F0F0',

    overflow: 'hidden',
    minWidth: wp('35%'),
    zIndex: 99999,
  },
  dropdownItem: {
    paddingVertical: hp('1.2%'),
    paddingHorizontal: wp('4%'),

    flexDirection: 'row',
    alignItems: 'center',

    backgroundColor: '#eaeaea',
  },

  dropdownText: {
    fontSize: hp('1.4%'),
    width: '100%',
    textAlign: 'center',
    fontWeight: '500',
    textDecorationLine: 'underline'
  },
});