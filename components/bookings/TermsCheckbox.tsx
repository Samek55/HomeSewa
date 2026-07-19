import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import type { ThemeColors } from '@/theme/colors';

const { width } = Dimensions.get('window');

const TERMS_URL = 'https://HomeSewa.app/terms';

type Props = {
  checked: boolean;
  onChange: (value: boolean) => void;
};

export default function TermsCheckbox({ checked, onChange }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
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
          color={colors.brand}
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

const createStyles = (colors: ThemeColors) => StyleSheet.create({
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
    color: colors.textSecondary,
  },
  link: {
    color: colors.brand,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});
