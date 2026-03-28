import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';

/**
 * Faz upload da foto-prova de uma tarefa e retorna a URL pública.
 * Path: families/{familyId}/proofs/{taskId}_{uid}_{date}.jpg
 */
export const uploadTaskProof = async (
  familyId: string,
  taskId: string,
  userId: string,
  file: File
): Promise<string> => {
  const date = new Date().toISOString().split('T')[0];
  const ext = file.type.includes('png') ? 'png' : 'jpg';
  const path = `families/${familyId}/proofs/${taskId}_${userId}_${date}.${ext}`;
  const storageRef = ref(storage, path);
  const snapshot = await uploadBytes(storageRef, file);
  return getDownloadURL(snapshot.ref);
};
