import Airtable from 'airtable';

const AIRTABLE_TOKEN = process.env.EXPO_PUBLIC_AIRTABLE_TOKEN;
const AIRTABLE_BASE_ID = process.env.EXPO_PUBLIC_AIRTABLE_BASE_ID;
if (!AIRTABLE_TOKEN || !AIRTABLE_BASE_ID) {
  throw new Error('❌ Airtable environment variables are missing!');
}

Airtable.configure({
  apiKey: AIRTABLE_TOKEN,
});

const base = Airtable.base(AIRTABLE_BASE_ID);

export default base;