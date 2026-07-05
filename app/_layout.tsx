import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import { BackHandler, Platform } from 'react-native';
import { getAuth, onAuthStateChanged } from '@react-native-firebase/auth';
import { markSplashReady } from '../src/utils/splashGate';

// Prevent splash screen from hiding automatically
SplashScreen.preventAutoHideAsync().catch(() => { });

/**
 * Reusable helper to call upon user login.
 * Strictly links the user's ID and push tags, avoiding SMS/Email channels.
 */
export function syncPushUser(userId: string, role: 'admin' | 'career' | 'user') {
  try {
    const { OneSignal } = require('react-native-onesignal');
    
    // Identifies the user in OneSignal and links their push token to this ID
    OneSignal.login(userId);
    
    // Updates the role tag for targeted push segments
    OneSignal.User.addTag('role', role);
    
    console.log(`[Push Channel] User ${userId} synchronized with role: ${role}`);
  } catch (e) {
    console.warn('OneSignal user sync skipped (Non-native environment)');
  }
}

export default function RootLayout() {
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState<any>(null);
  
  const segments = useSegments();
  const router = useRouter();

  // --- FEATURE 1: FIREBASE AUTH PERSISTENCE TRACKER ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(getAuth(), (firebaseUser) => {
      setUser(firebaseUser);
      setInitializing(false);

      // Report auth check done — splash hides once every check has reported in
      markSplashReady();
    });

    return unsubscribe;
  }, []);

  // --- FEATURE 2: CENTRALIZED SECURITY BOUNCER ---
  useEffect(() => {
    if (initializing) return;

    // Evaluates if the current directory route segment matches your protected folder path
    const inAdminGroup = segments[0] === 'admin';

    if (!user && inAdminGroup) {
      // Drop session context found while browsing protected assets: Redirect out
      router.replace('/Admin');
    } else if (user && segments[0] === 'Admin') {
      // Active context found when viewing public forms: Forward into panel
      router.replace('/admin/BookingHistory');
    }
  }, [user, initializing, segments]);

  // --- FEATURE 3: HARDWARE BACK BUTTON — COLLAPSE TO HOME, THEN EXIT ---
  useEffect(() => {
    if (Platform.OS !== 'android' || initializing) return;

    const onBackPress = () => {
      // Outside the main drawer/tabs area (e.g. onboarding) let Android's
      // default back behavior happen instead of forcing a jump to Home.
      if (segments[0] !== '(drawer)') return false;

      const onHome = segments[segments.length - 1] === 'Home';

      if (onHome) {
        BackHandler.exitApp();
      } else {
        router.replace('/Home');
      }
      return true;
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [segments, initializing]);

  // --- FEATURE 4: ONESIGNAL HARDWARE PROVISIONING CHANNEL ---
  useEffect(() => {
    let isMounted = true;

    try {
      // Dynamic require ensures safety inside Expo Go/Web environments
      const { LogLevel, OneSignal } = require('react-native-onesignal');

      // Set up verbose debugging (Good for development, remove in production)
      OneSignal.Debug.setLogLevel(LogLevel.Verbose);

      if (process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID) {
        OneSignal.initialize(process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID);
        
        // Request OS-level push notification permissions
        OneSignal.Notifications.requestPermission(true);

        // Fallback default push tag
        OneSignal.User.addTag('role', 'user');
      } else {
        console.error('OneSignal App ID missing from environment variables.');
      }

      // Handle push notification click events
      const handleNotificationClick = (event: any) => {
        if (isMounted) {
          console.log('Push notification clicked:', event.notification.body);
          // Handle deep routing here if needed
        }
      };

      OneSignal.Notifications.addEventListener('click', handleNotificationClick);

      // Clean up event listener when root layout unmounts
      return () => {
        isMounted = false;
        try {
          OneSignal.Notifications.removeEventListener('click', handleNotificationClick);
        } catch (clearError) {
          // Fail silently if library is absent during unmount
        }
      };

    } catch (e) {
      console.warn('OneSignal Push Channel not available in this environment:', e);
    }
  }, []);

  // --- FEATURE 5: REFRESH PROFESSIONAL ONESIGNAL TAGS ON EVERY LAUNCH ---
  useEffect(() => {
    const refreshProfessionalTags = async () => {
      try {
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        const adminPhone = await AsyncStorage.getItem('adminPhone');

        if (!adminPhone) return;

        const { supabase } = require('../lib/supabase');
        const { data } = await supabase
          .from('workforce')
          .select('working_areas, services')
          .or(`phone.eq.${adminPhone},phone.eq.977${adminPhone}`)
          .maybeSingle();

        if (!data) return;

        const { OneSignal } = require('react-native-onesignal');
        OneSignal.login(adminPhone);
        OneSignal.User.addTag('phone', adminPhone);
        OneSignal.User.addTag('role', 'career');
        OneSignal.User.addTag('city', (data.working_areas || [])[0] || '');
        OneSignal.User.addTag('services', (data.services || [])[0] || '');

        console.log('[Tags] Professional tags refreshed on launch for:', adminPhone);
      } catch (e) {
        console.warn('[Tags] Could not refresh professional tags:', e);
      }
    };

    refreshProfessionalTags();
  }, []);

  // Stay invisible during auth evaluation — the native splash (logo) is still
  // covering the screen at this point, so there's nothing to render here.
  if (initializing) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </SafeAreaProvider>
  );
}