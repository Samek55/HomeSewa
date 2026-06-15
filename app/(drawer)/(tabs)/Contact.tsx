import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity, Linking, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import Header2 from '@/components/Header2';

const MAP_URL = 'https://maps.google.com/?q=27.7090,85.3221';

export default function ContactScreen() {
  const openWebsite = useCallback(() => { Linking.openURL('https://homesewa.app'); }, []);
  const handleEmailPress = useCallback(() => { Linking.openURL('mailto:homesewa@sriyog.com'); }, []);
  const handlePhonePress = useCallback(() => { Linking.openURL('tel:+97798520 24365'); }, []);
  const handleMapPress = useCallback(() => { Linking.openURL(MAP_URL); }, []);

  return (
    <View style={styles.screen}>
      <Header2 />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* HERO */}
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>Contact Us</Text>
          <Text style={styles.heroSub}>We are always here to help you out.</Text>
        </View>

        {/* MAP CARD */}
        <TouchableOpacity style={styles.mapWrapper} onPress={handleMapPress} activeOpacity={0.85}>
          <View style={styles.mapPlaceholder}>
            <View style={styles.mapPin}>
              <Ionicons name="location" size={32} color="#295C59" />
            </View>
            <Text style={styles.mapAddress}>Rem.Work, Kamalpokhari{'\n'}Kathmandu, Nepal</Text>
            <View style={styles.mapOpenBtn}>
              <Ionicons name="map-outline" size={14} color="#fff" />
              <Text style={styles.mapOpenText}>Open in Maps</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* BRAND BLOCK */}
        <View style={styles.brandBlock}>
          <Text style={styles.brandName}>HomeSewa</Text>
          <Text style={styles.brandTag}>Express Home Service</Text>
        </View>

        {/* CONTACT CARDS */}
        <View style={styles.cards}>
          <ContactCard
            icon="location-outline"
            title="Visit Us"
            value="Rem.Work, Kamalpokhari, Kathmandu, Nepal"
          />
          <ContactCard
            icon="call-outline"
            title="Call / WhatsApp"
            value="+977-98520 24 365"
            onPress={handlePhonePress}
            tappable
          />
          <ContactCard
            icon="mail-outline"
            title="Email Us"
            value="homesewa@sriyog.com"
            onPress={handleEmailPress}
            tappable
          />
          <ContactCard
            icon="globe-outline"
            title="Website"
            value="https://homesewa.app"
            onPress={openWebsite}
            tappable
          />
        </View>


      </ScrollView>
    </View>
  );
}

function ContactCard({ icon, title, value, onPress, tappable }: any) {
  const Inner = (
    <View style={styles.card}>
      <View style={styles.iconBox}>
        <Ionicons name={icon} size={20} color="#295C59" />
      </View>
      <View style={styles.cardText}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={[styles.cardValue, tappable && styles.cardValueLink]}>{value}</Text>
      </View>
      {tappable && <Ionicons name="chevron-forward" size={16} color="#C0D4D2" />}
    </View>
  );
  return tappable
    ? <TouchableOpacity onPress={onPress} activeOpacity={0.75}>{Inner}</TouchableOpacity>
    : Inner;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F5F9F8' },
  scrollContent: { paddingBottom: hp('5%') },

  hero: {
    backgroundColor: '#F5F9F8',
    paddingHorizontal: wp('6%'),
    paddingTop: hp('3%'),
    paddingBottom: hp('1.5%'),
  },
  heroTitle: { fontSize: wp('7%'), fontWeight: '800', color: '#1C2B2A', letterSpacing: 0.3 },
  heroSub: { fontSize: wp('3.5%'), color: '#5A7270', marginTop: 6 },

  mapWrapper: {
    marginHorizontal: wp('4%'),
    marginTop: hp('1%'),
    borderRadius: 16,
    overflow: 'hidden',
  },
  mapPlaceholder: {
    height: 160,
    backgroundColor: '#E8F4F3',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#C9E8E6',
  },
  mapPin: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#295C59',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  mapAddress: {
    fontSize: wp('3.4%'),
    color: '#1C2B2A',
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 20,
  },
  mapOpenBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#295C59',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 2,
  },
  mapOpenText: { fontSize: wp('3%'), color: '#fff', fontWeight: '600' },

  brandBlock: {
    paddingHorizontal: wp('5%'),
    paddingTop: hp('1%'),
    paddingBottom: hp('0.5%'),
  },
  brandName: { fontSize: wp('5%'), fontWeight: '800', color: '#1C2B2A' },
  brandTag: { fontSize: wp('3.3%'), color: '#5A7270', marginTop: 2 },

  cards: {
    paddingHorizontal: wp('4%'),
    paddingTop: hp('1.5%'),
    gap: 10,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    gap: 14,
    borderWidth: 1,
    borderColor: '#E0ECEB',
    elevation: 1,
    shadowColor: '#295C59',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#E8F4F3',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardText: { flex: 1 },
  cardTitle: { fontSize: wp('3.2%'), fontWeight: '600', color: '#5A7270', marginBottom: 2 },
  cardValue: { fontSize: wp('3.7%'), fontWeight: '600', color: '#1C2B2A' },
  cardValueLink: { color: '#295C59' },

  hoursCard: {
    marginHorizontal: wp('4%'),
    marginTop: hp('1.5%'),
    backgroundColor: '#E8F4F3',
    borderRadius: 14,
    padding: 16,
  },
  hoursHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  hoursTitle: { fontSize: wp('3.8%'), fontWeight: '700', color: '#295C59' },
  hoursValue: { fontSize: wp('3.7%'), fontWeight: '600', color: '#1C2B2A' },
  hoursNote: { fontSize: wp('3%'), color: '#5A7270', marginTop: 3 },
});
