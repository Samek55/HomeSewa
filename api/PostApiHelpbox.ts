import { supabase } from '../lib/supabase';

export const createHelpbox = async (data: any) => {
  const { data: result, error } = await supabase
    .from('helpbox')
    .insert([{ phone: data['Phone'], status: 'open' }])
    .select()
    .single();

  if (error) throw new Error(error.message);
  return result;
};
