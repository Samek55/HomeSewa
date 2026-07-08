import React, { useEffect } from 'react';
import {
  View,
  Modal,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Image,
} from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { widthPercentageToDP as wp } from 'react-native-responsive-screen';

const { width: SW } = Dimensions.get('window');
const CIRCLE = SW * 0.72;
const MIN_SCALE = 0.8;
const MAX_SCALE = 6;
const STEP = 0.4;

type Props = {
  visible: boolean;
  imageUri: string;
  onSave: (uri: string) => void;
  onCancel: () => void;
};

export default function HeadshotCropModal({ visible, imageUri, onSave, onCancel }: Props) {
  const scale      = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const tx         = useSharedValue(0);
  const ty         = useSharedValue(0);
  const savedTx    = useSharedValue(0);
  const savedTy    = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      scale.value = 1;
      savedScale.value = 1;
      tx.value = 0;
      ty.value = 0;
      savedTx.value = 0;
      savedTy.value = 0;
    }
  }, [visible]);

  const pinch = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = Math.max(MIN_SCALE, Math.min(savedScale.value * e.scale, MAX_SCALE));
    })
    .onEnd(() => {
      savedScale.value = scale.value;
    });

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      tx.value = savedTx.value + e.translationX;
      ty.value = savedTy.value + e.translationY;
    })
    .onEnd(() => {
      savedTx.value = tx.value;
      savedTy.value = ty.value;
    });

  const gesture = Gesture.Simultaneous(pinch, pan);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.value },
      { translateY: ty.value },
      { scale: scale.value },
    ],
  }));

  const thumbStyle = useAnimatedStyle(() => {
    const pct = (scale.value - MIN_SCALE) / (MAX_SCALE - MIN_SCALE);
    return {
      left: `${pct * 100}%` as any,
      transform: [{ translateX: -7 }],
    };
  });

  const zoomOut = () => {
    const next = Math.max(scale.value - STEP, MIN_SCALE);
    scale.value = next;
    savedScale.value = next;
  };

  const zoomIn = () => {
    const next = Math.min(scale.value + STEP, MAX_SCALE);
    scale.value = next;
    savedScale.value = next;
  };

  const getImageSize = (uri: string): Promise<{ width: number; height: number }> =>
    new Promise((resolve, reject) => {
      Image.getSize(uri, (width, height) => resolve({ width, height }), reject);
    });

  // Maps the visible circular viewport back onto the original image's pixel
  // coordinates (accounting for the "cover" fit plus the user's pinch/pan) so the
  // saved photo is actually cropped to what's shown, not the full original image.
  const handleSave = async () => {
    try {
      // Required lazily (not statically imported) so a dev client built before this
      // native module was added degrades to "uncropped image" instead of crashing
      // the whole screen at bundle-load time.
      const ImageManipulator = require('expo-image-manipulator');

      const { width: origW, height: origH } = await getImageSize(imageUri);
      const coverScale = Math.max(CIRCLE / origW, CIRCLE / origH);
      const totalScale = coverScale * scale.value;
      const displayedW = origW * totalScale;
      const displayedH = origH * totalScale;
      const imageTopLeftX = CIRCLE / 2 + tx.value - displayedW / 2;
      const imageTopLeftY = CIRCLE / 2 + ty.value - displayedH / 2;

      const cropSize = Math.min(CIRCLE / totalScale, origW, origH);
      const originX = Math.max(0, Math.min(-imageTopLeftX / totalScale, origW - cropSize));
      const originY = Math.max(0, Math.min(-imageTopLeftY / totalScale, origH - cropSize));

      const result = await ImageManipulator.manipulateAsync(
        imageUri,
        [{ crop: { originX, originY, width: cropSize, height: cropSize } }],
        { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG }
      );
      onSave(result.uri);
    } catch (e) {
      console.warn('Headshot crop failed, using original image:', e);
      onSave(imageUri);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Crop Your Profile Picture</Text>
          <Text style={styles.hint}>Pinch to zoom  ·  Drag to reposition</Text>

          {/* Circular preview */}
          <View style={styles.cropWrapper}>
            <GestureDetector gesture={gesture}>
              <Animated.Image
                source={{ uri: imageUri }}
                style={[styles.image, animatedStyle]}
                resizeMode="cover"
              />
            </GestureDetector>

            {/* Rule-of-thirds grid */}
            <View pointerEvents="none" style={StyleSheet.absoluteFill}>
              <View style={styles.gridRow} />
              <View style={[styles.gridRow, { top: '66.6%' }]} />
              <View style={styles.gridCol} />
              <View style={[styles.gridCol, { left: '66.6%' }]} />
            </View>

            <View pointerEvents="none" style={styles.circleBorder} />
          </View>

          {/* Zoom slider */}
          <View style={styles.zoomRow}>
            <TouchableOpacity onPress={zoomOut} hitSlop={12} activeOpacity={0.6}>
              <Text style={styles.zoomIcon}>−</Text>
            </TouchableOpacity>
            <View style={styles.zoomTrack}>
              <Animated.View style={[styles.zoomThumb, thumbStyle]} />
            </View>
            <TouchableOpacity onPress={zoomIn} hitSlop={12} activeOpacity={0.6}>
              <Text style={styles.zoomIcon}>+</Text>
            </TouchableOpacity>
          </View>

          {/* Buttons */}
          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.btnCancel} onPress={onCancel} activeOpacity={0.8}>
              <Text style={styles.btnCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.btnSave}
              onPress={handleSave}
              activeOpacity={0.8}
            >
              <Text style={styles.btnSaveText}>{'Crop &\nSave'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.60)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    width: SW * 0.88,
    backgroundColor: '#fff',
    borderRadius: 22,
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
    elevation: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
  },
  title: {
    fontSize: wp('5%'),
    fontWeight: '700',
    color: '#1C2B2A',
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  hint: {
    fontSize: wp('3%'),
    color: '#9BBAB8',
    marginBottom: 18,
    fontWeight: '500',
  },
  cropWrapper: {
    width: CIRCLE,
    height: CIRCLE,
    borderRadius: CIRCLE / 2,
    overflow: 'hidden',
    backgroundColor: '#111',
    marginBottom: 16,
  },
  image: {
    width: CIRCLE,
    height: CIRCLE,
  },
  circleBorder: {
    position: 'absolute',
    inset: 0,
    borderRadius: CIRCLE / 2,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  gridRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '33.3%',
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  gridCol: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '33.3%',
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  zoomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
    width: '80%',
  },
  zoomIcon: {
    fontSize: 20,
    color: '#295C59',
    fontWeight: '700',
    width: 18,
    textAlign: 'center',
  },
  zoomTrack: {
    flex: 1,
    height: 4,
    backgroundColor: '#E8F4F3',
    borderRadius: 2,
    position: 'relative',
  },
  zoomThumb: {
    position: 'absolute',
    top: -5,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#295C59',
  },
  btnRow: {
    flexDirection: 'row',
    gap: 14,
    width: '100%',
  },
  btnCancel: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
  },
  btnCancelText: {
    fontSize: wp('4%'),
    fontWeight: '700',
    color: '#1C2B2A',
  },
  btnSave: {
    flex: 1,
    backgroundColor: '#295C59',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  btnSaveText: {
    fontSize: wp('4%'),
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    lineHeight: 20,
  },
});
