import { TouchableOpacity, StyleSheet, View, Image, Text, Platform, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { DrawerActions } from '@react-navigation/native';

export default function Header3() {
  const navigation = useNavigation<any>();

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#295C59" />
      <View style={styles.wrapper}>

        {/* LEFT: LOGO + BRAND */}
        <View style={styles.left}>
          <Image
            source={require('../assets/images/homesewa.png')}
            style={styles.logo}
          />
          <Text style={styles.brandBold}>HomeSewa</Text>
        </View>

        {/* RIGHT: MENU */}
        <TouchableOpacity
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          onPress={() =>
            navigation.dispatch(DrawerActions.openDrawer())
          }
        >
          <Ionicons name="menu" size={30} color="#fff" />
        </TouchableOpacity>

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
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 10,
  },
  logo: {
    width: 42,
    height: 42,
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
