const BASE_URL = process.env.EXPO_PUBLIC_TWILIO_BASE_URL;

export interface SendOtpResponse {
  success: boolean;
  status: string;
}

export interface VerifyOtpResponse {
  success: boolean;
  status: "approved" | "pending"
}

// SEND OTP
export const sendOtp = async (phone: string): Promise<SendOtpResponse | null> => {
  try {
    const res = await fetch(`${BASE_URL}/send-otp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ phone }),
    });

    const text = await res.text();
    console.log("RAW RESPONSE:", text);

    // Guard rail: If HTTP status is not 200-299, don't blind-parse it
    if (!res.ok) {
      console.warn(`Server responded with status ${res.status}: ${text}`);
      return { success: false, status: `Error ${res.status}` };
    }

    return JSON.parse(text);
  } catch (error) {
    console.log("Send OTP network/runtime error:", error);
    return null;
  }
};

// VERIFY OTP
export const verifyOtp = async (
  phone: string,
  code: string
): Promise<VerifyOtpResponse | null> => {
  try {
    const res = await fetch(`${BASE_URL}/verify-otp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ phone, code }),
    });

    const data: VerifyOtpResponse = await res.json();
    return data;
  } catch (error) {
    console.log("Verify OTP error:", error);
    return null;
  }
};