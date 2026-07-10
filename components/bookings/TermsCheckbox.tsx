import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const TERMS_URL = 'https://HomeSewa.app/terms';

type Props = {
  checked: boolean;
  onChange: (value: boolean) => void;
};

export default function TermsCheckbox({ checked, onChange }: Props) {
  return (
    <View style={styles.row}>
      <TouchableOpacity
        onPress={() => onChange(!checked)}
        activeOpacity={0.7}
        style={styles.checkboxTouchable}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons
          name={checked ? 'checkbox' : 'square-outline'}
          size={22}
          color="#295C59"
        />
      </TouchableOpacity>
      <Text style={styles.label}>
        I Accept{' '}
        <Text style={styles.link} onPress={() => Linking.openURL(TERMS_URL)}>
          Terms & Conditions
        </Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 14,
  },
  checkboxTouchable: {
    marginRight: 8,
  },
  label: {
    fontSize: width * 0.035,
    fontWeight: '500',
    color: '#4A4A4A',
  },
  link: {
    color: '#295C59',
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});
