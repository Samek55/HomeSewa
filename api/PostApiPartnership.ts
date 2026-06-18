import { supabase } from '../lib/supabase';

export const createPartnership = async (data: any) => {
  const partnershipFields = {
    full_name: data['Full Name'],
    phone_number: data['Phone Number'],
    email: data['Email'] || null,
    name_of_organisation: data['Name of Organisation'] || null,
    city: data['City'] || null,
    number_of_employees: data['Number of Employees'] || null,
    business_type: data['Business Type'] || null,
    partnership_interests: data['Partnership Interests'] || null,
    how_did_you_hear: data['How did you hear about us?'] || null,
    message: data['Message'] || null,
  };

  const { data: result, error } = await supabase
    .from('partnership')
    .insert([partnershipFields])
    .select()
    .single();

  if (error) throw new Error(error.message);
  return result;
};
