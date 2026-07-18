import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

// `workforce`'s real columns are first_name/middle_name/last_name, profile_status,
// services, working_areas, headshot_url, government_issued_id_url, created_date,
// years_experience, emergency_contact, referred_by, issues — not the full_name/
// positions/status/pin names this used to write. There's also no pin column on
// workforce at all; login credentials live only on `professional`.
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
    // profile_status is intentionally omitted — the anon key can no longer
    // write it directly (0017_lock_workforce_verification_status.sql), so
    // every new application relies on the column's own default
    // ('Waiting for Verification') rather than setting it here.
    created_date: new Date().toISOString(),
  };

  const { data: workforce, error } = await supabase
    .from('workforce')
    .insert([workforceFields])
    .select('uin')
    .single();

  if (error) throw new Error(error.message);

  // Registers the login row in `professional` (PIN lives here, not on workforce) via
  // the create-professional-login Edge Function — `professional` holds PINs and is
  // locked to the anon key by RLS, so the client can't insert into it directly
  // anymore. If this fails, the workforce row above would be an orphan an admin
  // could approve with no way for the applicant to ever log in — so roll it back
  // and surface the failure instead.
  const { data: result, error: fnError } = await supabase.functions.invoke('create-professional-login', {
    body: { fullName: data['Full Name'], phone: data['Phone'] },
  });

  let outcome: any = result;
  if (fnError) {
    if (fnError instanceof FunctionsHttpError) {
      try { outcome = await fnError.context.json(); } catch { outcome = null; }
    }
    if (!outcome) outcome = { success: false, message: fnError.message };
  }

  if (!outcome.success) {
    await supabase.from('workforce').delete().eq('uin', workforce.uin);
    throw new Error(outcome.message || 'Could not register login for this application');
  }

  return workforce;
};
