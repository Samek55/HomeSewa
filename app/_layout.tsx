import { Stack, router, usePathname, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { useEffect, useState } from 'react';
import { BackHandler, DeviceEventEmitter, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { markSplashReady } from '../src/utils/splashGate';
import { logScreenView } from '../lib/analytics';
import RoadBlockPopup from '../components/RoadBlockPopup';
import { ThemeProvider } from '../context/ThemeContext';
import { LanguageProvider } from '../context/LanguageContext';

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
  return (
    <ThemeProvider>
      <LanguageProvider>
        <RootLayoutContent />
      </LanguageProvider>
    </ThemeProvider>
  );
}

function RootLayoutContent() {
  const [initializing, setInitializing] = useState(true);
  const [adminPhone, setAdminPhone] = useState<string | null>(null);

  const segments = useSegments();
  const router = useRouter();
  const pathname = usePathname();

  // --- FEATURE 1: ADMIN SESSION TRACKER ---
  // Login/logout is Supabase phone+PIN, remembered in AsyncStorage (see AdminLogin.tsx) —
  // there is no Firebase session to watch, so we read that directly and refresh on the
  // 'authChanged' event AdminLogin/logout emit.
  useEffect(() => {
    const loadSession = async () => {
      const phone = await AsyncStorage.getItem('adminPhone');
      setAdminPhone(phone);
      setInitializing(false);

      // Report auth check done — splash hides once every check has reported in
      markSplashReady();
    };

    loadSession();
    const sub = DeviceEventEmitter.addListener('authChanged', loadSession);
    return () => sub.remove();
  }, []);

  // --- FEATURE 2: CENTRALIZED SECURITY BOUNCER ---
  useEffect(() => {
    if (initializing) return;

    // Admin screens live under (drawer)/admin/... — AdminLogin itself must stay reachable
    // even when logged out, since that's the only way to establish a session.
    const inAdminGroup = segments[0] === '(drawer)' && segments[1] === 'admin' && segments[2] !== 'AdminLogin';
    const onAdminGate = segments[0] === '(drawer)' && segments[1] === 'Admin';

    if (!adminPhone && inAdminGroup) {
      // No session found while browsing protected admin screens: redirect out
      router.replace('/Admin');
    } else if (adminPhone && onAdminGate) {
      // Active session found when viewing the public admin gate: forward into panel
      router.replace('/admin/BookingHistory');
    }
  }, [adminPhone, initializing, segments]);

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

      // Handle push notification click events — routes to whichever screen the
      // notification is about, using the `data` payload set in api/notifications.ts.
      const handleNotificationClick = (event: any) => {
        if (!isMounted) return;
        console.log('Push notification clicked:', event.notification.body);

        const data = event.notification.additionalData;
        const screen = data?.screen;
        if (!screen) return;

        try {
          if (data.id) {
            router.push({ pathname: screen, params: { id: String(data.id) } });
          } else {
            router.push(screen);
          }
        } catch (navError) {
          console.warn('Notification deep-link navigation failed:', navError);
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

  // --- FEATURE 5B: SCREEN VIEW TRACKING (Google Analytics via Firebase) ---
  useEffect(() => {
    if (initializing || !pathname) return;
    logScreenView(pathname);
  }, [pathname, initializing]);

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

  // Popup banners are a customer-facing promo surface — skip them inside the
  // admin area so they never interrupt someone doing admin work, and skip them
  // during onboarding so they only appear once the user reaches the home page.
  const inAdminArea = segments[0] === '(drawer)' && (segments[1] === 'admin' || segments[1] === 'Admin');
  const inOnboarding = segments[0] === '(onboarding)';

  return (
    <KeyboardProvider>
      <SafeAreaProvider>
        <Stack screenOptions={{ headerShown: false }} />
        {/* Always mounted (not conditionally, unlike before) — inAdminArea toggling on
            every navigation was unmounting/remounting this and re-triggering its
            fetch-and-show effect, which is why the banner kept reappearing when moving
            between pages. It now stays mounted for the whole app session and just
            suppresses its own visibility while in the admin area or onboarding. */}
        <RoadBlockPopup suppressed={inAdminArea || inOnboarding} />
      </SafeAreaProvider>
    </KeyboardProvider>
  );
}