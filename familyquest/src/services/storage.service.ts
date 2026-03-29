import { compressImageToDataUrl } from '../utils/imageCompress';

/**
 * Compresses the proof photo in-browser and returns a base64 data URL.
 * The data URL is stored directly in the Firestore completion document
 * (no Firebase Storage required — free tier safe).
 * Typical output: 20–40 KB JPEG, well within Firestore's 1 MB doc limit.
 */
export const uploadTaskProof = async (
  _familyId: string,
  _taskId: string,
  _userId: string,
  file: File
): Promise<string> => {
  return compressImageToDataUrl(file);
};
