import { getApp } from '@react-native-firebase/app';
import { getAnalytics, logEvent as logAnalyticsEvent } from '@react-native-firebase/analytics';

const analytics = () => getAnalytics(getApp());

/**
 * GA4 param values must be primitives (string/number/boolean) — arrays get
 * joined and truncated to the 100-char limit Firebase enforces per value.
 */
function sanitizeParams(params?: Record<string, unknown>) {
  if (!params) return undefined;
  const clean: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    const stringValue = Array.isArray(value) ? value.join(', ') : value;
    clean[key] =
      typeof stringValue === 'string' ? stringValue.slice(0, 100) : (stringValue as number | boolean);
  }
  return clean;
}

export async function logEvent(name: string, params?: Record<string, unknown>) {
  try {
    await logAnalyticsEvent(analytics(), name, sanitizeParams(params));
  } catch (e) {
    console.warn(`[Analytics] Failed to log event "${name}":`, e);
  }
}

export async function logScreenView(screenName: string) {
  try {
    // logScreenView() is deprecated even in the modular API (it just proxies to the
    // native namespaced call under the hood) — logging the 'screen_view' event
    // directly is the documented replacement.
    await logAnalyticsEvent(analytics(), 'screen_view', {
      screen_name: screenName,
      screen_class: screenName,
    });
  } catch (e) {
    console.warn(`[Analytics] Failed to log screen view "${screenName}":`, e);
  }
}
