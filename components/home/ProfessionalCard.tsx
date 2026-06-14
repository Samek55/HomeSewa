import { View, Text, Image, StyleSheet } from 'react-native';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';

type Props = { title: string; subtitle: string; image: any; style?: any };

const ProfessionalCard = ({ title, image }: Props) => {
  return (
    <View style={styles.container}>
      <View style={styles.ringOuter}>
        <View style={styles.ringInner}>
          <Image source={image} style={styles.image} />
        </View>
      </View>
      <Text style={styles.name}>{title}</Text>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>Pro</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: hp('1%'),
  },
  ringOuter: {
    width: wp('19%'),
    height: wp('19%'),
    borderRadius: wp('9.5%'),
    backgroundColor: '#295C59',
    padding: 2.5,
    elevation: 4,
    shadowColor: '#295C59',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
  },
  ringInner: {
    flex: 1,
    borderRadius: wp('9%'),
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#fff',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  name: {
    marginTop: hp('0.8%'),
    fontWeight: '700',
    fontSize: wp('3.2%'),
    color: '#1C2B2A',
    textAlign: 'center',
  },
  badge: {
    marginTop: 3,
    backgroundColor: '#E8F4F3',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: wp('2.5%'),
    fontWeight: '700',
    color: '#295C59',
  },
});

export default ProfessionalCard;
