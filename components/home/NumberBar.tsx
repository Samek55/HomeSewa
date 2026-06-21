import React, { useState } from 'react';
import { View, Image, TouchableOpacity, StyleSheet, TextInput, Text, Alert } from 'react-native';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LAST_HELP_REQUEST_KEY = 'lastHelpRequestAt';
const HELP_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours

const NumberBar = ({ onFocus = () => {} }) => {
  const [phone, setPhone] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const handleContinue = async () => {
    const structuralClean = phone.replace(/[^0-9]/g, '');
    if (structuralClean.length !== 10) {
      Alert.alert('Invalid Number', `Please enter a valid 10-digit Nepal mobile number.`);
      return;
    }

    // Block repeat submissions from this device within 24 hours to prevent spam.
    const lastRequestRaw = await AsyncStorage.getItem(LAST_HELP_REQUEST_KEY);
    const lastRequestAt = lastRequestRaw ? Number(lastRequestRaw) : 0;
    const elapsed = Date.now() - lastRequestAt;
    if (elapsed < HELP_COOLDOWN_MS) {
      const hoursLeft = Math.ceil((HELP_COOLDOWN_MS - elapsed) / (60 * 60 * 1000));
      Alert.alert(
        'Please wait',
        `You've already submitted a help request. Please try again in ${hoursLeft} hour${hoursLeft === 1 ? '' : 's'}.`
      );
      return;
    }

    router.push({ pathname: '/helpbox/helpboxOTP', params: { phone: structuralClean } });
  };

  return (
    <View style={styles.container}>
      {/* FLAG + INPUT */}
      <View style={styles.inputRow}>
        <View style={styles.flagWrapper}>
          <Image
            source={require('../../assets/images/NEW-Flag_of_Nepal.png')}
            style={styles.flag}
          />
        </View>
        <View style={styles.dividerLine} />
        <TextInput
          onFocus={() => { setIsFocused(true); onFocus?.(); }}
          onBlur={() => setIsFocused(false)}
          value={phone}
          onChangeText={(text) => {
            let cleaned = text.replace(/[^0-9]/g, '').slice(0, 10);
            let formatted = cleaned;
            if (cleaned.length > 5 && cleaned.length <= 7) {
              formatted = cleaned.slice(0, 5) + ' ' + cleaned.slice(5);
            } else if (cleaned.length > 7) {
              formatted = cleaned.slice(0, 5) + ' ' + cleaned.slice(5, 7) + ' ' + cleaned.slice(7);
            }
            setPhone(formatted);
          }}
          placeholder={isFocused ? '' : '98520 24 365'}
          placeholderTextColor="#A0BAB8"
          style={styles.input}
          keyboardType="numeric"
        />
      </View>

      {/* BUTTON */}
      <TouchableOpacity onPress={handleContinue} style={styles.button} activeOpacity={0.85}>
        <Text style={styles.buttonText}>Help</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#295C59',
    borderRadius: 12,
    backgroundColor: '#fff',
    overflow: 'hidden',
    height: hp('6%'),
  },
  inputRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: wp('3%'),
    gap: 6,
  },
  flagWrapper: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  flag: {
    width: 28,
    height: 28,
    resizeMode: 'contain',
  },
  code: {
    fontSize: wp('3.5%'),
    fontWeight: '700',
    color: '#295C59',
  },
  dividerLine: {
    width: 1,
    height: 18,
    backgroundColor: '#C5DCDA',
    marginHorizontal: 2,
  },
  input: {
    flex: 1,
    fontSize: wp('3.8%'),
    fontWeight: '600',
    color: '#1C2B2A',
    includeFontPadding: false,
  },
  button: {
    backgroundColor: '#295C59',
    paddingHorizontal: wp('4.5%'),
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: wp('3.5%'),
  },
});

export default NumberBar;
