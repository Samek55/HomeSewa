import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type Props = {
  value: number;
  onChange?: (value: number) => void;
  size?: number;
  readOnly?: boolean;
};

export default function StarRating({ value, onChange, size = 28, readOnly = false }: Props) {
  return (
    <View style={styles.row}>
      {[1, 2, 3, 4, 5].map(star => (
        <TouchableOpacity
          key={star}
          disabled={readOnly}
          onPress={() => onChange?.(star)}
          activeOpacity={0.7}
          hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
        >
          <Ionicons
            name={star <= value ? 'star' : 'star-outline'}
            size={size}
            color="#F5A623"
          />
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6 },
});
