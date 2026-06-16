import { TouchableOpacity, StyleSheet, View, Image, Text, Platform, StatusBar, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { DrawerActions } from '@react-navigation/native';
import { router } from 'expo-router';

const WHATSAPP_URL = "https://api.whatsapp.com/send?phone=9779852024365&text=Hello,%20I'm%20looking%20for%20Home%20Service.%20(HomeSewa%20App%20)%20Thank%20You%20";

export default function Header2() {
  const navigation = useNavigation<any>();

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#295C59" />
      <View style={styles.wrapper}>

        {/* LEFT: BACK BUTTON */}
        <TouchableOpacity
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          onPress={() => router.push('/Service')}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={26} color="#fff" />
        </TouchableOpacity>

        {/* CENTER: LOGO + BRAND */}
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
            <Ionicons name="logo-whatsapp" size={26} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            onPress={() =>
              navigation.getParent()?.dispatch(DrawerActions.openDrawer())
            }
          >
            <Ionicons name="menu" size={30} color="#fff" />
          </TouchableOpacity>
        </View>

      </View>
    </>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#295C59',
    paddingTop: Platform.OS === 'ios' ? 52 : 38,
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
    color: '#ffffff',
    letterSpacing: 0.3,
  },
});
