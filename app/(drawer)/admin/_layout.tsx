import { Stack } from 'expo-router';

export default function AdminLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Notice the change from <Screen> to <Stack.Screen> */}
      <Stack.Screen name="AdminLogin" options={{ title: 'Admin Login' }} />
      <Stack.Screen name="BookingConfirmation" />
      <Stack.Screen name="BookingDetails_1" />
      <Stack.Screen name="BookingDetails_2" />
      <Stack.Screen name="BookingHistory" />
      <Stack.Screen name="HelpBox" />
      <Stack.Screen name="UpdateProfile" />
      <Stack.Screen name="HelpBoxDetail" />
      <Stack.Screen name="UserManagement" />
      <Stack.Screen name="ProfessionalVerification" />
      <Stack.Screen name="AdminNotifications" />
      <Stack.Screen name="SuperAdminHistory" />
      <Stack.Screen name="WorkCompletionOTP" />
      <Stack.Screen name="PaymentMethod" />
      <Stack.Screen name="KhaltiPayment" />
      <Stack.Screen name="GeneratePaymentDetails" />
      <Stack.Screen name="PaymentDetails" />
    </Stack>
  );
}