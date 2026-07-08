import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from '../lib/supabase';

const BUCKET = 'uploads';
// Government ID / citizenship / driving licence documents are sensitive — they go in a
// private bucket and are only ever accessed via a short-lived signed URL, never a
// permanent public link (see getSignedDocumentUrl below).
const PRIVATE_DOCS_BUCKET = 'id-documents';

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

const buildUploadPath = (uri: string, fileName?: string) => {
  const mimeType = getMimeType(uri);
  const ext = getExtension(mimeType);
  const uniquePrefix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const safeName = fileName ? fileName.replace(/[^a-zA-Z0-9._-]/g, '') : `file.${ext}`;
  return { mimeType, path: `${uniquePrefix}-${safeName}` };
};

const readFileAsArrayBuffer = async (uri: string): Promise<ArrayBuffer> => {
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: 'base64' as any,
  });
  return base64ToArrayBuffer(base64);
};

export const uploadToStorage = async (
  uri: string,
  fileName?: string,
): Promise<string> => {
  const { mimeType, path } = buildUploadPath(uri, fileName);
  const arrayBuffer = await readFileAsArrayBuffer(uri);

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

// Government ID documents go to a private bucket — this returns the storage PATH,
// not a public URL. The document can only be viewed via getSignedDocumentUrl below,
// which requires a deliberate call from an authenticated admin screen and expires quickly.
export const uploadPrivateDocument = async (
  uri: string,
  fileName?: string,
): Promise<string> => {
  const { mimeType, path } = buildUploadPath(uri, fileName);
  const arrayBuffer = await readFileAsArrayBuffer(uri);

  const { error } = await supabase.storage
    .from(PRIVATE_DOCS_BUCKET)
    .upload(path, arrayBuffer, { contentType: mimeType, upsert: false });

  if (error) throw new Error(`Private document upload failed: ${error.message}`);

  return path;
};

export const uploadMultiplePrivateDocuments = async (
  files: { uri: string; fileName?: string }[],
): Promise<string[]> => {
  return Promise.all(files.map(f => uploadPrivateDocument(f.uri, f.fileName)));
};

// Generates a temporary, expiring URL to view a private document — never a permanent
// public link. Defaults to 60 seconds, which is enough time to open it once.
export const getSignedDocumentUrl = async (path: string, expiresInSeconds = 60): Promise<string> => {
  const { data, error } = await supabase.storage
    .from(PRIVATE_DOCS_BUCKET)
    .createSignedUrl(path, expiresInSeconds);

  if (error || !data?.signedUrl) throw new Error(error?.message || 'Could not generate document link');
  return data.signedUrl;
};
