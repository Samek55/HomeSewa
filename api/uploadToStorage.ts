import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from '../lib/supabase';

const BUCKET = 'uploads';

const getMimeType = (uri: string): string => {
  if (uri.includes('png')) return 'image/png';
  if (uri.includes('gif')) return 'image/gif';
  if (uri.includes('webp')) return 'image/webp';
  return 'image/jpeg';
};

const getExtension = (mimeType: string): string => {
  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'image/gif') return 'gif';
  if (mimeType === 'image/webp') return 'webp';
  return 'jpg';
};

const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
};

export const uploadToStorage = async (
  uri: string,
  fileName?: string,
): Promise<string> => {
  const mimeType = getMimeType(uri);
  const ext = getExtension(mimeType);
  const uniquePrefix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const safeName = fileName ? fileName.replace(/[^a-zA-Z0-9._-]/g, '') : `file.${ext}`;
  const path = `${uniquePrefix}-${safeName}`;

  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: 'base64' as any,
  });
  const arrayBuffer = base64ToArrayBuffer(base64);

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, arrayBuffer, { contentType: mimeType, upsert: false });

  if (error) throw new Error(`Storage upload failed: ${error.message}`);

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
};

export const uploadMultipleToStorage = async (
  files: { uri: string; fileName?: string }[],
): Promise<string[]> => {
  return Promise.all(files.map(f => uploadToStorage(f.uri, f.fileName)));
};
