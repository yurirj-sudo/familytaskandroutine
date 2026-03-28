import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '../firebase';
import { Prize } from '../types';

// ─── Subscribe Prizes (real-time) ────────────────────────────────────────────

export const subscribePrizes = (
  familyId: string,
  onData: (prizes: Prize[]) => void,
  onError?: (err: Error) => void
): Unsubscribe => {
  const q = query(
    collection(db, 'families', familyId, 'prizes'),
    orderBy('order')
  );
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Prize))),
    onError
  );
};

// ─── Get Prizes (one-time) ───────────────────────────────────────────────────

export const getPrizes = async (familyId: string): Promise<Prize[]> => {
  const snap = await getDocs(
    query(collection(db, 'families', familyId, 'prizes'), orderBy('order'))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Prize));
};

// ─── Create Prize ────────────────────────────────────────────────────────────

export interface CreatePrizeParams {
  familyId: string;
  createdBy: string;
  data: {
    title: string;
    description?: string;
    emoji?: string;
    pointsCost: number;
    quantity: number | null;
  };
}

export const createPrize = async ({ familyId, createdBy, data }: CreatePrizeParams): Promise<string> => {
  const existing = await getPrizes(familyId);
  const maxOrder = existing.length > 0 ? Math.max(...existing.map((p) => p.order)) : 0;

  const ref = await addDoc(collection(db, 'families', familyId, 'prizes'), {
    ...data,
    quantityRedeemed: 0,
    isAvailable: true,
    createdBy,
    createdAt: serverTimestamp(),
    order: maxOrder + 1,
  });
  return ref.id;
};

// ─── Update Prize ────────────────────────────────────────────────────────────

export const updatePrize = async (
  familyId: string,
  prizeId: string,
  data: Partial<Omit<Prize, 'id' | 'createdBy' | 'createdAt' | 'quantityRedeemed'>>
): Promise<void> => {
  await updateDoc(doc(db, 'families', familyId, 'prizes', prizeId), data as Record<string, unknown>);
};

// ─── Toggle availability ──────────────────────────────────────────────────────

export const togglePrizeAvailability = async (
  familyId: string,
  prizeId: string,
  isAvailable: boolean
): Promise<void> => {
  await updateDoc(doc(db, 'families', familyId, 'prizes', prizeId), { isAvailable });
};
