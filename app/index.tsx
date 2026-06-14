import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Redirect } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';

type Route = '/Home' | '/onboarding1';

export default function Index() {
  const [route, setRoute] = useState<Route | null>(null);

  useEffect(() => {
    let mounted = true;

    const prepare = async () => {
      try {
        const seen = await AsyncStorage.getItem('hasSeenOnboarding');
        if (!mounted) return;
        setRoute(seen === 'true' ? '/Home' : '/onboarding1');
      } catch {
        if (!mounted) return;
        setRoute('/onboarding1');
      } finally {
        if (mounted) {
          await SplashScreen.hideAsync();
        }
      }
    };

    prepare();

    return () => {
      mounted = false;
    };
  }, []);

  if (!route) {
    return null;
  }

  return <Redirect href={route} />;
}
