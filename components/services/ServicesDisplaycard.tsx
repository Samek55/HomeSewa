import {
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import React, { useMemo } from 'react';
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';
import { useTheme } from '../../context/ThemeContext';
import type { ThemeColors } from '../../theme/colors';

type Props = {
  name: string;
  words: string;
  image: any;
  onPress?: any;
  style?: any;
  textStyle?: any;
  navigation?: any;
  description?: string;
  question?: string;
  answer?: string;
  id?: number;
};

const ServicesDisplaycard = ({
  name,
  words,
  image,
  onPress,
  style,
  textStyle,
}: Props) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <TouchableOpacity onPress={onPress} style={[styles.cardContainer, style]}>
      <Image source={image} style={styles.image} resizeMode="cover" />
      <Text style={[styles.title, textStyle]}>{name}</Text>
      <Text style={[styles.words, textStyle]}>{words}</Text>
    </TouchableOpacity>
  );
};

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  cardContainer: {
    marginBottom: hp(1.5),
    borderRadius: 13,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    minHeight: hp(23),
    height: hp(24),
    shadowColor: '#7cbc7a',
    shadowOpacity: 0.2,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 0 },
    elevation: 3,
  },

  image: {
    width: '100%',
    height: hp(14),
  },

  title: {
    fontSize: wp(3.7),
    fontWeight: '600',
    marginTop: hp(1.2),
    color: colors.textPrimary,
    paddingHorizontal: 11,
  },

  words: {
    fontSize: wp(3),
    fontWeight: '500',
    color: colors.textSecondary,
    paddingHorizontal: 11,
    marginTop: hp(0.5),
    flexShrink: 1,
  },
});

export default ServicesDisplaycard;
