import { useState, useEffect } from 'react';
import { Cycle } from '../types';
import {
  subscribeMemberCycles,
  subscribeFamilyCurrentCycles,
} from '../services/cycle.service';

// ─── Member's own cycle history ───────────────────────────────────────────────

export const useMemberCycles = (
  familyId: string | undefined,
  userId: string | undefined
) => {
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!familyId || !userId) { setLoading(false); return; }
    setLoading(true);
    const unsub = subscribeMemberCycles(familyId, userId, (data) => {
      setCycles(data);
      setLoading(false);
    });
    return unsub;
  }, [familyId, userId]);

  return { cycles, loading };
};

// ─── All family cycles for current month (family ranking) ────────────────────

export const useFamilyCurrentCycles = (
  familyId: string | undefined,
  month: number,
  year: number
) => {
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!familyId) { setLoading(false); return; }
    setLoading(true);
    const unsub = subscribeFamilyCurrentCycles(familyId, month, year, (data) => {
      setCycles(data);
      setLoading(false);
    });
    return unsub;
  }, [familyId, month, year]);

  return { cycles, loading };
};
