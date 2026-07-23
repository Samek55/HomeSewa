import { supabase } from '../lib/supabase';
import { invokeEdgeFunction } from './functionsClient';

export const ROAD_BLOCK_BUTTON_TEXT_OPTIONS = [
  'View More', 'Download Now', 'Install Now', 'Buy Now', 'Learn More',
  'Watch Video', 'Grab Offer', 'Join Now', 'Review Now',
  'Suggest a Feature', 'Other',
] as const;

export type RoadBlockButtonText = typeof ROAD_BLOCK_BUTTON_TEXT_OPTIONS[number];

// Who a banner can be targeted at. Empty/null target_* arrays mean "all" — same
// convention as `admin.allowed_cities` (see 0003_admin_city_access.sql).
export const ROAD_BLOCK_ROLE_OPTIONS = ['public', 'customer', 'workforce', 'admin'] as const;
export type RoadBlockRole = typeof ROAD_BLOCK_ROLE_OPTIONS[number];

export type RoadBlock = {
  id: number;
  banner_name: string;
  title: string;
  image_url: string;
  message: string;
  button_text: RoadBlockButtonText;
  button_text_custom: string | null;
  button_link: string;
  countdown_seconds: number | null;
  start_at: string;
  end_at: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by_phone: string;
  target_cities: string[] | null;
  target_roles: RoadBlockRole[] | null;
  target_professions: string[] | null;
};

export type RoadBlockInput = {
  bannerName: string;
  title: string;
  imageUrl: string;
  message: string;
  buttonText: RoadBlockButtonText;
  buttonTextCustom?: string;
  buttonLink: string;
  countdownSeconds?: number | null;
  startAt: string;
  endAt: string;
  createdByPhone: string;
  targetCities?: string[];
  targetRoles?: RoadBlockRole[];
  targetProfessions?: string[];
};

// Describes who is currently viewing the app, resolved client-side, so
// fetchActiveRoadBlock can pick the one banner that matches this device.
export type RoadBlockViewer = {
  role: RoadBlockRole;
  city?: string | null;
  professions?: string[];
};

const toRow = (input: RoadBlockInput) => ({
  banner_name: input.bannerName,
  title: input.title,
  image_url: input.imageUrl,
  message: input.message,
  button_text: input.buttonText,
  button_text_custom: input.buttonText === 'Other' ? (input.buttonTextCustom || '').trim() : null,
  button_link: input.buttonLink,
  countdown_seconds: input.countdownSeconds || null,
  start_at: input.startAt,
  end_at: input.endAt,
  created_by_phone: input.createdByPhone,
  target_cities: input.targetCities?.length ? input.targetCities : null,
  target_roles: input.targetRoles?.length ? input.targetRoles : null,
  target_professions: input.targetProfessions?.length ? input.targetProfessions : null,
});

// True if `rb` should be shown to `viewer`, per its city/role/profession targeting.
const matchesViewer = (rb: RoadBlock, viewer: RoadBlockViewer): boolean => {
  if (rb.target_roles?.length && !rb.target_roles.includes(viewer.role)) return false;

  // Only Workforce has a known home city (preferred_city) — Customer/Public/Admin
  // don't track one, so a city filter can't confirm a mismatch for them and
  // shouldn't silently zero out that whole segment.
  if (rb.target_cities?.length && viewer.city && !rb.target_cities.includes(viewer.city)) return false;

  if (viewer.role === 'workforce' && rb.target_professions?.length) {
    const mine = viewer.professions || [];
    if (!mine.some(p => rb.target_professions!.includes(p))) return false;
  }

  return true;
};

// The one banner (if any) that should be shown right now to this viewer — active,
// inside its start/end window, and matching their city/role/profession targeting.
// If more than one qualifies, the most recently created wins.
export const fetchActiveRoadBlock = async (viewer: RoadBlockViewer): Promise<RoadBlock | null> => {
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from('road_blocks')
    .select('*')
    .eq('is_active', true)
    .lte('start_at', nowIso)
    .gte('end_at', nowIso)
    .order('created_at', { ascending: false });

  if (error) throw error;
  const rows = (data as RoadBlock[]) || [];
  return rows.find(rb => matchesViewer(rb, viewer)) || null;
};

export const listRoadBlocks = async (): Promise<RoadBlock[]> => {
  const { data, error } = await supabase
    .from('road_blocks')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data as RoadBlock[]) || [];
};

// Writes go through road-block-write (session-verified server-side) rather than
// a direct table write — see 0029_lock_road_blocks_writes.sql for why direct
// anon writes were closed off.
export const createRoadBlock = async (input: RoadBlockInput): Promise<void> => {
  await invokeEdgeFunction<{ success: boolean; message?: string }>(
    'road-block-write',
    { action: 'create', row: toRow(input) },
    'Could not create this banner',
    { requireSession: true }
  );
};

export const updateRoadBlock = async (id: number, input: RoadBlockInput): Promise<void> => {
  await invokeEdgeFunction<{ success: boolean; message?: string }>(
    'road-block-write',
    { action: 'update', id, row: toRow(input) },
    'Could not update this banner',
    { requireSession: true }
  );
};

export const setRoadBlockActive = async (id: number, isActive: boolean): Promise<void> => {
  await invokeEdgeFunction<{ success: boolean; message?: string }>(
    'road-block-write',
    { action: 'setActive', id, isActive },
    'Could not update this banner',
    { requireSession: true }
  );
};
