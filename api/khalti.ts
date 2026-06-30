const KHALTI_SECRET_KEY = process.env.EXPO_PUBLIC_KHALTI_SECRET_KEY!;
const BASE = process.env.EXPO_PUBLIC_KHALTI_BASE_URL ?? 'https://a.khalti.com/api/v2';

export interface KhaltiInitResponse {
  pidx: string;
  payment_url: string;
}

export interface KhaltiLookupResponse {
  pidx: string;
  status: 'Completed' | 'Pending' | 'Initiated' | 'Refunded' | 'Expired' | 'User canceled';
  total_amount: number;
  transaction_id: string | null;
}

export async function initiateKhaltiPayment(params: {
  amountPaisa: number;
  orderId: string;
  orderName: string;
  customerName: string;
  customerPhone: string;
}): Promise<KhaltiInitResponse> {
  const res = await fetch(`${BASE}/epayment/initiate/`, {
    method: 'POST',
    headers: {
      Authorization: `Key ${KHALTI_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      return_url: 'https://homesewa.app/payment/success',
      website_url: 'https://homesewa.app',
      amount: params.amountPaisa,
      purchase_order_id: params.orderId,
      purchase_order_name: params.orderName,
      customer_info: {
        name: params.customerName,
        phone: params.customerPhone,
      },
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || JSON.stringify(data));
  return data;
}

export async function lookupKhaltiPayment(pidx: string): Promise<KhaltiLookupResponse> {
  const res = await fetch(`${BASE}/epayment/lookup/`, {
    method: 'POST',
    headers: {
      Authorization: `Key ${KHALTI_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ pidx }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || JSON.stringify(data));
  return data;
}
