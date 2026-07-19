import { useMemo } from 'react';
import { TouchableOpacity, StyleSheet, View, Image, Text, StatusBar, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { DrawerActions } from '@react-navigation/native';
import { router } from 'expo-router';
import { useTheme } from '../context/ThemeContext';
import type { ThemeColors } from '../theme/colors';

const WHATSAPP_URL = "https://api.whatsapp.com/send?phone=9779852024365&text=Hello,%20I'm%20looking%20for%20Home%20Service.%20(%20HomeSewa%20App%20)%20Thank%20You";

export default function Header3({ goHome = false }: { goHome?: boolean }) {
  const navigation = useNavigation<any>();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const iconColor = isDark ? colors.brand : '#fff';

  return (
    <>
      {/* Edge-to-edge is disabled (see gradle.properties / styles.xml), so the OS
          reserves its own space for the status bar — the header no longer needs to
          calculate/pad for it, it just renders as a normal block below it. Light mode
          keeps the original fixed brand-teal look untouched; only dark mode switches
          to the tab-bar-style surface theming, so the bar itself stays dark either
          way and status bar icons can stay light-content in both. */}
      <StatusBar barStyle="light-content" backgroundColor={isDark ? colors.surface : '#295C59'} />
      <View style={styles.wrapper}>

        {/* LEFT: BACK ARROW + LOGO + BRAND */}
        <TouchableOpacity
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          onPress={() => goHome ? router.replace('/Home') : (router.canGoBack() ? router.back() : router.replace('/Home'))}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={26} color={iconColor} />
        </TouchableOpacity>

        <View style={styles.left}>
          <View style={styles.logoWrapper}>
            <Image
              source={require('../assets/images/homesewa.png')}
              style={styles.logo}
            />
          </View>
          <Text style={styles.brandBold}>HomeSewa</Text>
        </View>

        {/* RIGHT: WHATSAPP + MENU */}
        <View style={styles.right}>
          <TouchableOpacity
            style={styles.whatsappBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            onPress={() => Linking.openURL(WHATSAPP_URL)}
          >
            <Ionicons name="logo-whatsapp" size={26} color={iconColor} />
          </TouchableOpacity>

          <TouchableOpacity
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            onPress={() =>
              navigation.dispatch(DrawerActions.openDrawer())
            }
          >
            <Ionicons name="menu" size={30} color={iconColor} />
          </TouchableOpacity>
        </View>

      </View>
    </>
  );
}

const createStyles = (colors: ThemeColors, isDark: boolean) => StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: isDark ? colors.surface : '#295C59',
    borderBottomWidth: isDark ? 1 : 0,
    borderBottomColor: colors.divider,
    paddingTop: 14,
    paddingBottom: 14,
    paddingHorizontal: 16,
  },
  backButton: {
    marginRight: 10,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 10,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
  },
  whatsappBtn: {
    marginLeft: 10,
  },
  logoWrapper: {
    width: 42,
    height: 42,
    borderRadius: 21,
    // Always white — this badge needs to stay white regardless of theme, whether
    // sitting on the fixed teal (light mode) or the dark surface (dark mode).
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logo: {
    width: 32,
    height: 32,
    resizeMode: 'contain',
  },
  brand: {
    flexShrink: 1,
  },
  brandBold: {
    fontSize: 24,
    fontWeight: '700',
    color: isDark ? colors.textPrimary : '#ffffff',
    letterSpacing: 0.3,
  },
});
