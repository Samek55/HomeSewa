import AsyncStorage from '@react-native-async-storage/async-storage';
import { requireOptionalNativeModule } from 'expo-modules-core';

const STORAGE_KEY = 'hasRequestedStoreReview';

// Fire-and-forget: never throws into the caller, never blocks a screen transition.
// Asked at most once ever per install — the OS-level APIs (SKStoreReviewController /
// Play In-App Review) already throttle how often they'll actually show anything,
// so there's no need for our own re-ask cadence on top of that.
//
// expo-store-review is loaded via a dynamic require() inside the function (not a
// static top-level import) — its native module may not be compiled into the current
// dev-client build yet (needs a fresh EAS/native build to pick up a newly added
// native dependency), and a static import throws at bundle-evaluation time, before
// this function's own try/catch could ever guard it. Same pattern already used for
// react-native-onesignal in app/_layout.tsx for this exact situation.
//
// The requireOptionalNativeModule check below is what actually keeps this quiet:
// expo-store-review's own loader calls the *throwing* requireNativeModule at
// import time, which also fires its own console.error before our try/catch ever
// gets a chance to swallow it. Checking the optional (non-throwing) variant first
// lets us skip importing the package at all when the native module isn't built,
// so nothing gets logged beyond our own single, deliberate console.log below.
export async function maybePromptReview(): Promise<void> {
  try {
    const alreadyAsked = await AsyncStorage.getItem(STORAGE_KEY);
    if (alreadyAsked) return;

    if (!requireOptionalNativeModule('ExpoStoreReview')) return;

    const StoreReview = require('expo-store-review');
    const available = await StoreReview.isAvailableAsync();
    if (!available) return;

    await StoreReview.requestReview();
    await AsyncStorage.setItem(STORAGE_KEY, 'true');
  } catch (err) {
    console.log('maybePromptReview skipped (native module likely not built yet):', err);
  }
}
