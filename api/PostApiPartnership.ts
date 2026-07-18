import { supabase } from '../lib/supabase';

// Upload results sometimes arrive as plain URL strings and sometimes as
// { url: string } objects (same ambiguity PostApiCareer.ts already defends
// against for headshot/ID uploads) — normalize either shape to a URL.
const extractUrl = (item: any): string | null =>
  typeof item === 'string' ? item : item?.url || null;

export const createPartnership = async (data: any) => {
  const partnershipFields = {
    full_name: data['Full Name'],
    phone_number: data['Phone Number'],
    email: data['Email'] || null,
    name_of_organisation: data['Name of Organisation'] || null,
    city: data['City'] || null,
    // `|| null` would turn a genuine 0 into null — use `??` so 0 survives.
    number_of_employees: data['Number of Employees'] ?? null,
    business_type: data['Business Type'] || null,
    // These three were previously dropped entirely — the form uploads and
    // collects them, but they were never written to the DB, so every
    // partnership application's photos/certificates/services silently
    // vanished (uploaded to storage, then never referenced) and the admin
    // Partnerships review screen always rendered those sections empty.
    services: data['Services Offered'] || null,
    company_photos: JSON.stringify(
      (data['Company Photos'] || []).map(extractUrl).filter(Boolean)
    ),
    company_reg_certs: JSON.stringify(
      (data['Company Registration Certificates'] || []).map(extractUrl).filter(Boolean)
    ),
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
