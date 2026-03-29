import { useState, useEffect } from 'react';
import { Completion } from '../types';
import {
  subscribeTodayCompletions,
  subscribeFamilyTodayCompletions,
  subscribePendingApprovals,
} from '../services/completion.service';

// ─── Today's completions for a member (real-time) ────────────────────────────

export const useTodayCompletions = (
  familyId: string | undefined,
  userId: string | undefined
) => {
  const [completions, setCompletions] = useState<Completion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!familyId || !userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsub = subscribeTodayCompletions(familyId, userId, (data) => {
      setCompletions(data);
      setLoading(false);
    });
    return unsub;
  }, [familyId, userId]);

  // Build a map taskId → completion for quick lookup
  const completionMap = new Map(completions.map((c) => [c.taskId, c]));

  return { completions, completionMap, loading };
};

// ─── All family completions for today (real-time) — used for shared tasks ─────

export const useFamilyTodayCompletions = (familyId: string | undefined) => {
  const [completions, setCompletions] = useState<Completion[]>([]);

  useEffect(() => {
    if (!familyId) return;
    const unsub = subscribeFamilyTodayCompletions(familyId, setCompletions);
    return unsub;
  }, [familyId]);

  // Map taskId → first non-pending completion (shared task lookup)
  const sharedCompletionMap = new Map<string, Completion>();
  for (const c of completions) {
    if (c.status !== 'pending' && !sharedCompletionMap.has(c.taskId)) {
      sharedCompletionMap.set(c.taskId, c);
    }
  }

  return { completions, sharedCompletionMap };
};

// ─── Pending approvals (admin, real-time) ─────────────────────────────────────

export const usePendingApprovals = (familyId: string | undefined) => {
  const [approvals, setApprovals] = useState<Completion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!familyId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsub = subscribePendingApprovals(familyId, (data) => {
      setApprovals(data);
      setLoading(false);
    });
    return unsub;
  }, [familyId]);

  return { approvals, loading };
};

// ─── Pending approvals count (for badge) ─────────────────────────────────────

export const usePendingApprovalsCount = (familyId: string | undefined): number => {
  const { approvals } = usePendingApprovals(familyId);
  return approvals.length;
};
