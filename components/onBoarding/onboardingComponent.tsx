import {View, Image, GestureResponderEvent, StyleSheet} from 'react-native';
import React, { useMemo } from 'react';
import ButtonComponent from './ButtonComponent';
import { useTheme } from '../../context/ThemeContext';
import type { ThemeColors } from '../../theme/colors';

type Props = {
  title: string;
  onPress?: (event: GestureResponderEvent) => void;
  image: any;
};

const OnboardingComponent = ({title, onPress, image}: Props) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (

    <View style={styles.container}>
      <View style={styles.content}>
        <Image source={image} style={styles.bannerImg}/>
      </View>
      <ButtonComponent title={title} onPress={onPress} />
    </View>
  );
};

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 40,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 40,
    backgroundColor: colors.background,
  },
  content: {
    top: '5%',
    alignItems: 'center',
    gap: 30,
  },
  bannerImg:{
    height:300,
    width:300,
  },
});

export default OnboardingComponent;
