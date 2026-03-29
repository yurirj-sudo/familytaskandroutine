import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
  onSnapshot,
  runTransaction,
  writeBatch,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '../firebase';
import { Family, FamilySettings, Member } from '../types';

// ─── Generate Invite Code ─────────────────────────────────────────────────────

export const generateInviteCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sem confusão O/0, I/1
  return Array.from({ length: 6 }, () =>
    chars.charAt(Math.floor(Math.random() * chars.length))
  ).join('');
};

// ─── Get Family ───────────────────────────────────────────────────────────────

export const getFamilyById = async (familyId: string): Promise<Family | null> => {
  const snap = await getDoc(doc(db, 'families', familyId));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Family) : null;
};

export const getFamilyByInviteCode = async (
  inviteCode: string
): Promise<Family | null> => {
  const q = query(
    collection(db, 'families'),
    where('inviteCode', '==', inviteCode.toUpperCase())
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  const docSnap = snapshot.docs[0];
  return { id: docSnap.id, ...docSnap.data() } as Family;
};

// ─── Create Family ────────────────────────────────────────────────────────────

export const createFamily = async (
  adminUid: string,
  familyName: string
): Promise<string> => {
  const familyRef = doc(collection(db, 'families'));
  const familyId = familyRef.id;
  const inviteCode = generateInviteCode();

  const defaultSettings: FamilySettings = {
    pointsMode: 'monthly_reset',
    requireTaskApproval: false,
    requirePhotoProof: false,
    timezone: 'America/Sao_Paulo',
    notificationsEnabled: false,
  };

  await setDoc(familyRef, {
    id: familyId,
    name: familyName,
    createdAt: serverTimestamp(),
    createdBy: adminUid,
    settings: defaultSettings,
    inviteCode,
  });

  return familyId;
};

// ─── Update Family Settings ───────────────────────────────────────────────────

export const updateFamilySettings = async (
  familyId: string,
  settings: Partial<FamilySettings>
): Promise<void> => {
  const updates: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(settings)) {
    updates[`settings.${key}`] = value;
  }
  await updateDoc(doc(db, 'families', familyId), updates);
};

// ─── Members ──────────────────────────────────────────────────────────────────

export const addMemberToFamily = async (
  familyId: string,
  uid: string,
  role: Member['role'],
  displayName: string,
  avatar: string = '👤'
): Promise<void> => {
  const memberData: Member = {
    uid,
    role,
    displayName,
    avatar,
    totalPoints: 0,
    lifetimePoints: 0,
    currentStreak: 0,
    longestStreak: 0,
    joinedAt: serverTimestamp() as any,
    isActive: true,
  };
  await setDoc(doc(db, 'families', familyId, 'members', uid), memberData);
};

export const getFamilyMembers = async (familyId: string): Promise<Member[]> => {
  const snap = await getDocs(
    collection(db, 'families', familyId, 'members')
  );
  return snap.docs.map((d) => d.data() as Member);
};

// ─── Subscribe Family Members (real-time) ─────────────────────────────────
export const subscribeFamilyMembers = (
  familyId: string,
  onData: (members: Member[]) => void,
  onError?: (err: Error) => void
): Unsubscribe => {
  return onSnapshot(
    collection(db, 'families', familyId, 'members'),
    (snap) => onData(snap.docs.map((d) => d.data() as Member)),
    onError
  );
};

// ─── Update Member Role ───────────────────────────────────────────────────
export const updateMemberRole = async (
  familyId: string,
  uid: string,
  role: Member['role']
): Promise<void> => {
  await updateDoc(doc(db, 'families', familyId, 'members', uid), { role });
};

// ─── Deactivate Member ────────────────────────────────────────────────────
export const deactivateMember = async (
  familyId: string,
  uid: string
): Promise<void> => {
  await updateDoc(doc(db, 'families', familyId, 'members', uid), { isActive: false });
};

// ─── Reset Member History ─────────────────────────────────────────────────
export const resetMemberHistory = async (
  familyId: string,
  uid: string
): Promise<void> => {
  // 1. Zero out member stats
  await updateDoc(doc(db, 'families', familyId, 'members', uid), {
    totalPoints: 0,
    lifetimePoints: 0,
    currentStreak: 0,
    longestStreak: 0,
    lastStreakDate: null,
  });

  const BATCH_SIZE = 400;

  const deleteDocs = async (snap: { docs: { ref: unknown }[] }) => {
    for (let i = 0; i < snap.docs.length; i += BATCH_SIZE) {
      const batch = writeBatch(db);
      (snap.docs.slice(i, i + BATCH_SIZE) as { ref: Parameters<typeof batch.delete>[0] }[])
        .forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
  };

  // 2. Delete all completions for this member
  const completionsSnap = await getDocs(
    query(collection(db, 'families', familyId, 'completions'), where('userId', '==', uid))
  );
  if (!completionsSnap.empty) await deleteDocs(completionsSnap);

  // 3. Delete all redemptions for this member
  const redemptionsSnap = await getDocs(
    query(collection(db, 'families', familyId, 'redemptions'), where('userId', '==', uid))
  );
  if (!redemptionsSnap.empty) await deleteDocs(redemptionsSnap);
};

// ─── Adjust Member Points (admin manual adjustment) ───────────────────────
export const adjustMemberPoints = async (
  familyId: string,
  uid: string,
  delta: number   // positive = add, negative = deduct
): Promise<void> => {
  const memberRef = doc(db, 'families', familyId, 'members', uid);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(memberRef);
    if (!snap.exists()) throw new Error('Membro não encontrado');
    const data = snap.data();
    const newTotal = Math.max(0, (data.totalPoints ?? 0) + delta);
    const newLifetime = delta > 0
      ? (data.lifetimePoints ?? 0) + delta
      : data.lifetimePoints ?? 0;
    tx.update(memberRef, { totalPoints: newTotal, lifetimePoints: newLifetime });
  });
};
