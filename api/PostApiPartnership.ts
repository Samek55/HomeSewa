import axios from 'axios';

const AIRTABLE_API_URL_PARTNERSHIP = process.env.EXPO_PUBLIC_AIRTABLE_API_URL_PARTNERSHIP
const AIRTABLE_TOKEN = process.env.EXPO_PUBLIC_AIRTABLE_TOKEN

export const createPartnership = async (data: any) => {
  if (!AIRTABLE_TOKEN || !AIRTABLE_API_URL_PARTNERSHIP) {
    console.error('Environment variables not loaded correctly.');
    throw new Error('Missing configuration.');
  }

  try {
    const response = await axios.post(
      AIRTABLE_API_URL_PARTNERSHIP,
      {
        fields: data,
        typecast: true,
      },
      {
        headers: {
          Authorization: `Bearer ${AIRTABLE_TOKEN}`,
          'Content-Type': 'application/json',
        },
      },
    );

    console.log('BOOKING SUCCESS:', response.data);
    return response.data;
  } catch (error: any) {
    console.log(
      'BOOKING ERROR:',
      error?.response?.data || error.message,
    );
    throw error;
  }
};