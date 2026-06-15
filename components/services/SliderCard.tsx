import { View, Text, Image, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

type Props = { name: string; image: any };

const SliderCard = ({ name, image }: Props) => (
  <View style={styles.container}>
    <Image source={image} style={styles.image} resizeMode="cover" />
    <LinearGradient
      colors={['transparent', 'rgba(18,46,44,0.90)']}
      style={styles.gradient}
    >
      <Text style={styles.label}>HomeSewa</Text>
      <Text style={styles.name}>{name}</Text>
    </LinearGradient>
  </View>
);

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    overflow: 'hidden',
    width: '100%',
    height: width * 0.45,
    elevation: 4,
    shadowColor: '#295C59',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  image: { width: '100%', height: '100%', position: 'absolute' },
  gradient: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 14,
    gap: 2,
  },
  label: { fontSize: width * 0.03, fontWeight: '600', color: 'rgba(255,255,255,0.72)', textAlign: 'center' },
  name: { fontSize: width * 0.05, fontWeight: '800', color: '#fff', textAlign: 'center' },
});

export default SliderCard;
