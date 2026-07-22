import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import Header3 from '@/components/Header3drawer';
import StarRating from '@/components/bookings/StarRating';
import TextArea from '@/components/bookings/TextArea';
import { fetchBookings } from '@/api/helper/fetchBookingData';
import { fetchWorkforceByPhones } from '@/api/favorites';
import { getBookingRatings, submitRating, BookingRating } from '@/api/ratings';
import { maybePromptReview } from '@/src/utils/storeReview';
import { useTheme } from '@/context/ThemeContext';
import type { ThemeColors } from '@/theme/colors';

export default function RateProfessionalScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<any>(null);
  const [professionalName, setProfessionalName] = useState('HomeSewa Professional');
  const [existingRating, setExistingRating] = useState<BookingRating | null>(null);
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const bookings = await fetchBookings();
      const found = bookings.find((b: any) => b.id === id);
      setBooking(found || null);

      if (found?.acceptedByPhone) {
        const [professionals, ratings] = await Promise.all([
          fetchWorkforceByPhones([found.acceptedByPhone]),
          getBookingRatings(found.id),
        ]);
        if (professionals[0]?.fullName) setProfessionalName(professionals[0].fullName);
        setExistingRating(ratings.customer);
      }
    } catch (err) {
      console.log('RateProfessional load error:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleSubmit = async () => {
    if (!booking || stars === 0 || submitting) return;
    setSubmitting(true);
    try {
      await submitRating(booking.id, 'customer', booking.phone, booking.acceptedByPhone, stars, comment);
      setExistingRating({
        id: 0,
        booking_id: booking.id,
        rater_role: 'customer',
        rater_phone: booking.phone,
        rated_phone: booking.acceptedByPhone,
        rating: stars,
        comment: comment || null,
        created_at: new Date().toISOString(),
      });
      maybePromptReview();
    } catch (err: any) {
      console.log('Submit rating error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const renderContent = () => {
    if (loading) return <ActivityIndicator style={{ marginTop: hp('6%') }} color={colors.brand} />;

    if (!booking) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="alert-circle-outline" size={40} color={colors.textMuted} />
          <Text style={styles.emptyText}>Booking not found.</Text>
        </View>
      );
    }

    if ((booking.status || '').toLowerCase() !== 'completed' || !booking.acceptedByPhone) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="time-outline" size={40} color={colors.textMuted} />
          <Text style={styles.emptyText}>This booking isn&apos;t ready to be rated yet.</Text>
        </View>
      );
    }

    if (existingRating) {
      return (
        <View style={styles.card}>
          <Text style={styles.thankYou}>Thanks for your feedback!</Text>
          <Text style={styles.cardLabel}>You rated {professionalName}</Text>
          <StarRating value={existingRating.rating} readOnly size={32} />
          {existingRating.comment ? <Text style={styles.commentText}>{existingRating.comment}</Text> : null}
        </View>
      );
    }

    return (
      <View style={styles.card}>
        <Text style={styles.cardLabel}>How was your experience with</Text>
        <Text style={styles.professionalName}>{professionalName}?</Text>
        <StarRating value={stars} onChange={setStars} size={36} />
        <TextArea
          value={comment}
          onChangeText={setComment}
          placeholder="Add a comment (optional)"
          minHeight={80}
        />
        <TouchableOpacity
          style={[styles.submitBtn, (stars === 0 || submitting) && { opacity: 0.5 }]}
          onPress={handleSubmit}
          disabled={stars === 0 || submitting}
        >
          {submitting
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.submitText}>Submit Rating</Text>
          }
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.screen}>
      <Header3 goHome />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>Rate Your Professional</Text>
        </View>
        {renderContent()}
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  scrollContent: { paddingBottom: hp('5%') },
  hero: {
    paddingHorizontal: wp('6%'),
    paddingTop: hp('3%'),
    paddingBottom: hp('1.5%'),
  },
  heroTitle: { fontSize: wp('6%'), fontWeight: '800', color: colors.textPrimary },
  card: {
    marginHorizontal: wp('6%'),
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: wp('5%'),
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  cardLabel: { fontSize: wp('3.6%'), color: colors.textSecondary, marginBottom: 2 },
  professionalName: { fontSize: wp('4.6%'), fontWeight: '800', color: colors.textPrimary, marginBottom: hp('1.5%') },
  thankYou: { fontSize: wp('4.2%'), fontWeight: '800', color: colors.brand, marginBottom: hp('1%') },
  commentText: { fontSize: wp('3.6%'), color: colors.textPrimary, marginTop: hp('1%') },
  submitBtn: {
    backgroundColor: colors.brand,
    height: hp('6.5%'),
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: hp('0.5%'),
  },
  submitText: { color: '#fff', fontWeight: '700', fontSize: wp('4%') },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: hp('8%'),
    paddingHorizontal: wp('10%'),
  },
  emptyText: { fontSize: wp('3.6%'), color: colors.textSecondary, textAlign: 'center', marginTop: hp('1.5%') },
});
