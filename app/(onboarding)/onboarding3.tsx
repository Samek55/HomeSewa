import { View, Text } from 'react-native';
import { useMemo } from 'react';
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
      <Text style={styles.title}>Lets, Begin!</Text>

      <Text style={styles.subtitle}>
        Fast, reliable, and professional services—whenever you need them.
      </Text>

      <OnboardingComponent
        title="Home"
        image={require('../../assets/onBoarding/onBoarding3.png')}
        onPress={async () => {
          await AsyncStorage.setItem('hasSeenOnboarding', 'true');
          router.replace('/Home');
        }}

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

