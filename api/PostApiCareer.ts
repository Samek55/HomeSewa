import { supabase } from '../lib/supabase';

const generatePin = () => String(Math.floor(1000 + Math.random() * 9000));

export const createCareer = async (data: any) => {
  const rawArea = data['Preferred Working Area'];
  const workingAreas = Array.isArray(rawArea) ? rawArea : rawArea ? [rawArea] : [];

  const idProofRaw = data['Citizenship / Driving Licence / NID']?.[0];
  const idProofUrl = typeof idProofRaw === 'string' ? idProofRaw : idProofRaw?.url || null;

  const headshotRaw = data['Headshot']?.[0];
  const headshotUrl = typeof headshotRaw === 'string' ? headshotRaw : headshotRaw?.url || null;

  const pin = generatePin();

  const workforceFields = {
    full_name: data['Full Name'],
    phone: data['Phone'],
    email: data['Email'] || null,
    gender: data['Gender'] || null,
    years_of_experience: data['Years of Experience'] || null,
    message: data['Message'] || null,
    emergency_contact_number: data['Emergency Contact Number'] || null,
    referral_phone_number: data['Referral Phone Number'] || null,
    preferred_city: data['Preferred City'] || null,
    id_proof: idProofUrl,
    headshot: headshotUrl,
    positions: data['Your Expertise'] || [],
    working_areas: workingAreas,
    status: 'Active',
    application_date: new Date().toISOString().split('T')[0],
    pin,
  };

  const { data: workforce, error } = await supabase
    .from('workforce')
    .insert([workforceFields])
    .select('uin')
    .single();

  if (error) throw new Error(error.message);

  // Also register in admins table so professional can log in
  await supabase.from('admins').insert([{
    full_name: data['Full Name'],
    phone: data['Phone'],
    pin,
    role: 'professional',
    status: 'Active',
  }]);

  return { ...workforce, pin };
};
