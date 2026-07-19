import { useMemo } from 'react';
import {View, Text, Image, StyleSheet} from 'react-native';
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';
import { useTheme } from '../../context/ThemeContext';
import type { ThemeColors } from '../../theme/colors';

type Props = {
    title: string;
    suBTitle: string;
    image: any;
    style?: any};

const OurTeamCard = ({title,suBTitle, image, style}: Props) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.container}>
      <Image source={image} style={[styles.image, style]} />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.suBTitle}>{suBTitle}</Text>
    </View>
  );
};

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: hp('1%'),
    width:'36%',   // Responsive vertical margin
  },
  image: {
    width: wp('18%'), // Default image width (can be overridden with prop)
    height: wp('18%'), // Square image
    resizeMode: 'contain',
    borderRadius:100,
    boxShadow:'0px 0px 3px #000'
  },
  title: {
    marginTop: hp('1%'),
    fontWeight: '600',
    fontSize: wp('3.5%'), // Responsive font size
    color: colors.textPrimary,
    textAlign: 'center',
        width:'80%',

  },
  suBTitle:{
    marginTop: hp('0.1%'),
    fontWeight: '400',
    fontSize: wp('2.8%'), // Responsive font size
    color: colors.textSecondary,
    textAlign: 'center',
    width:'80%',
  },
});

export default OurTeamCard;
