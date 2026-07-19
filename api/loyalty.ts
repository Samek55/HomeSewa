import { supabase } from '../lib/supabase';

export type LoyaltyTier = 'Bronze' | 'Silver' | 'Gold';

export type LoyaltyStatus = {
  completedBookings: number;
  points: number;
  tier: LoyaltyTier;
  nextTier: LoyaltyTier | null;
  bookingsToNextTier: number | null;
};

const POINTS_PER_BOOKING = 10;

// Ordered highest → lowest so the first match wins.
const TIERS: { tier: LoyaltyTier; minBookings: number }[] = [
  { tier: 'Gold', minBookings: 15 },
  { tier: 'Silver', minBookings: 5 },
  { tier: 'Bronze', minBookings: 0 },
];

export const getLoyaltyStatus = async (customerPhone: string): Promise<LoyaltyStatus> => {
  const { count, error } = await supabase
    .from('booking')
    .select('booking_id', { count: 'exact', head: true })
    .eq('phone', customerPhone)
    .eq('status', 'Completed');

  if (error) throw new Error(error.message);

  const completedBookings = count || 0;
  const points = completedBookings * POINTS_PER_BOOKING;
  const tierIndex = TIERS.findIndex(t => completedBookings >= t.minBookings);
  const current = TIERS[tierIndex];
  const next = tierIndex > 0 ? TIERS[tierIndex - 1] : null;

  return {
    completedBookings,
    points,
    tier: current.tier,
    nextTier: next?.tier ?? null,
    bookingsToNextTier: next ? next.minBookings - completedBookings : null,
  };
};
