import React from 'react';
import {
  View,
  Modal,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { widthPercentageToDP as wp } from 'react-native-responsive-screen';

const { width: SW } = Dimensions.get('window');
const CIRCLE = SW * 0.72;

type Props = {
  visible: boolean;
  imageUri: string;
  onSave: () => void;
  onCancel: () => void;
};

export default function HeadshotCropModal({ visible, imageUri, onSave, onCancel }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Crop Your Profile Picture</Text>

          {/* Circular crop preview with grid */}
          <View style={styles.cropWrapper}>
            <Image source={{ uri: imageUri }} style={styles.image} resizeMode="cover" />

            {/* Rule-of-thirds grid lines */}
            <View pointerEvents="none" style={StyleSheet.absoluteFill}>
              <View style={styles.gridRow} />
              <View style={[styles.gridRow, { top: '66.6%' }]} />
              <View style={styles.gridCol} />
              <View style={[styles.gridCol, { left: '66.6%' }]} />
            </View>
          </View>

          {/* Buttons */}
          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.btnCancel} onPress={onCancel} activeOpacity={0.8}>
              <Text style={styles.btnCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnSave} onPress={onSave} activeOpacity={0.8}>
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
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    width: SW * 0.88,
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  title: {
    fontSize: wp('5%'),
    fontWeight: '700',
    color: '#1C2B2A',
    marginBottom: 20,
    letterSpacing: 0.2,
  },
  cropWrapper: {
    width: CIRCLE,
    height: CIRCLE,
    borderRadius: CIRCLE / 2,
    overflow: 'hidden',
    backgroundColor: '#000',
    marginBottom: 24,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  gridRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '33.3%',
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  gridCol: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '33.3%',
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.4)',
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
    backgroundColor: '#1C2B2A',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSaveText: {
    fontSize: wp('4%'),
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    lineHeight: 20,
  },
});
