import {
  Text,
  Image,
  StyleSheet,
  Pressable,
  View,
} from 'react-native';

import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';

type Props = {
  title: string;
  image: any;
  style?: any;
  onPress?: () => void;
};

const ServicesCard = ({ title, image, style, onPress }: Props) => {
  return (
    <View style={styles.wrapper}>
      <Pressable style={styles.card} onPress={onPress}>
        <Image source={image} style={[styles.image, style]} />
        <Text style={styles.title} allowFontScaling={false}>{title}</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: 12,
    backgroundColor: '#fff',

    marginTop: hp('1.2%'),
    marginHorizontal: wp('1.4%'),

    elevation: 3,

    // IOS
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },

  card: {
    borderRadius: 12,
    overflow: 'hidden',

    alignItems: 'center',
    height: hp('14%'),
    width: wp('27%'),

    backgroundColor: '#fff',
  },

  image: {
    height: hp('9%'),
    width: '100%',
    resizeMode: 'cover',
  },

  title: {
    fontSize: wp('3.5%'),
    fontWeight: '700',
    color: '#161616',
    textAlign: 'center',
    marginTop: 10,
  },
});

export default ServicesCard;