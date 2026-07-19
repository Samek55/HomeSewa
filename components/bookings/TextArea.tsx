import React, { useState, useMemo } from 'react';
import {
  TextInput,
  StyleSheet,
  TextInputProps,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import type { ThemeColors } from '../../theme/colors';

type TextAreaProps = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  minHeight?: number;
  maxHeight?: number;
  borderColor?: string;
} & TextInputProps;

const TextArea: React.FC<TextAreaProps> = ({
  value,
  onChangeText,
  borderColor,
  placeholder = 'Enter text...',
  minHeight = 100,
  maxHeight = 180,
  onFocus,
  onBlur,
  style,
  ...rest
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [height, setHeight] = useState(minHeight);
  // Internal focus state tracking to switch style configurations seamlessly
  const [isFocused, setIsFocused] = useState(false);

  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      multiline
      scrollEnabled={height >= maxHeight}
      onContentSizeChange={(event) => {
        const contentHeight = event.nativeEvent.contentSize.height;

        const newHeight = Math.min(
          maxHeight,
          Math.max(minHeight, contentHeight),
        );

        setHeight(newHeight);
      }}
      onFocus={(e) => {
        setIsFocused(true);
        if (onFocus) onFocus(e);
      }}
      onBlur={(e) => {
        setIsFocused(false);
        if (onBlur) onBlur(e);
      }}
      style={[
        styles.input,
        { height },
        !isFocused && borderColor ? { borderColor } : null,
        isFocused && styles.inputActive,
        style,
      ]}
      textAlignVertical="top"
      {...rest}
    />
  );
};

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  input: {
    borderWidth: 1.5,           // Standard premium blueprint outline thickness
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    fontWeight: '500',
    borderColor: colors.border,     // Premium fallback neutral slate gray
    backgroundColor: colors.surface,
    color: colors.textPrimary,
    marginTop: 6,
    marginBottom: 16,
  },
  inputActive: {
    borderColor: 'hsl(142, 71%, 45%)',     // Global theme focus outline tint
    backgroundColor: '#F4F7FF', // Soft backdrop selection tint color
  },
});

export default TextArea;