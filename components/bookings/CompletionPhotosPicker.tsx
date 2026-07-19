import React, { useCallback, useMemo } from 'react';
import * as ImagePicker from 'expo-image-picker';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';
import { useTheme } from '@/context/ThemeContext';
import type { ThemeColors } from '@/theme/colors';

const { width } = Dimensions.get('window');

type Props = {
  value: string[];
  onChange: (uris: string[]) => void;
  max?: number;
};

export default function CompletionPhotosPicker({ value, onChange, max = 5 }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const removePhoto = useCallback(
    (index: number) => onChange(value.filter((_, i) => i !== index)),
    [value, onChange],
  );

  const takePhoto = useCallback(async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Camera permission needed', 'Please allow camera access to take a completion photo.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (!result.canceled) {
      onChange([...value, result.assets[0].uri].slice(0, max));
    }
  }, [value, onChange, max]);

  const pickFromLibrary = useCallback(async () => {
    // No manual permission gate — launchImageLibraryAsync opens the OS's native
    // picker (Android Photo Picker / iOS PHPickerViewController), which needs no
    // app-level media permission at all (matches the pattern in Book.tsx).
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.7,
      selectionLimit: max - value.length,
    });
    if (!result.canceled) {
      const uris = result.assets.map(a => a.uri);
      onChange([...value, ...uris].slice(0, max));
    }
  }, [value, onChange, max]);

  const addPhoto = useCallback(() => {
    if (value.length >= max) return;
    Alert.alert('Add Completion Photo', undefined, [
      { text: 'Take Photo', onPress: takePhoto },
      { text: 'Choose from Library', onPress: pickFromLibrary },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }, [value.length, max, takePhoto, pickFromLibrary]);

  return (
    <View>
      <Text style={styles.label}>
        Completion Photos <Text style={styles.labelHint}>(up to {max})</Text>
      </Text>
      <TouchableOpacity
        style={styles.dropZone}
        onPress={value.length < max ? addPhoto : undefined}
        activeOpacity={0.75}
      >
        {value.length === 0 ? (
          <>
            <Ionicons name="camera-outline" size={32} color={colors.brand} />
            <Text style={styles.dropText}>Add photos of the finished job</Text>
          </>
        ) : (
          <View style={styles.grid}>
            {value.map((uri, i) => (
              <View key={uri + i} style={styles.thumb}>
                <Image source={{ uri }} style={styles.thumbImg} />
                <TouchableOpacity style={styles.thumbRemove} onPress={() => removePhoto(i)}>
                  <Text style={styles.thumbRemoveText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
            {value.length < max && (
              <TouchableOpacity style={styles.thumbAdd} onPress={addPhoto} activeOpacity={0.8}>
                <Text style={styles.thumbAddIcon}>+</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  label: { marginBottom: hp('0.6%'), paddingLeft: wp('1%'), fontSize: wp('3.5%'), fontWeight: '600', color: colors.textSecondary },
  labelHint: { color: colors.textMuted, fontWeight: '400' },
  dropZone: {
    borderWidth: 1.5,
    borderRadius: 12,
    borderColor: colors.brand,
    borderStyle: 'dashed',
    backgroundColor: colors.surface,
    paddingVertical: 22,
    paddingHorizontal: 12,
    marginBottom: hp('2%'),
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropText: { fontSize: wp('3.5%'), color: colors.brand, fontWeight: '500', marginTop: 8, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'flex-start', width: '100%' },
  thumb: { width: width * 0.17, height: width * 0.17, borderRadius: 10, overflow: 'hidden', position: 'relative' },
  thumbImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  thumbRemove: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 10,
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbRemoveText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  thumbAdd: {
    width: width * 0.17,
    height: width * 0.17,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.brand,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
  },
  thumbAddIcon: { fontSize: 24, color: colors.brand, lineHeight: 28, textAlign: 'center' },
});
