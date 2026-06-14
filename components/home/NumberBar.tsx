import React, { useState } from 'react';
import {
  View,
  Image,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Text,
  Alert
} from 'react-native';
import SubmitOverlay from '../../components/bookings/SubmitOverlay';
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';
import { router } from 'expo-router';

// 1. MODULAR SDK IMPORTS
import { getAuth, signInWithPhoneNumber } from '@react-native-firebase/auth';

// Exported global placeholder for screen orchestration
export let globalFirebaseConfirmation: any = null;

const NumberBar = ({ onFocus = () => { } }) => {
  const [phone, setPhone] = useState('');
  const [overlayVisible, setOverlayVisible] = useState(false);
  const [overlayStatus, setOverlayStatus] = useState<'loading' | 'success'>('loading');
  const fontSize = wp('4.5%');

  const cleanPhone = phone.replace(/\s/g, '');

  const handleContinue = async () => {
    // 1. Force remove everything except digits just in case
    const structuralClean = phone.replace(/[^0-9]/g, '');

    console.log("--- OTP TRIGGER DEBUG ---");
    console.log("Raw state phone value:", phone);
    console.log("Stripped clean digits:", structuralClean);

    if (structuralClean.length !== 10) {
      Alert.alert('Phone number must be 10 digits', `You entered ${structuralClean.length} digits.`);
      return;
    }

    try {
      setOverlayStatus('loading');
      setOverlayVisible(true);

      const formattedPhone = '+977' + structuralClean;
      console.log("Sending SMS to target:", formattedPhone);

      const authInstance = getAuth();

      // 2. Wrap execution directly
      const confirmation = await signInWithPhoneNumber(authInstance, formattedPhone);

      console.log("Firebase SMS successfully initialized!", confirmation);
      globalFirebaseConfirmation = confirmation;

      setOverlayVisible(false);

      router.push({
        pathname: '/helpbox/helpboxOTP',
        params: { phone: structuralClean },
      });

    } catch (error: any) {
      setOverlayVisible(false);

      // 3. FORCE print full system diagnostics to your terminal log 
      console.error("CRITICAL FIREBASE TRACE:", JSON.stringify(error, null, 2));

      // Fallback native window alert breakdown
      Alert.alert(
        'System Dispatch Error',
        error.message || 'An unhandled exception blocked the Firebase pipeline.'
      );
    }
  };

  return (
    <View style={[styles.container, { width: wp('75%') }]}>
      <SubmitOverlay
        visible={overlayVisible}
        status={overlayStatus}
        onClose={() => setOverlayVisible(false)}
        onClear={() => setOverlayVisible(false)}
      />
      <View style={styles.phoneContainer}>
        <Image
          source={require('../../assets/header/right.png')}
          style={styles.icon}
          resizeMode="contain"
        />
        <View style={styles.inputContainer}>
          <TextInput
            onFocus={() => onFocus?.()}
            value={phone}
            onChangeText={(text) => {
              let cleaned = text.replace(/[^0-9]/g, '').slice(0, 10);
              let formatted = cleaned;
              if (cleaned.length > 3 && cleaned.length <= 6) {
                formatted = cleaned.slice(0, 3) + ' ' + cleaned.slice(3);
              } else if (cleaned.length > 6) {
                formatted = cleaned.slice(0, 3) + ' ' + cleaned.slice(3, 6) + ' ' + cleaned.slice(6);
              }
              setPhone(formatted);
            }}
            placeholder="787 125 8006"
            placeholderTextColor="#999"
            style={[styles.input, { fontSize }]}
            keyboardType="numeric"
          />
        </View>
      </View>

      <TouchableOpacity onPress={handleContinue} style={styles.helpButton}>
        <Text style={styles.helpText}> Help </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    height: hp('5%'),
    borderRadius: 25,
    borderWidth: 1.5,
    borderColor: '#0E61CD',
    overflow: 'hidden',
    backgroundColor: '#fff',
    width: '100%',
  },
  phoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: wp('3%'),
  },
  icon: {
    height: hp('3%'),
    width: wp('5.5%'),
    marginRight: wp('2%'),
  },
  inputContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  input: {
    width: '100%',
    color: '#4B4B4B',
    fontWeight: '600',
    textAlign: 'center',
    includeFontPadding: false,
    fontSize: wp('3.8%'),
  },
  helpButton: {
    backgroundColor: '#0E61CD',
    paddingHorizontal: wp('4%'),
    alignItems: 'center',
    justifyContent: 'center',
  },
  helpText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: wp('3.5%'),
  },
});

export default NumberBar;