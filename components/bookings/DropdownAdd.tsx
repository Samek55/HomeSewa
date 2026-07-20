import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { MultiSelect } from 'react-native-element-dropdown';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import type { ThemeColors } from '../../theme/colors';

type Props = {
  options: string[];
  placeholder: string;
  placeholderColor?: string;
  showRequired?: boolean;
  onSelectOption?: (options: string[]) => void;
  dropdownType?: string;
  borderColor?: string;
  value?: string[];
  onOpen?: () => void;
  onClose?: () => void;
  maxSelections?: number;
  helperText?: string;
};

const DropdownAdd = ({
  options,
  placeholder,
  placeholderColor = '#4B4B4B',
  showRequired = false,
  onSelectOption,
  dropdownType,
  borderColor = '#E0E0E0',
  value = [],
  onOpen,
  onClose,
  maxSelections,
  helperText,
}: Props) => {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  const [selectedOptions, setSelectedOptions] = useState<string[]>(value);
  const [isFocus, setIsFocus] = useState(false);
  const resolvedBorderColor = borderColor === '#E0E0E0' && isDark ? colors.border : borderColor;

  React.useEffect(() => {
    setSelectedOptions(value);
  }, [value]);

  const data = useMemo(() => {
    return options.map((item, index) => ({
      label: item,
      value: item,
      index,
    }));
  }, [options]);

  const renderRightIcon = useCallback(() => (
    <Ionicons
      name={isFocus ? 'chevron-up' : 'chevron-down'}
      size={hp('2.2%')}
      color={isFocus ? '#2F6BFF' : '#9CA3AF'}
    />
  ), [isFocus]);

  const renderItem = useCallback((item: any) => {
    const isSelected = selectedOptions.includes(item.value);

    // Hide already-selected items from the list (multi-select only)
    if (maxSelections !== 1 && isSelected) return null;

    const backgroundColor = item.index % 2 === 0 ? colors.surface : colors.surfaceMuted;
    return (
      <View style={[styles.itemContainer, { backgroundColor }]}>
        <Text style={styles.itemText}>{item.label}</Text>
      </View>
    );
  }, [selectedOptions, maxSelections, colors]);

  const activeBorderColor = isFocus ? 'hsl(142, 71%, 45%)' : resolvedBorderColor;

  return (
    <View style={styles.container}>

      {showRequired && selectedOptions.length === 0 && (
        <Text style={styles.requiredAbsolute}>*</Text>
      )}

      <MultiSelect
        style={[
          styles.dropdownStyle,
          { borderColor: activeBorderColor },
          isFocus && styles.dropdownActiveBackground,
          helperText && styles.dropdownNoBottomRadius,
        ]}
        placeholderStyle={[
          styles.placeholder,
          { color: placeholderColor },
        ]}
        containerStyle={styles.menuContainer}
        activeColor="transparent"

        inside={true}
        selectedStyle={styles.selectedStyleContainer}

        search
        searchPlaceholder="Search..."
        inputSearchStyle={styles.searchInput}

        data={data}
        labelField="label"
        valueField="value"
        value={selectedOptions}
        placeholder={placeholder}

        onFocus={() => {
          setIsFocus(true);
          onOpen?.();
        }}
        onBlur={() => {
          setIsFocus(false);
          onClose?.();
        }}
        onChange={(items: string[]) => {
          let updatedItems = items;

          if (maxSelections && items.length > maxSelections) {
            // prevent extra selection
            updatedItems = items.slice(0, maxSelections);

            // optional UX feedback
            Alert.alert(
              "Limit reached",
              `You can only select up to ${maxSelections} items`
            );
          }

          setSelectedOptions(updatedItems);
          onSelectOption?.(updatedItems);
        }}

        renderRightIcon={renderRightIcon}
        renderItem={renderItem}

        renderSelectedItem={(item, unSelect) => (
          <View style={styles.tag}>
            <Text style={styles.tagText} numberOfLines={1}>
              {item.label}
            </Text>
            <TouchableOpacity onPress={() => unSelect?.(item)}>
              <Text style={styles.removeText}>✕</Text>
            </TouchableOpacity>
          </View>
        )}
      />

      {helperText && (
        <View style={[styles.helperStrip, { borderColor: activeBorderColor }]}>
          <Text style={styles.helperStripText}>{helperText}</Text>
        </View>
      )}
    </View>
  );
};

const createStyles = (colors: ThemeColors, isDark: boolean) => StyleSheet.create({
  container: {
    marginBottom: hp('2.5%'),
    position: 'relative',
  },
  dropdownStyle: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: wp('3.5%'),
    minHeight: hp('5.5%'),
    backgroundColor: colors.surface,
    paddingVertical: hp('0.5%'),
  },
  dropdownNoBottomRadius: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderBottomWidth: 0,
  },
  dropdownActiveBackground: {
    backgroundColor: isDark ? colors.surfaceMuted : '#F4F7FF',
  },
  helperStrip: {
    borderWidth: 1.5,
    borderTopWidth: 0,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    paddingHorizontal: wp('3.5%'),
    paddingVertical: hp('0.7%'),
    backgroundColor: colors.surfaceMuted,
  },
  helperStripText: {
    fontSize: wp('3%'),
    color: colors.textMuted,
    fontWeight: '400',
  },
  placeholder: {
    fontSize: wp('3.6%'),
    fontWeight: '500',
  },
  menuContainer: {
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    marginTop: 4,
    elevation: 8,
    shadowColor: 'hsl(142, 71%, 45%)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    overflow: 'hidden',
  },
  itemContainer: {
    paddingVertical: hp('1.6%'),
    paddingHorizontal: wp('4%'),
  },
  itemText: {
    fontSize: hp('1.7%'),
    color: colors.textSecondary,
  },
  selectedOption: {
    backgroundColor: '#EBF1FF',
  },
  selectedOptionText: {
    color: 'hsl(142, 71%, 25%)',
    fontWeight: '600',
  },

  // 🌟 NEW: Resets internal margin constraints from react-native-element-dropdown
  selectedStyleContainer: {
    padding: 0,
    margin: 0,
    borderWidth: 0,
    borderRadius: 0,
    shadowOpacity: 0,
    elevation: 0,
  },

  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: isDark ? colors.surfaceMuted : '#E8F0FE',
    paddingHorizontal: wp('2.5%'),
    paddingVertical: hp('0.6%'),
    borderRadius: 20,
    marginTop: hp('0.4%'),
    marginBottom: hp('0.4%'),
    marginRight: wp('1.5%'),
  },
  tagText: {
    color: colors.textPrimary,
    fontSize: wp('3.2%'),
    marginRight: 6,
  },
  removeText: {
    color: colors.danger,
    fontSize: wp('3.5%'),
    fontWeight: 'bold',
  },
  requiredAbsolute: {
    color: colors.danger,
    position: 'absolute',
    right: wp('12%'),
    top: hp('1.5%'),
    zIndex: 10,
  },
  searchInput: {
    borderRadius: 8,
    borderColor: colors.border,
    fontSize: wp('3.6%'),
    color: colors.textPrimary,
    height: hp('4.5%'),
  },
});

export default DropdownAdd;