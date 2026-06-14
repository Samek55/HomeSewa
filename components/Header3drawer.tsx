import { TouchableOpacity, StyleSheet, View, Image, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { DrawerActions } from '@react-navigation/native';

export default function Header3() {
  const navigation = useNavigation<any>();

  return (
    <View style={styles.header}>
      <View style={styles.subHeader}>
        <View style={styles.left}>

          <Image
            source={require('../assets/images/icon.png')}
            style={styles.leftIcon}
          />
          <Text style={{
            fontSize: 18,
            fontWeight: 'bold',
            color: '#064E3B',
          }}>Rocket Singh</Text>
        </View>

        <View style={styles.right}>

          <Image
            source={require('../assets/header/right.png')}
            style={styles.rightIcon}
          />
          <TouchableOpacity
            style={styles.button}
            onPress={() =>
              navigation.dispatch(DrawerActions.openDrawer())
            }
          >
            <Ionicons name="menu" size={23} color='#fff' />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 95,
    paddingTop: 50,
    backgroundColor: "hsl(0, 0%, 95%)",
  },
  subHeader: {
    flexDirection: 'row',
    justifyContent: "space-between",
    paddingHorizontal: 18

  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5
  },
  right: {
    flexDirection: 'row',
    alignSelf: 'center',
    gap: 10
  },
  button: {
    alignSelf: 'center',
    borderRadius: 100,
    padding: 3.6,
    backgroundColor: '#008000',
    overflow: 'hidden',
  },

  leftIcon: {
    width: 33,
    height: 33,
    resizeMode: 'contain',
    borderRadius: 200
  },
  rightIcon: {

    width: 30,
    height: 30,
    resizeMode: 'contain'
  },
});