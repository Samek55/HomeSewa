import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, usePathname } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DrawerContentComponentProps } from '@react-navigation/drawer';
import { LinearGradient } from 'expo-linear-gradient';

export default function CustomDrawer(_props: DrawerContentComponentProps) {
  const pathname = usePathname();
  const isActive = (route: string) => pathname === route;

  return (
    <SafeAreaView style={styles.wrapper} edges={['top', 'bottom']}>
      <View style={styles.card}>

        {/* PROFILE HEADER */}
        <LinearGradient colors={['#295C59', '#1E4542']} style={styles.profileHeader}>
          <View style={styles.avatarWrapper}>
            <Image
              source={require('../assets/images/homesewa.png')}
              style={styles.avatar}
            />
          </View>
          <Text style={styles.brandName}>HomeSewa</Text>
          <Text style={styles.brandTagline}>Express Home Service</Text>
          <View style={styles.tagRow}>
            <View style={styles.tag}>
              <Ionicons name="location-outline" size={11} color="#d1fae5" />
              <Text style={styles.tagText}>Nepal</Text>
            </View>
            <View style={styles.tag}>
              <Ionicons name="star-outline" size={11} color="#d1fae5" />
              <Text style={styles.tagText}>Verified</Text>
            </View>
          </View>
        </LinearGradient>

        {/* MENU */}
        <View style={styles.menu}>

          <MenuItem icon="home-outline" label="Home" active={isActive('/Home')} onPress={() => router.push('/Home')} />
          <MenuItem icon="construct-outline" label="Services" active={isActive('/Service')} onPress={() => router.push('/Service')} />
          <MenuItem icon="calendar-outline" label="Book a Service" active={isActive('/Book')} onPress={() => router.push('/Book')} />

          <View style={styles.divider} />

          <MenuItem icon="information-circle-outline" label="About Us" active={isActive('/About')} onPress={() => router.push('/About')} />
          <MenuItem icon="call-outline" label="Contact" active={isActive('/Contact')} onPress={() => router.push('/Contact')} />
          <MenuItem icon="help-circle-outline" label="FAQs" active={isActive('/FAQs')} onPress={() => router.push('/FAQs')} />
          <MenuItem icon="book-outline" label="Glossary" active={isActive('/Glossary')} onPress={() => router.push('/Glossary')} />

          <View style={styles.divider} />

          <MenuItem icon="people-outline" label="Become a Partner" active={isActive('/Partnership')} onPress={() => router.push('/Partnership')} />
          <MenuItem icon="briefcase-outline" label="Join as Professional" active={isActive('/Career')} onPress={() => router.push('/Career')} />

          <View style={styles.divider} />

          <MenuItem icon="shield-checkmark-outline" label="Admin" active={isActive('/Admin')} onPress={() => router.push('/Admin')} />

        </View>

        {/* FOOTER */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>© 2025 SRIYOG Consulting Pvt. Ltd.</Text>
          <Text style={styles.footerSub}>Kamalpokhari, Kathmandu, Nepal</Text>
        </View>

      </View>
    </SafeAreaView>
  );
}

function MenuItem({ icon, label, onPress, active }: any) {
  return (
    <TouchableOpacity
      style={[styles.item, active && styles.itemActive]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.iconBox, active && styles.iconBoxActive]}>
        <Ionicons name={icon} size={18} color={active ? '#295C59' : '#6B7280'} />
      </View>
      <Text style={[styles.label, active && styles.labelActive]}>{label}</Text>
      {active && <View style={styles.activeBar} />}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: 'transparent',
  },

  /* FLOATING CARD */
  card: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 30,
    margin: 10,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },

  /* PROFILE */
  profileHeader: {
    paddingTop: 22,
    paddingBottom: 18,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  avatarWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.6)',
    overflow: 'hidden',
    marginBottom: 8,
    backgroundColor: '#fff',
  },
  avatar: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  brandName: {
    fontSize: 19,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.3,
  },
  brandTagline: {
    fontSize: 11,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.75)',
    marginTop: 2,
    marginBottom: 8,
  },
  tagRow: {
    flexDirection: 'row',
    gap: 8,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  tagText: {
    fontSize: 10,
    color: '#d1fae5',
    fontWeight: '600',
  },

  /* MENU */
  menu: {
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 10,
  },
  divider: {
    borderTopWidth: 1,
    borderColor: '#eee',
    marginVertical: 6,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginBottom: 2,
  },
  itemActive: {
    backgroundColor: '#E8F4F3',
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: '#F0F4F3',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconBoxActive: {
    backgroundColor: '#C9E8E6',
  },
  label: {
    fontSize: 13.5,
    fontWeight: '500',
    color: '#4B5563',
    flex: 1,
  },
  labelActive: {
    color: '#295C59',
    fontWeight: '700',
  },
  activeBar: {
    width: 3,
    height: 18,
    borderRadius: 2,
    backgroundColor: '#295C59',
  },

  /* FOOTER */
  footer: {
    borderTopWidth: 1,
    borderColor: '#eee',
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 10,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  footerSub: {
    fontSize: 9,
    color: '#B0C4C2',
    marginTop: 2,
  },
});
