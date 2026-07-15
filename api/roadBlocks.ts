import { supabase } from '../lib/supabase';

export const ROAD_BLOCK_BUTTON_TEXT_OPTIONS = [
  'View More', 'Download Now', 'Install Now', 'Buy Now', 'Learn More',
  'Watch Video', 'Grab Offer', 'Join Now', 'Review Now',
  'Suggest a Feature', 'Other',
] as const;

export type RoadBlockButtonText = typeof ROAD_BLOCK_BUTTON_TEXT_OPTIONS[number];

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
});

// The one banner (if any) that should be shown right now — active, and inside its
// start/end window. If more than one qualifies, the most recently created wins.
export const fetchActiveRoadBlock = async (): Promise<RoadBlock | null> => {
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from('road_blocks')
    .select('*')
    .eq('is_active', true)
    .lte('start_at', nowIso)
    .gte('end_at', nowIso)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return (data as RoadBlock) || null;
};

export const listRoadBlocks = async (): Promise<RoadBlock[]> => {
  const { data, error } = await supabase
    .from('road_blocks')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data as RoadBlock[]) || [];
};

export const createRoadBlock = async (input: RoadBlockInput): Promise<void> => {
  const { error } = await supabase.from('road_blocks').insert([toRow(input)]);
  if (error) throw error;
};

export const updateRoadBlock = async (id: number, input: RoadBlockInput): Promise<void> => {
  const { error } = await supabase.from('road_blocks').update(toRow(input)).eq('id', id);
  if (error) throw error;
};

export const setRoadBlockActive = async (id: number, isActive: boolean): Promise<void> => {
  const { error } = await supabase.from('road_blocks').update({ is_active: isActive }).eq('id', id);
  if (error) throw error;
};
