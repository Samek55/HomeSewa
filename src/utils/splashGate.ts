import * as SplashScreen from 'expo-splash-screen';

/**
 * The native splash screen (the branded logo) must stay up until every
 * independent startup check has finished — Firebase auth state AND the
 * onboarding/AsyncStorage lookup. If either one hides the splash on its
 * own as soon as it finishes, the user can briefly see an unbranded
 * loading screen (white + spinner, or blank) underneath before the app
 * is actually ready. Each check calls `markSplashReady()` once instead
 * of hiding the splash directly; the splash only hides once everyone
 * has reported in.
 */
let pendingChecks = 2;
let hidden = false;

function hide() {
  if (hidden) return;
  hidden = true;
  SplashScreen.hideAsync().catch(() => {});
}

export function markSplashReady() {
  pendingChecks -= 1;
  if (pendingChecks <= 0) {
    hide();
  }
}

// Safety net: if some future startup flow never reports in (e.g. a
// deep link that skips a check), don't leave the user stuck on the
// splash screen forever.
setTimeout(hide, 6000);
