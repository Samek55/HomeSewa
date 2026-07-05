import { Drawer } from 'expo-router/drawer';
import { Ionicons } from '@expo/vector-icons';
import CustomDrawer from '@/components/CustomDrawer';

import { Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

export default function DrawerLayout() {
  return (
    <Drawer
      initialRouteName="(tabs)"
      drawerContent={(props) => <CustomDrawer {...props} />}

      screenOptions={{
        headerShown: false,
        drawerType: 'front',

        drawerStyle: {
          width: width * 0.8, // 80% of screen width
          backgroundColor: 'transparent',
        },

        overlayColor: 'rgba(0,0,0,0.5)',
      }}
    >
      {/* Must be declared first, matching initialRouteName above — otherwise
          FAQs (the first explicitly-declared screen) can become the fallback
          target whenever navigation resets to "the first screen" (empty back
          stack, stale deep link), instead of Home. */}
      <Drawer.Screen
        name="(tabs)"
        options={{ drawerItemStyle: { display: 'none' } }}
      />

      <Drawer.Screen
        name="FAQs"
        options={{
          drawerIcon: ({ color, size }) => (
            <Ionicons name="help-circle-outline" size={size} color={color} />
          ),
        }}
      />

      <Drawer.Screen
        name="Glossary"
        options={{
          drawerIcon: ({ color, size }) => (
            <Ionicons name="book-outline" size={size} color={color} />
          ),
        }}
      />

      <Drawer.Screen
        name="Partnership"
        options={{
          drawerIcon: ({ color, size }) => (
            <Ionicons name="people-outline" size={size} color={color} />
          ),
        }}
      />

      <Drawer.Screen
        name="Career"
        options={{
          drawerIcon: ({ color, size }) => (
            <Ionicons name="briefcase-outline" size={size} color={color} />
          ),
        }}
      />

      <Drawer.Screen
        name="Admin"
        options={{
          drawerIcon: ({ color, size }) => (
            <Ionicons name="shield-checkmark-outline" size={size} color={color} />
          ),
        }}
      />

      <Drawer.Screen
        name="AdminChangePassword"
        options={{ drawerItemStyle: { display: 'none' } }}
      />
    </Drawer>
  );
}