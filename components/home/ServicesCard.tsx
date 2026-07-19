import { useMemo } from 'react';
import { Text, Image, StyleSheet, Pressable, View } from 'react-native';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { useTheme } from '../../context/ThemeContext';
import type { ThemeColors } from '../../theme/colors';

type Props = {
  title: string;
  image: any;
  style?: any;
  onPress?: () => void;
};

const ServicesCard = ({ title, image, onPress }: Props) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      onPress={onPress}
    >
      <View style={styles.imageWrapper}>
        <Image source={image} style={styles.image} />
      </View>
      <Text style={styles.title} numberOfLines={1}>{title}</Text>
    </Pressable>
  );
};

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  card: {
    alignItems: 'center',
    width: wp('30%'),
    backgroundColor: colors.surface,
    borderRadius: 14,
    paddingBottom: 10,
    elevation: 3,
    shadowColor: '#295C59',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
  imageWrapper: {
    width: '100%',
    height: hp('10%'),
    overflow: 'hidden',
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  title: {
    fontSize: wp('3.4%'),
    fontWeight: '700',
    color: colors.brand,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 4,
  },
});

export default ServicesCard;
