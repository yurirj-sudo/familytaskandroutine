import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '../firebase';
import { Task } from '../types';

// ─── Create Task ──────────────────────────────────────────────────────────────

export interface CreateTaskParams {
  familyId: string;
  createdBy: string;
  data: Omit<Task, 'id' | 'createdBy' | 'createdAt' | 'isActive' | 'order'>;
}

export const createTask = async ({ familyId, createdBy, data }: CreateTaskParams): Promise<string> => {
  // get current max order
  const snap = await getDocs(
    query(collection(db, 'families', familyId, 'tasks'), orderBy('order', 'desc'))
  );
  const maxOrder = snap.empty ? 0 : (snap.docs[0].data().order ?? 0);

  const ref = await addDoc(collection(db, 'families', familyId, 'tasks'), {
    ...data,
    createdBy,
    createdAt: serverTimestamp(),
    isActive: true,
    order: maxOrder + 1,
  });
  return ref.id;
};

// ─── Update Task ──────────────────────────────────────────────────────────────

export const updateTask = async (
  familyId: string,
  taskId: string,
  data: Partial<Omit<Task, 'id' | 'createdBy' | 'createdAt'>>
): Promise<void> => {
  await updateDoc(doc(db, 'families', familyId, 'tasks', taskId), data as Record<string, unknown>);
};

// ─── Deactivate Task (soft delete) ───────────────────────────────────────────

export const deactivateTask = async (familyId: string, taskId: string): Promise<void> => {
  await updateDoc(doc(db, 'families', familyId, 'tasks', taskId), { isActive: false });
};

// ─── Delete Task (hard delete, use carefully) ─────────────────────────────────

export const deleteTask = async (familyId: string, taskId: string): Promise<void> => {
  await deleteDoc(doc(db, 'families', familyId, 'tasks', taskId));
};

// ─── Get Active Tasks (one-time) ──────────────────────────────────────────────

export const getActiveTasks = async (familyId: string): Promise<Task[]> => {
  const snap = await getDocs(
    query(
      collection(db, 'families', familyId, 'tasks'),
      where('isActive', '==', true),
      orderBy('order')
    )
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Task));
};

// ─── Subscribe Active Tasks (real-time) ──────────────────────────────────────

export const subscribeActiveTasks = (
  familyId: string,
  onData: (tasks: Task[]) => void,
  onError?: (err: Error) => void
): Unsubscribe => {
  const q = query(
    collection(db, 'families', familyId, 'tasks'),
    where('isActive', '==', true),
    orderBy('order')
  );
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Task))),
    onError
  );
};

// ─── Reorder Tasks ────────────────────────────────────────────────────────────

export const reorderTasks = async (
  familyId: string,
  orderedIds: string[]
): Promise<void> => {
  await Promise.all(
    orderedIds.map((id, index) =>
      updateDoc(doc(db, 'families', familyId, 'tasks', id), { order: index + 1 })
    )
  );
};
