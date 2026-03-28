import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '../firebase';
import { Cycle } from '../types';

// ─── Subscribe to member's cycle history (last 12 months) ────────────────────

export const subscribeMemberCycles = (
  familyId: string,
  userId: string,
  onData: (cycles: Cycle[]) => void,
  onError?: (err: Error) => void
): Unsubscribe => {
  const q = query(
    collection(db, 'families', familyId, 'cycles'),
    where('userId', '==', userId),
    orderBy('year', 'desc'),
    orderBy('month', 'desc'),
    limit(12)
  );
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Cycle))),
    onError
  );
};

// ─── Subscribe to all members' cycles for current month (ranking) ─────────────

export const subscribeFamilyCurrentCycles = (
  familyId: string,
  month: number,
  year: number,
  onData: (cycles: Cycle[]) => void,
  onError?: (err: Error) => void
): Unsubscribe => {
  const q = query(
    collection(db, 'families', familyId, 'cycles'),
    where('month', '==', month),
    where('year', '==', year)
  );
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Cycle))),
    onError
  );
};

// ─── Subscribe to ALL family cycles for all months (admin analytics) ──────────

export const subscribeFamilyAllCycles = (
  familyId: string,
  onData: (cycles: Cycle[]) => void,
  onError?: (err: Error) => void
): Unsubscribe => {
  const q = query(
    collection(db, 'families', familyId, 'cycles'),
    orderBy('year', 'desc'),
    orderBy('month', 'desc'),
    limit(100)
  );
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Cycle))),
    onError
  );
};
