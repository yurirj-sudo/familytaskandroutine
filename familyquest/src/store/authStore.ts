import { create } from 'zustand';
import { User as FirebaseUser } from 'firebase/auth';
import { Member, Family } from '../types';

interface AuthState {
  firebaseUser: FirebaseUser | null;
  member: Member | null;
  family: Family | null;
  loading: boolean;
  initialized: boolean;
}

interface AuthActions {
  setFirebaseUser: (user: FirebaseUser | null) => void;
  setMember: (member: Member | null) => void;
  setFamily: (family: Family | null) => void;
  setLoading: (loading: boolean) => void;
  setInitialized: (initialized: boolean) => void;
  reset: () => void;
}

const initialState: AuthState = {
  firebaseUser: null,
  member: null,
  family: null,
  loading: true,
  initialized: false,
};

export const useAuthStore = create<AuthState & AuthActions>((set) => ({
  ...initialState,

  setFirebaseUser: (user) => set({ firebaseUser: user }),
  setMember: (member) => set({ member }),
  setFamily: (family) => set({ family }),
  setLoading: (loading) => set({ loading }),
  setInitialized: (initialized) => set({ initialized }),

  reset: () => set({ ...initialState, loading: false, initialized: true }),
}));

// ─── Selectors ────────────────────────────────────────────────────────────────

export const useCurrentUser = () => useAuthStore((s) => s.firebaseUser);
export const useCurrentMember = () => useAuthStore((s) => s.member);
export const useCurrentFamily = () => useAuthStore((s) => s.family);
export const useIsAdmin = () => useAuthStore((s) => s.member?.role === 'admin');
export const useIsAuthenticated = () => useAuthStore((s) => s.firebaseUser !== null);
export const useAuthLoading = () => useAuthStore((s) => s.loading);
