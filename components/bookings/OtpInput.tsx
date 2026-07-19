import React, { useRef, useMemo } from 'react';
import { View, TextInput, StyleSheet, StyleProp, ViewStyle, TextStyle } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import type { ThemeColors } from '@/theme/colors';

type Props = {
  length?: number;
  value: string[];
  onChange: (next: string[]) => void;
  secureTextEntry?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  boxStyle?: StyleProp<TextStyle>;
};

/**
 * A row of single-digit boxes backed by one logical code, instead of `length`
 * independent `maxLength={1}` inputs. That independence is what broke paste
 * (a pasted code gets truncated to 1 char by the box it lands in) and backspace
 * (deleting a filled box only clears it — a second press was needed to actually
 * move back a box), since neither of those affects "the next box over".
 */
export default function OtpInput({
  length = 4,
  value,
  onChange,
  secureTextEntry,
  containerStyle,
  boxStyle,
}: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const refs = useRef<(TextInput | null)[]>([]);

  const handleChangeText = (text: string, index: number) => {
    const digits = text.replace(/[^0-9]/g, '');

    if (digits.length <= 1) {
      const next = [...value];
      next[index] = digits;
      onChange(next);
      if (digits && index < length - 1) refs.current[index + 1]?.focus();
      return;
    }

    // More than one digit means a paste or SMS autofill delivered the whole
    // code at once — spread it across this box and the ones after it instead
    // of truncating to the single char this box can display.
    const next = [...value];
    let i = index;
    for (const d of digits) {
      if (i >= length) break;
      next[i] = d;
      i++;
    }
    onChange(next);

    if (i >= length) {
      refs.current[length - 1]?.blur();
    } else {
      refs.current[i]?.focus();
    }
  };

  const handleKeyPress = (e: { nativeEvent: { key: string } }, index: number) => {
    if (e.nativeEvent.key !== 'Backspace' || index === 0) return;
    // Only step back (and clear the box we land on) when this box was already
    // empty — otherwise onChangeText above already handles clearing it, and a
    // single Backspace press would delete two digits instead of one.
    if (value[index]) return;

    const next = [...value];
    next[index - 1] = '';
    onChange(next);
    refs.current[index - 1]?.focus();
  };

  return (
    <View style={[styles.row, containerStyle]}>
      {Array.from({ length }).map((_, index) => (
        <TextInput
          key={index}
          ref={r => { refs.current[index] = r; }}
          style={[styles.box, boxStyle]}
          keyboardType="number-pad"
          textContentType={index === 0 ? 'oneTimeCode' : 'none'}
          autoComplete={index === 0 ? 'sms-otp' : 'off'}
          secureTextEntry={secureTextEntry}
          value={value[index] || ''}
          onChangeText={text => handleChangeText(text, index)}
          onKeyPress={e => handleKeyPress(e, index)}
        />
      ))}
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 3,
  },
  box: {
    width: 50,
    height: 50,
    marginHorizontal: 5,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 5,
    textAlign: 'center',
    fontSize: 20,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
    elevation: 3,
  },
});
