import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Dimensions } from 'react-native';

const { height: SCREEN_H } = Dimensions.get('window');
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
        </LinearGradient>

        {/* MENU */}
        <View style={styles.menu}>
          <MenuItem icon="home-outline" label="Home" active={isActive('/Home')} onPress={() => router.push('/Home')} />
          <MenuItem icon="construct-outline" label="Services" active={isActive('/Service')} onPress={() => router.push('/Service')} />
          <MenuItem icon="calendar-outline" label="Book a Service" active={isActive('/Book')} onPress={() => router.push('/Book')} />
          <MenuItem icon="briefcase-outline" label="Join as Professional" active={isActive('/Career')} onPress={() => router.push('/Career')} />

          <View style={styles.divider} />

          <MenuItem icon="information-circle-outline" label="About Us" active={isActive('/About')} onPress={() => router.push('/About')} />
          <MenuItem icon="call-outline" label="Contact" active={isActive('/Contact')} onPress={() => router.push('/Contact')} />
          <MenuItem icon="help-circle-outline" label="FAQs" active={isActive('/FAQs')} onPress={() => router.push('/FAQs')} />
          <MenuItem icon="book-outline" label="Glossary" active={isActive('/Glossary')} onPress={() => router.push('/Glossary')} />

          <View style={styles.divider} />

          <MenuItem icon="people-outline" label="Become a Partner" active={isActive('/Partnership')} onPress={() => router.push('/Partnership')} />
        </View>

        {/* ADMIN LOGIN — sleek, centered, pinned at bottom */}
        <View style={styles.adminWrapper}>
          <TouchableOpacity
            style={styles.adminBtn}
            onPress={() => router.push('/Admin')}
            activeOpacity={0.85}
          >
            <Ionicons name="shield-checkmark-outline" size={16} color="#fff" />
            <Text style={styles.adminBtnText}>Admin Login</Text>
          </TouchableOpacity>
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
        <Ionicons name={icon} size={22} color={active ? '#295C59' : '#6B7280'} />
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
    justifyContent: 'center',
  },

  card: {
    height: SCREEN_H * 0.88,
    backgroundColor: '#fff',
    borderRadius: 30,
    marginHorizontal: 10,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },

  profileHeader: {
    paddingTop: 14,
    paddingBottom: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  avatarWrapper: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.6)',
    overflow: 'hidden',
    marginBottom: 6,
    backgroundColor: '#fff',
  },
  avatar: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  brandName: {
    fontSize: 17,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.3,
  },
  brandTagline: {
    fontSize: 10,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.75)',
    marginTop: 2,
    marginBottom: 4,
  },

  menu: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    justifyContent: 'space-evenly',
  },
  divider: {
    borderTopWidth: 1,
    borderColor: '#eee',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 14,
  },
  itemActive: {
    backgroundColor: '#E8F4F3',
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 11,
    backgroundColor: '#F0F4F3',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
  },
  iconBoxActive: {
    backgroundColor: '#C9E8E6',
  },
  label: {
    fontSize: 15,
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
    height: 20,
    borderRadius: 2,
    backgroundColor: '#295C59',
  },

  adminWrapper: {
    alignItems: 'flex-start',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  adminBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: '#295C59',
    paddingVertical: 10,
    paddingHorizontal: 28,
    borderRadius: 20,
  },
  adminBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.3,
  },
});
