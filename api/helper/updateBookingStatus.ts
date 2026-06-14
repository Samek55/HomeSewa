const BASE_URL = process.env.EXPO_PUBLIC_AIRTABLE_API_URL_BOOKING;
const TOKEN = process.env.EXPO_PUBLIC_AIRTABLE_TOKEN;

export const updateBookingStatus = async (
  recordId: string,
  status: string
) => {
  try {
    const response = await fetch(`${BASE_URL}/${recordId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fields: {
          Status: status, // Airtable field name
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'Failed to update status');
    }

    return data;
  } catch (error) {
    console.error('Update booking status error:', error);
    throw error;
  }
};