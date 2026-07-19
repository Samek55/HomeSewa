import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import Header3 from '@/components/Header3drawer';
import {
  FavoriteProfessional,
  listFavorites,
  listCompletedProfessionals,
  addFavorite,
  removeFavorite,
} from '@/api/favorites';
import LoyaltyBadge from '@/components/bookings/LoyaltyBadge';
import { useTheme } from '@/context/ThemeContext';
import type { ThemeColors } from '@/theme/colors';

export default function FavoritesScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [loading, setLoading] = useState(true);
  const [hasCustomer, setHasCustomer] = useState(false);
  const [customerPhone, setCustomerPhone] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<FavoriteProfessional[]>([]);
  const [others, setOthers] = useState<FavoriteProfessional[]>([]);
  const [busyPhone, setBusyPhone] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const customerPhone = await AsyncStorage.getItem('customerPhone');
      if (!customerPhone) {
        setHasCustomer(false);
        return;
      }
      setHasCustomer(true);
      setCustomerPhone(customerPhone);

      const [favs, completed] = await Promise.all([
        listFavorites(customerPhone),
        listCompletedProfessionals(customerPhone),
      ]);
      const favPhones = new Set(favs.map(f => f.phone));
      setFavorites(favs);
      setOthers(completed.filter(p => !favPhones.has(p.phone)));
    } catch (err) {
      console.log('Favorites load error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleAdd = async (professional: FavoriteProfessional) => {
    const customerPhone = await AsyncStorage.getItem('customerPhone');
    if (!customerPhone) return;
    setBusyPhone(professional.phone);
    try {
      await addFavorite(customerPhone, professional.phone);
      setOthers(prev => prev.filter(p => p.phone !== professional.phone));
      setFavorites(prev => [...prev, professional]);
    } catch (err) {
      console.log('Add favorite error:', err);
    } finally {
      setBusyPhone(null);
    }
  };

  const handleRemove = async (professional: FavoriteProfessional) => {
    const customerPhone = await AsyncStorage.getItem('customerPhone');
    if (!customerPhone) return;
    setBusyPhone(professional.phone);
    try {
      await removeFavorite(customerPhone, professional.phone);
      setFavorites(prev => prev.filter(p => p.phone !== professional.phone));
      setOthers(prev => [...prev, professional]);
    } catch (err) {
      console.log('Remove favorite error:', err);
    } finally {
      setBusyPhone(null);
    }
  };

  const renderCard = (professional: FavoriteProfessional, isFavorite: boolean) => (
    <View key={professional.phone} style={styles.card}>
      <View style={styles.cardInfo}>
        <Text style={styles.cardName}>{professional.fullName || 'HomeSewa Professional'}</Text>
        {professional.services.length > 0 && (
          <Text style={styles.cardServices} numberOfLines={1}>{professional.services.join(', ')}</Text>
        )}
      </View>
      <TouchableOpacity
        onPress={() => (isFavorite ? handleRemove(professional) : handleAdd(professional))}
        disabled={busyPhone === professional.phone}
        style={styles.heartButton}
      >
        {busyPhone === professional.phone ? (
          <ActivityIndicator size="small" color={colors.brand} />
        ) : (
          <Ionicons name={isFavorite ? 'heart' : 'heart-outline'} size={22} color={colors.brand} />
        )}
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.screen}>
      <Header3 goHome />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        <View style={styles.hero}>
          <Text style={styles.heroTitle}>Favorites</Text>
          <Text style={styles.heroSub}>Professionals you'd like to book again</Text>
        </View>

        {loading ? (
          <ActivityIndicator style={{ marginTop: hp('4%') }} color={colors.brand} />
        ) : !hasCustomer ? (
          <View style={styles.emptyState}>
            <Ionicons name="heart-outline" size={40} color={colors.textMuted} />
            <Text style={styles.emptyText}>Book a service to see your professionals here.</Text>
          </View>
        ) : (
          <>
            {customerPhone && <LoyaltyBadge customerPhone={customerPhone} />}

            <Text style={styles.sectionLabel}>My Favorites</Text>
            {favorites.length === 0 ? (
              <Text style={styles.emptySection}>No favorites yet.</Text>
            ) : (
              <View style={styles.list}>{favorites.map(p => renderCard(p, true))}</View>
            )}

            <Text style={styles.sectionLabel}>People Who've Worked For You</Text>
            {others.length === 0 ? (
              <Text style={styles.emptySection}>No completed bookings yet.</Text>
            ) : (
              <View style={styles.list}>{others.map(p => renderCard(p, false))}</View>
            )}
          </>
        )}

      </ScrollView>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  scrollContent: { paddingBottom: hp('5%') },
  hero: {
    backgroundColor: colors.background,
    paddingHorizontal: wp('6%'),
    paddingTop: hp('3%'),
    paddingBottom: hp('1.5%'),
  },
  heroTitle: { fontSize: wp('6%'), fontWeight: '800', color: colors.textPrimary },
  heroSub: { fontSize: wp('3.5%'), color: colors.textSecondary, marginTop: 4 },
  sectionLabel: {
    fontSize: wp('3.5%'),
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: wp('6%'),
    marginTop: hp('2%'),
    marginBottom: hp('1%'),
  },
  emptySection: {
    paddingHorizontal: wp('6%'),
    fontSize: wp('3.5%'),
    color: colors.textMuted,
  },
  list: {
    paddingHorizontal: wp('6%'),
    gap: hp('1.2%'),
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: 14,
    paddingVertical: hp('1.5%'),
    paddingHorizontal: wp('4%'),
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  cardInfo: { flex: 1, paddingRight: wp('3%') },
  cardName: { fontSize: wp('3.8%'), fontWeight: '700', color: colors.textPrimary },
  cardServices: { fontSize: wp('3.2%'), color: colors.textSecondary, marginTop: 2 },
  heartButton: { padding: 6 },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: hp('8%'),
    paddingHorizontal: wp('10%'),
  },
  emptyText: {
    fontSize: wp('3.6%'),
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: hp('1.5%'),
  },
});
