import { supabase } from '../lib/supabase';

const generatePin = () => String(Math.floor(1000 + Math.random() * 9000));

// `workforce`'s real columns are first_name/middle_name/last_name, profile_status,
// services, working_areas, headshot_url, government_issued_id_url, created_date,
// years_experience, emergency_contact, referred_by, issues — not the full_name/
// positions/status/pin names this used to write. There's also no pin column on
// workforce at all; login credentials live only on `admin`.
const splitFullName = (fullName: string) => {
  const parts = (fullName || '').trim().split(/\s+/).filter(Boolean);
  return {
    first_name: parts[0] || null,
    middle_name: parts.length > 2 ? parts.slice(1, -1).join(' ') : null,
    last_name: parts.length > 1 ? parts[parts.length - 1] : null,
  };
};

export const createCareer = async (data: any) => {
  const rawArea = data['Preferred Working Area'];
  const workingAreas = Array.isArray(rawArea) ? rawArea : rawArea ? [rawArea] : [];

  const idProofRaw = data['Citizenship / Driving Licence / NID']?.[0];
  const idProofUrl = typeof idProofRaw === 'string' ? idProofRaw : idProofRaw?.url || null;

  const headshotRaw = data['Headshot']?.[0];
  const headshotUrl = typeof headshotRaw === 'string' ? headshotRaw : headshotRaw?.url || null;

  const pin = generatePin();

  const workforceFields = {
    ...splitFullName(data['Full Name']),
    phone: data['Phone'],
    email: data['Email'] || null,
    gender: data['Gender'] || null,
    years_experience: data['Years of Experience'] || null,
    issues: data['Message'] || null,
    emergency_contact: data['Emergency Contact Number'] || null,
    referred_by: data['Referral Phone Number'] || null,
    preferred_city: data['Preferred City'] || null,
    government_issued_id_url: idProofUrl,
    headshot_url: headshotUrl,
    services: data['Your Expertise'] || [],
    working_areas: workingAreas,
    profile_status: 'Waiting for Verification',
    created_date: new Date().toISOString(),
  };

  const { data: workforce, error } = await supabase
    .from('workforce')
    .insert([workforceFields])
    .select('uin')
    .single();

  if (error) throw new Error(error.message);

  // Also register in admin table so professional can log in (PIN lives here, not on workforce)
  await supabase.from('admin').insert([{
    full_name: data['Full Name'],
    phone: data['Phone'],
    pin,
    role: 'professional',
    status: 'Pending',
  }]);

  return { ...workforce, pin };
};
