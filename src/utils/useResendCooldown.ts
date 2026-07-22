import { useCallback, useEffect, useState } from 'react';

// Matches the server-side cooldown in supabase/functions/send-otp (RESEND_COOLDOWN_SECONDS)
// — this is purely a UI convenience so the button visibly disables itself instead of
// silently failing against the server's 429; the server enforces the real limit.
const DEFAULT_COOLDOWN_SECONDS = 45;

export function useResendCooldown(seconds: number = DEFAULT_COOLDOWN_SECONDS) {
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => {
    if (remaining <= 0) return;
    const timer = setTimeout(() => setRemaining(r => r - 1), 1000);
    return () => clearTimeout(timer);
  }, [remaining]);

  const start = useCallback((overrideSeconds?: number) => {
    setRemaining(overrideSeconds ?? seconds);
  }, [seconds]);

  return { remaining, canResend: remaining <= 0, start };
}
