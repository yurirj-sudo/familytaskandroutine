import { useState, useEffect } from 'react';
import { Task } from '../types';
import { subscribeActiveTasks, subscribeInactiveTasks } from '../services/task.service';
import { isTaskDueToday } from '../utils/recurrence';

// ─── All active tasks (real-time) ────────────────────────────────────────────

export const useTasks = (familyId: string | undefined) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!familyId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsub = subscribeActiveTasks(
      familyId,
      (data) => {
        setTasks(data);
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );
    return unsub;
  }, [familyId]);

  return { tasks, loading, error };
};

// ─── Tasks due today for a specific member ────────────────────────────────────

export const useTodayTasks = (familyId: string | undefined, userId: string | undefined) => {
  const { tasks, loading, error } = useTasks(familyId);

  const todayTasks = tasks.filter((task) => {
    if (!isTaskDueToday(task)) return false;
    if (task.assignedTo === 'all') return true;
    if (Array.isArray(task.assignedTo)) return task.assignedTo.includes(userId ?? '');
    return false;
  });

  const mandatory = todayTasks.filter((t) => t.type === 'mandatory');
  const optional = todayTasks.filter((t) => t.type === 'optional');

  return { todayTasks, mandatory, optional, loading, error };
};

// ─── Inactive / archived tasks (real-time) ───────────────────────────────────

export const useInactiveTasks = (familyId: string | undefined) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!familyId) { setLoading(false); return; }
    setLoading(true);
    const unsub = subscribeInactiveTasks(familyId, (data) => {
      setTasks(data);
      setLoading(false);
    });
    return unsub;
  }, [familyId]);

  return { tasks, loading };
};
