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
