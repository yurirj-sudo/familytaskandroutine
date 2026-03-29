import { Timestamp } from 'firebase/firestore';

// ─── Family ─────────────────────────────────────────────────────────────────

export interface FamilySettings {
  pointsMode: 'monthly_reset' | 'accumulate';
  requireTaskApproval: boolean;
  requirePhotoProof: boolean;
  timezone: string;
  notificationsEnabled: boolean;
}

export interface Family {
  id: string;
  name: string;
  createdAt: Timestamp;
  createdBy: string;
  settings: FamilySettings;
  inviteCode: string;
}

// ─── User ────────────────────────────────────────────────────────────────────

export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  avatar: string; // emoji ou URL
  familyId: string;
  createdAt: Timestamp;
}

// ─── Member ──────────────────────────────────────────────────────────────────

export type MemberRole = 'admin' | 'member' | 'viewer';

export interface Member {
  uid: string;
  role: MemberRole;
  displayName: string;
  avatar: string;
  totalPoints: number;
  lifetimePoints: number;
  currentStreak: number;
  longestStreak: number;
  joinedAt: Timestamp;
  fcmToken?: string;
  isActive: boolean;
}

// ─── Task ────────────────────────────────────────────────────────────────────

export type TaskType = 'mandatory' | 'optional';
export type TaskFrequency = 'daily' | 'weekly' | 'monthly' | 'monthly_relative' | 'once';

export interface Task {
  id: string;
  title: string;
  description?: string;
  category: string;
  emoji?: string;
  type: TaskType;
  frequency: TaskFrequency;
  activeDays?: number[];         // [0-6], usado em 'weekly'
  dayOfMonth?: number;           // 1-28, usado em 'monthly'
  weekOfMonth?: 1 | 2 | 3 | 4;  // usado em 'monthly_relative'
  dayOfWeekRelative?: number;    // 0-6, usado em 'monthly_relative'
  dueTime?: string;              // "08:00"
  pointsOnComplete: number;
  pointsOnMiss: number;          // negativo, só mandatory
  assignedTo: string[] | 'all';
  requireApproval: boolean;      // true: filho submete → pai aprova antes dos pontos
  requirePhotoProof: boolean;    // true: exige foto ao marcar como concluída
  sharedCompletion: boolean;     // true: 1 conclusão serve para todos os atribuídos
  createdBy: string;
  createdAt: Timestamp;
  isActive: boolean;
  order: number;
  startDate?: Date;              // para frequência 'once'
}

// ─── Completion ──────────────────────────────────────────────────────────────

export type CompletionStatus =
  | 'pending'
  | 'submitted'
  | 'approved'
  | 'rejected'
  | 'missed'
  | 'completed';

export interface Completion {
  id: string; // determinístico: {taskId}_{uid}_{YYYY-MM-DD}
  taskId: string;
  taskTitle: string;
  taskType: TaskType;
  userId: string;
  familyId: string;
  status: CompletionStatus;
  pointsAwarded: number;
  photoProofUrl?: string;
  completedAt?: Timestamp;
  submittedAt?: Timestamp;
  reviewedAt?: Timestamp;
  reviewedBy?: string;
  rejectionReason?: string;
  dueDate: Timestamp;
  cycleId: string;
  note?: string;
}

// ─── Prize ───────────────────────────────────────────────────────────────────

export interface Prize {
  id: string;
  title: string;
  description?: string;
  emoji?: string;
  pointsCost: number;
  quantity: number | null; // null = ilimitado
  quantityRedeemed: number;
  isAvailable: boolean;
  createdBy: string;
  createdAt: Timestamp;
  order: number;
}

// ─── Redemption ──────────────────────────────────────────────────────────────

export interface Redemption {
  id: string;
  prizeId: string;
  prizeTitle: string;
  prizeEmoji?: string;
  pointsCost: number;
  userId: string;
  userName: string;
  familyId: string;
  status: 'approved';
  redeemedAt: Timestamp;
  cycleId: string;
}

// ─── Cycle ───────────────────────────────────────────────────────────────────

export interface Cycle {
  id: string; // formato: "2025-03"
  familyId: string;
  userId: string;
  month: number;
  year: number;
  pointsEarned: number;
  pointsLost: number;
  pointsSpent: number;
  finalScore: number;
  tasksCompleted: number;
  tasksMissed: number;
  completionRate: number; // 0-100
  rank?: number;
  status: 'active' | 'closed';
  openedAt: Timestamp;
  closedAt?: Timestamp;
}
