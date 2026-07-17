// Display-only price shown on the Pay screen. The amount actually charged and
// verified is controlled separately by the LEAD_FEE_PAISA env var on the
// khalti-confirm-lead-unlock Edge Function (Supabase dashboard -> Edge
// Functions -> Secrets) — if you change the real fee there, update this to match,
// otherwise the app will show a price that isn't what Khalti actually charges.
export const LEAD_FEE_NPR = 99;
export const LEAD_FEE_REGULAR_NPR = 100;
export const LEAD_FEE_PAISA = LEAD_FEE_NPR * 100;
