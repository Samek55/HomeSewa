import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Modal,
  Dimensions,
  Platform
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';

import ArrowDownIcon from '../../assets/icons/contact/downarrow.png';
import DelIcon from '../../assets/icons/contact/deleteicon.png';

const { width, height } = Dimensions.get('window');

type FileItem = {
  uri: string;
  fileName?: string;
  sizeMB?: number;
};

type Props = {
  value: FileItem[];
  onChange: (files: FileItem[]) => void;
};

const FileUploadBox: React.FC<Props> = ({ value, onChange }) => {
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);

  const pickImages = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsMultipleSelection: true,
      quality: 0.7,
    });

    if (result.canceled) return;

    const newFiles = result.assets.map(asset => ({
      uri: asset.uri,
      fileName: asset.fileName || 'Unnamed file',
      sizeMB: asset.fileSize
        ? +(asset.fileSize / (1024 * 1024)).toFixed(2)
        : 0,
    }));

    onChange([...value, ...newFiles]);
  };

  const removeFile = (uri: string) => {
    const updated = value.filter(item => item.uri !== uri);
    onChange(updated);

    if (previewIndex !== null) {
      const newLength = updated.length;
      if (newLength === 0) setPreviewIndex(null);
      else if (previewIndex >= newLength) setPreviewIndex(newLength - 1);
    }
  };

  return (
    <View style={styles.container}>
      {/* EMPTY DASHED UPLOAD BOX */}
      {value.length === 0 && (
        <TouchableOpacity style={styles.boxEmpty} onPress={pickImages} activeOpacity={0.7}>
          <View style={styles.emptyState}>
            <Image source={ArrowDownIcon} style={styles.uploadIcon} />
            <Text style={styles.placeholder}>
              Drop files/photos here
            </Text>
          </View>
        </TouchableOpacity>
      )}

      {/* STABLE GRID CONTAINER AND ITEMS */}
      {value.length > 0 && (
        <View style={styles.boxFilled}>
          <View style={styles.previewGrid}>
            {value.map((item, index) => (
              <View key={item.uri} style={styles.columnWrapper}>
                <TouchableOpacity
                  onPress={() => setPreviewIndex(index)}
                  style={styles.previewCard}
                  activeOpacity={0.9}
                >
                  <Image source={{ uri: item.uri }} style={styles.previewImage} />

                  <View style={styles.previewInfo}>
                    <Text style={styles.name} numberOfLines={1}>
                      {item.fileName}
                    </Text>
                    {item.sizeMB !== undefined && item.sizeMB > 0 ? (
                      <Text style={styles.size}>{item.sizeMB} MB</Text>
                    ) : null}
                  </View>

                  <TouchableOpacity 
                    onPress={() => removeFile(item.uri)} 
                    style={styles.deleteHitSlop}
                  >
                    <Image source={DelIcon} style={styles.deleteIcon} />
                  </TouchableOpacity>
                </TouchableOpacity>
              </View>
            ))}

            {/* SYMMETRICAL ADD MORE ATTACHMENT ACTION */}
            <View style={styles.columnWrapper}>
              <TouchableOpacity style={styles.addMore} onPress={pickImages} activeOpacity={0.7}>
                <Text style={styles.addText}>+ Add more</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* FULL SCREEN LIGHTBOX DIALOG PREVIEW */}
      <Modal visible={previewIndex !== null} transparent={true} animationType="fade">
        <View style={styles.modalContainer}>
          {/* Close Button Header Area */}
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={() => setPreviewIndex(null)}
          >
            <Text style={{ color: '#fff', fontSize: 22, fontWeight: '300' }}>✕</Text>
          </TouchableOpacity>

          {previewIndex !== null && (
            <Image
              source={{ uri: value[previewIndex].uri }}
              style={styles.fullImage}
              resizeMode="contain"
            />
          )}

          {previewIndex !== null && (
            <TouchableOpacity
              style={styles.deleteFromPreview}
              onPress={() => removeFile(value[previewIndex].uri)}
            >
              <Text style={{ color: 'white', fontWeight: '600', fontSize: 14 }}>
                Delete File
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </Modal>
    </View>
  );
};

export default FileUploadBox;

const styles = StyleSheet.create({
  container: {
    marginTop: 6,
    marginBottom: 16,
  },
  // High-fidelity empty state configuration matching dynamic style specs
  boxEmpty: {
    minHeight: 110,
    borderWidth: 1.5,
    borderRadius: 12,
    borderStyle: 'dashed',
    borderColor: '#B2C5FF',       // Elegant layout preview branding theme hue
    backgroundColor: '#F8FAFC',   // Cream neutral slate backdrop tint
    padding: 16,
    justifyContent: 'center',
  },
  boxFilled: {
    minHeight: 110,
    borderWidth: 1.5,
    borderRadius: 12,
    borderColor: '#E2E8F0',       // Uniform inline static wrapper profile gray
    backgroundColor: '#fff',
    padding: 8,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadIcon: {
    width: 24,
    height: 24,
    tintColor: '#2F6BFF',         // Matches universal focus theme engine glow accent
  },
  placeholder: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: '600',
    color: '#4B5563',
  },
  // Optimized Grid mechanics to replace cross-platform gap rendering limitations
  previewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  columnWrapper: {
    width: '50%',
    padding: 6,
  },
  previewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',   // Light gray layout card backgrounds
    padding: 8,
    borderRadius: 10,
    height: 56,
  },
  previewImage: {
    width: 38,
    height: 38,
    borderRadius: 6,
    backgroundColor: '#E2E8F0',
  },
  previewInfo: {
    flex: 1,
    paddingHorizontal: 8,
  },
  name: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E293B',
  },
  size: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  deleteHitSlop: {
    padding: 4,
  },
  deleteIcon: {
    width: 14,
    height: 14,
    tintColor: '#94A3B8',
  },
  addMore: {
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#CBD5E1',
    backgroundColor: '#FAFAFA',
  },
  addText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2F6BFF',
  },
  /* PREVIEW INTERACTION DIALOG BLUEPRINTS */
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImage: {
    width: width,
    height: height * 0.75,
  },
  closeBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 54 : 30,
    left: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteFromPreview: {
    position: 'absolute',
    bottom: 50,
    backgroundColor: '#EF4444',   // Standardized destruct item alert color hex
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
});