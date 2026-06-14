import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Alert } from 'react-native';
import { MultiSelect } from 'react-native-element-dropdown';
import { widthPercentageToDP as wp, heightPercentageToDP as hp } from 'react-native-responsive-screen';

const DropIconAdd = require('../../assets/icons/booking/add.png');

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
}: Props) => {

  const [selectedOptions, setSelectedOptions] = useState<string[]>(value);
  const [isFocus, setIsFocus] = useState(false);

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

  const getDropIcon = useCallback(() => {
    if (dropdownType === 'shift') {
      return require('../../assets/icons/booking/clock.png');
    }
    return DropIconAdd;
  }, [dropdownType]);

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

  const renderItem = useCallback((item: any) => {
    const backgroundColor = item.index % 2 === 0 ? '#fff' : '#f9f9f9';
    const isSelected = selectedOptions.includes(item.value);

    return (
      <View style={[
        styles.itemContainer,
        { backgroundColor },
        isSelected && styles.selectedOption
      ]}>
        <Text style={[styles.itemText, isSelected && styles.selectedOptionText]}>
          {item.label}
        </Text>
      </View>
    );
  }, [selectedOptions]);

  return (
    <View style={styles.container}>

      {showRequired && selectedOptions.length === 0 && (
        <Text style={styles.requiredAbsolute}>*</Text>
      )}

      <MultiSelect
        style={[
          styles.dropdownStyle,
          {
            borderColor: isFocus
              ? 'hsl(142, 71%, 45%)'
              : borderColor,
          },
          isFocus && styles.dropdownActiveBackground,
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: hp('2.5%'),
    position: 'relative',
  },
  dropdownStyle: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap', // 🌟 Allows tags to wrap onto a new line inside the box if space runs out
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: wp('3.5%'),
    minHeight: hp('5.5%'),
    backgroundColor: '#fff',
    paddingVertical: hp('0.5%'),
  },
  dropdownActiveBackground: {
    backgroundColor: '#F4F7FF',
  },
  placeholder: {
    fontSize: wp('3.6%'),
    fontWeight: '500',
  },
  menuContainer: {
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E2E8F0',
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
    color: '#4A4A4A',
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
    backgroundColor: '#E8F0FE',
    paddingHorizontal: wp('2.5%'),
    paddingVertical: hp('0.6%'),
    borderRadius: 20,
    marginTop: hp('0.4%'),
    marginBottom: hp('0.4%'),
    marginRight: wp('1.5%'),
  },
  tagText: {
    color: '#333',
    fontSize: wp('3.2%'),
    marginRight: 6,
  },
  removeText: {
    color: '#FF3B30',
    fontSize: wp('3.5%'),
    fontWeight: 'bold',
  },
  requiredAbsolute: {
    color: '#FF3B30',
    position: 'absolute',
    right: wp('12%'),
    top: hp('1.5%'),
    zIndex: 10,
  },
  searchInput: {
    borderRadius: 8,
    borderColor: '#E0E0E0',
    fontSize: wp('3.6%'),
    color: '#1A1A1A',
    height: hp('4.5%'),
  },
});

export default DropdownAdd;