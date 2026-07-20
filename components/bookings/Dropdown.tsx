import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { Dropdown as LibDropdown } from 'react-native-element-dropdown';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';
import { useTheme } from '../../context/ThemeContext';
import type { ThemeColors } from '../../theme/colors';

const DropIcon = require('../../assets/icons/contact/DropDown.png');

type Props = {
  options: string[];
  placeholder: string;
  placeholderColor?: string;
  showRequired?: boolean;
  onSelectOption: (option: string) => void;
  dropdownType?: string;
  borderColor?: string;
  value?: string;
  onOpen?: () => void;
  onClose?: () => void;
};

const Dropdown = ({
  options,
  placeholder,
  placeholderColor = '#4B4B4B',
  showRequired = false,
  onSelectOption,
  dropdownType,
  borderColor = '#E0E0E0',
  value,
  onOpen,
  onClose
}: Props) => {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  const [isFocus, setIsFocus] = useState(false);
  const resolvedBorderColor = borderColor === '#E0E0E0' && isDark ? colors.border : borderColor;

  // ✅ FIX 1: memoize data
  const data = useMemo(() => {
    return options.map((item, index) => ({
      label: item,
      value: item,
      index,
    }));
  }, [options]);

  const getDropIcon = useCallback(() => {
    if (dropdownType === 'shift') {
      return require('../../assets/icons/booking/clock.png');
    }
    return DropIcon;
  }, [dropdownType]);

  // ✅ FIX 2: memoized renderItem
  const renderItem = useCallback(
    (item: { label: string; value: string; index: number }) => {
      const backgroundColor = item.index % 2 === 0 ? colors.surface : colors.surfaceMuted;
      const isSelected = value === item.value;

      return (
        <View style={[
          styles.itemContainer,
          { backgroundColor },
          isSelected && styles.selectedRowBackground
        ]}>
          <Text style={[styles.itemText, isSelected && styles.selectedRowText]}>
            {item.label}
          </Text>
        </View>
      );
    },
    [value, colors]
  );

  const renderRightIcon = useCallback(() => (
    <Image
      source={getDropIcon()}
      style={[
        { width: hp('2.2%'), height: hp('2.2%') },
        isFocus && dropdownType !== 'shift' && {
          transform: [{ rotate: '180deg' }],
          tintColor: '#2F6BFF'
        }
      ]}
    />
  ), [isFocus, dropdownType, getDropIcon]);

  return (
    <View style={styles.container}>

      {showRequired && !value && (
        <Text style={styles.requiredAbsolute}>*</Text>
      )}

      <LibDropdown
        style={[
          styles.dropdownStyle,
          { borderColor: isFocus ? 'hsl(142, 71%, 45%)' : resolvedBorderColor },
          isFocus && styles.dropdownActiveBackground
        ]}

        placeholderStyle={[styles.placeholder, { color: placeholderColor }]}
        selectedTextStyle={styles.selectedText}
        containerStyle={styles.menuContainer}

        activeColor="transparent"
        data={data}

        maxHeight={hp('26.8%')}
        labelField="label"
        valueField="value"

        search
        searchPlaceholder="Search..."
        inputSearchStyle={styles.searchInput}

        placeholder={placeholder}
        value={value}

        onFocus={() => setIsFocus(true)}

        onBlur={() => setIsFocus(false)}

        onChange={(item) => {
          onSelectOption(item.value);
          setIsFocus(false);
        }}

        renderRightIcon={renderRightIcon}
        renderItem={renderItem}
      />
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
    borderWidth: 1.5, // Upped border width slightly to make active states snappy
    borderRadius: 12,
    paddingHorizontal: wp('3.5%'),
    height: hp('5.5%'), // Slightly taller for better touch targets and prominence
    backgroundColor: colors.surface,
  },
  dropdownActiveBackground: {
    backgroundColor: isDark ? colors.surfaceMuted : '#F4F7FF', // Subtle background color change when open
  },
  placeholder: {
    fontSize: wp('3.6%'),
    fontWeight: '500',
  },
  selectedText: {
    fontSize: wp('3.6%'),
    fontWeight: '500',
    color: colors.textPrimary, // Darker text color for better readability
  },
  menuContainer: {
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    marginTop: 4, // Cleans up layout structure so popup menu doesn't crush the input box
    elevation: 8,
    shadowColor: 'hsl(142, 71%, 45%)', // Colored shadow theme accents
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
  selectedRowBackground: {
    backgroundColor: isDark ? colors.surfaceMuted : '#EBF1FF', // Distinct selection row tracking color
  },
  selectedRowText: {
    color: isDark ? colors.brand : 'hsl(142, 71%, 35%)', // Gives selected items a brand-focused callout color
    fontWeight: '600',
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

export default Dropdown;