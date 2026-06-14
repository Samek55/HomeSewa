import { TouchableOpacity, StyleSheet, View, Image, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { DrawerActions } from '@react-navigation/native';
import { heightPercentageToDP as hp } from 'react-native-responsive-screen';

export default function Header1() {
  const navigation = useNavigation<any>();

  return (
    <View style={styles.wrapper}>

      {/* LEFT ICON */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
        <Image
          source={require('../assets/images/icon.png')}
          style={styles.leftIcon}
        />
        <Text style={{
          fontSize: hp('2%'),
          fontWeight: 'bold',
          color: '#ffffff',
        }}>Rocket Singh</Text>
      </View>

      {/* RIGHT ICON */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Image
          source={require('../assets/header/right.png')}
          style={styles.rightIcon}
        />

        {/* MENU BUTTON */}
        <TouchableOpacity
          style={styles.button}
          onPress={() =>
            navigation.getParent()?.dispatch(DrawerActions.openDrawer())
          }
        >
          <Ionicons name="menu" size={23} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    top: 41.5,
    left: 0,
    right: 0,
    height: 50,
    zIndex: 100,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
  },

  button: {
    borderRadius: 100,
    backgroundColor: '#008000',
    padding: 3.6,
  },

  leftIcon: {
    width: 34,
    height: 34,
    resizeMode: 'contain',
  },

  rightIcon: {
    width: 30,
    height: 30,
    resizeMode: 'contain',
  },
});