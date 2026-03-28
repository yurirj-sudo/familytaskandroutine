import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';
import {
  doc,
  setDoc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db } from '../firebase';
import { AppUser, Family, Member, FamilySettings } from '../types';
import { generateInviteCode } from './family.service';

// ─── Login ───────────────────────────────────────────────────────────────────

export const loginWithEmail = async (
  email: string,
  password: string
): Promise<void> => {
  await signInWithEmailAndPassword(auth, email, password);
};

// ─── Register — Criar Nova Família ───────────────────────────────────────────

export interface RegisterAdminParams {
  email: string;
  password: string;
  displayName: string;
  familyName: string;
  avatar?: string;
}

export const registerAdmin = async (params: RegisterAdminParams): Promise<string> => {
  const { email, password, displayName, familyName, avatar = '👤' } = params;

  // 1. Criar usuário no Firebase Auth
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  const { uid } = credential.user;

  await updateProfile(credential.user, { displayName });

  // 2. Gerar ID e inviteCode da família
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

  // 3. Criar documento da família
  const familyData: Omit<Family, 'id'> = {
    name: familyName,
    createdAt: serverTimestamp() as any,
    createdBy: uid,
    settings: defaultSettings,
    inviteCode,
  };
  await setDoc(familyRef, { id: familyId, ...familyData });

  // 4. Criar perfil global do usuário
  const userData: AppUser = {
    uid,
    email,
    displayName,
    avatar,
    familyId,
    createdAt: serverTimestamp() as any,
  };
  await setDoc(doc(db, 'users', uid), userData);

  // 5. Criar membro admin na família
  const memberData: Member = {
    uid,
    role: 'admin',
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

  return familyId;
};

// ─── Join Family — Entrar por Código de Convite ──────────────────────────────

export interface JoinFamilyParams {
  email: string;
  password: string;
  displayName: string;
  inviteCode: string;
  avatar?: string;
}

export const joinFamily = async (params: JoinFamilyParams): Promise<string> => {
  const { email, password, displayName, inviteCode, avatar = '👤' } = params;

  // 1. Buscar família pelo código
  const familiesRef = collection(db, 'families');
  const q = query(familiesRef, where('inviteCode', '==', inviteCode.toUpperCase()));
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    throw new Error('Código de convite inválido. Verifique e tente novamente.');
  }

  const familyDoc = snapshot.docs[0];
  const familyId = familyDoc.id;

  // 2. Criar usuário no Firebase Auth
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  const { uid } = credential.user;

  await updateProfile(credential.user, { displayName });

  // 3. Criar perfil global do usuário
  const userData: AppUser = {
    uid,
    email,
    displayName,
    avatar,
    familyId,
    createdAt: serverTimestamp() as any,
  };
  await setDoc(doc(db, 'users', uid), userData);

  // 4. Criar membro da família
  const memberData: Member = {
    uid,
    role: 'member',
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

  return familyId;
};

// ─── Logout ──────────────────────────────────────────────────────────────────

export const logout = async (): Promise<void> => {
  await signOut(auth);
};

// ─── Get User Data ───────────────────────────────────────────────────────────

export const getUserData = async (uid: string): Promise<AppUser | null> => {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? (snap.data() as AppUser) : null;
};

export const getMemberData = async (
  familyId: string,
  uid: string
): Promise<Member | null> => {
  const snap = await getDoc(doc(db, 'families', familyId, 'members', uid));
  return snap.exists() ? (snap.data() as Member) : null;
};

export const getFamilyData = async (familyId: string): Promise<Family | null> => {
  const snap = await getDoc(doc(db, 'families', familyId));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Family) : null;
};
