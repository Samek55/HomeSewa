import { View, Text, Pressable } from 'react-native';
import React, { useMemo } from 'react';
import OnboardingComponent from '../../components/onBoarding/onboardingComponent';
import { StyleSheet } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '@/context/ThemeContext';
import type { ThemeColors } from '@/theme/colors';

export default function OnBoarding1() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.container}>

      {/* Skip Button */}
      <Pressable
        style={styles.skipContainer}
        onPress={async () => {
          await AsyncStorage.setItem('hasSeenOnboarding', 'true');
          router.replace('/Home');
        }}
      >
        <Text style={styles.skipbutton}>SKIP</Text>
      </Pressable>

      <Text style={styles.title}>
        Welcome to HomeSewa
      </Text>

      <Text style={styles.subtitle}>
        From Repairs to Refresh – We’ve Got Your Home Covered.
      </Text>

      <OnboardingComponent
        title="Next"
        image={require('../../assets/onBoarding/onBoarding1.png')}

        onPress={() => router.push('/onboarding2')}
      />
    </View>
  );
};

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  skipContainer: {
    position: 'absolute',
    right: 21,
    top: 55,
    zIndex: 10,
  },

  skipbutton: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  title: {
    paddingTop: 95,
    paddingLeft: 21,
    fontSize: 25,
    fontWeight: '800',
    paddingBottom: 12,
    color: colors.textSecondary,
  },

  subtitle: {
    paddingHorizontal: 21,
    fontSize: 16,
    lineHeight: 22,
    color: colors.textSecondary,
  },
});

