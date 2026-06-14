import { Platform } from 'react-native';

const CLOUDINARY_URL = process.env.EXPO_PUBLIC_CLOUDINARY_URL;
const UPLOAD_PRESET = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

const getMimeType = (uri: string): string => {
  if (uri.includes('png')) return 'image/png';
  if (uri.includes('gif')) return 'image/gif';
  if (uri.includes('webp')) return 'image/webp';
  return 'image/jpeg';
};

export const uploadToCloudinary = async (
  uri: string,
  fileName?: string,
): Promise<string> => {
  if (!CLOUDINARY_URL || !UPLOAD_PRESET) {
    throw new Error('Cloudinary config missing from environment variables.');
  }

  const formData = new FormData();

  // React Native requires the file to be appended as an object with uri/type/name
  formData.append('file', {
    uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
    type: getMimeType(uri),
    name: fileName || 'upload.jpg',
  } as any);

  formData.append('upload_preset', UPLOAD_PRESET);

  const response = await fetch(CLOUDINARY_URL, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Cloudinary upload failed (${response.status}): ${err}`);
  }

  const data = await response.json();
  return data.secure_url as string;
};

export const uploadMultipleToCloudinary = async (
  files: { uri: string; fileName?: string }[],
): Promise<string[]> => {
  return Promise.all(files.map(f => uploadToCloudinary(f.uri, f.fileName)));
};
