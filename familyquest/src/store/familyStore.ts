import { create } from 'zustand';
import { Family, Member } from '../types';

interface FamilyState {
  family: Family | null;
  members: Member[];
  loadingMembers: boolean;
}

interface FamilyActions {
  setFamily: (family: Family | null) => void;
  setMembers: (members: Member[]) => void;
  setLoadingMembers: (loading: boolean) => void;
  reset: () => void;
}

const initialState: FamilyState = {
  family: null,
  members: [],
  loadingMembers: false,
};

export const useFamilyStore = create<FamilyState & FamilyActions>((set) => ({
  ...initialState,

  setFamily: (family) => set({ family }),
  setMembers: (members) => set({ members }),
  setLoadingMembers: (loading) => set({ loadingMembers: loading }),

  reset: () => set(initialState),
}));

// ─── Selectors ────────────────────────────────────────────────────────────────

export const useFamily = () => useFamilyStore((s) => s.family);
export const useFamilyMembers = () => useFamilyStore((s) => s.members);
export const useFamilySettings = () => useFamilyStore((s) => s.family?.settings);
export const useInviteCode = () => useFamilyStore((s) => s.family?.inviteCode);
