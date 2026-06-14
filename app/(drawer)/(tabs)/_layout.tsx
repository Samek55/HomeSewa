import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import CustomAddIcon from '../../../assets/booking.svg';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: 'green',
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
          tabBarLabel: '',
          tabBarButton: (props) => {
            return (
              <View style={styles.buttonWrapper}>
                <TouchableOpacity
                  onPress={props.onPress}
                  onLongPress={props.onLongPress ?? undefined}
                  activeOpacity={0.85}
                  style={styles.floatingButton}
                >
                  {/* 2. Replaced <Ionicons /> with your custom SVG Component */}
                  <CustomAddIcon
                    width={54}
                    height={54}
                    fill="#fff"
                  />
                </TouchableOpacity>
              </View>
            );
          },
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

const styles = StyleSheet.create({
  buttonWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingButton: {


    justifyContent: 'center',
    alignItems: 'center',

    top: -15,
    boxShadow: '0px 0px 0px 3px #ddd',
    borderRadius: 400
  },
})