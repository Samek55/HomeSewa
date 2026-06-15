import { getAuth, signInWithPhoneNumber } from '@react-native-firebase/auth';

export const sendFirebaseOtp = async (phone: string): Promise<any> => {
  return await signInWithPhoneNumber(getAuth(), phone);
};

export const verifyFirebaseOtp = async (confirmation: any, code: string): Promise<boolean> => {
  try {
    await confirmation.confirm(code);
    return true;
  } catch (error: any) {
    console.log('Firebase OTP verify error:', error.message);
    return false;
  }
};
