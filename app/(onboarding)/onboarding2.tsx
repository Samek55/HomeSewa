import {View, Text} from 'react-native';
import React, { useMemo } from 'react';
import OnboardingComponent from '../../components/onBoarding/onboardingComponent';
import {StyleSheet} from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import type { ThemeColors } from '@/theme/colors';


export default function OnBoarding1() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.container}>
      <Text style={styles.title} >
              What can you do?
            </Text>
            <Text style={styles.subtitle}>
              From repairs to renovations, we handle it all with expert care.
            </Text>
      <OnboardingComponent
        title="Next"
        image={require('../../assets/onBoarding/onBoarding2.png')}
        onPress={() => router.push('/onboarding3')}
      />
    </View>
  );
};

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
    title: {
    paddingTop:95,
    paddingLeft:21,
    fontSize:25,
    fontWeight:'800',
    paddingBottom:12,
    color: colors.textSecondary,
  },
  subtitle: {
    paddingHorizontal:21,
    fontSize:16,
    lineHeight:22,
    color: colors.textSecondary,

  },
});

