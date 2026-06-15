import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet } from 'react-native';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#295C59',
        tabBarInactiveTintColor: 'gray',
        tabBarStyle: {
          backgroundColor: 'hsl(0, 0%, 95%)',
        },
      }}

    >
      <Tabs.Screen
        name="Home"
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="helpbox/helpboxOTP"
        options={{
          headerShown: false,
          href: null,
        }}
      />

      <Tabs.Screen
        name="helpbox/otpVerifiedHB"
        options={{
          headerShown: false,
          href: null,
        }}
      />


      <Tabs.Screen
        name="Service"
        options={{
          tabBarLabel: 'Services',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="construct-outline" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="service/ServiceDetail"
        options={{
          headerShown: false,
          href: null,
        }}
      />

      <Tabs.Screen
        name="Book"
        options={{
          tabBarLabel: 'Book',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="add-circle-outline" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="booking/BookingDetail"
        options={{
          headerShown: false,
          href: null,
        }}
      />

      <Tabs.Screen
        name="booking/BookingOtp"
        options={{
          headerShown: false,
          href: null,
        }}
      />

      <Tabs.Screen
        name="booking/BookingVerify"
        options={{
          headerShown: false,
          href: null,
        }}
      />

      <Tabs.Screen
        name="About"
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubble-ellipses-outline" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="Contact"
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="call-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({});
