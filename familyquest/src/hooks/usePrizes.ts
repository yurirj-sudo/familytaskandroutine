import { useState, useEffect } from 'react';
import { Prize, Redemption } from '../types';
import { subscribePrizes } from '../services/prize.service';
import {
  subscribeMemberRedemptions,
  subscribeFamilyRedemptions,
  subscribePendingRedemptions,
} from '../services/redemption.service';

// ─── All prizes (real-time) ───────────────────────────────────────────────────

export const usePrizes = (familyId: string | undefined) => {
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!familyId) { setLoading(false); return; }
    setLoading(true);
    const unsub = subscribePrizes(familyId, (data) => {
      setPrizes(data);
      setLoading(false);
    });
    return unsub;
  }, [familyId]);

  const available = prizes.filter((p) => p.isAvailable);

  return { prizes, available, loading };
};

// ─── Member redemptions (real-time) ──────────────────────────────────────────

export const useMemberRedemptions = (
  familyId: string | undefined,
  userId: string | undefined
) => {
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!familyId || !userId) { setLoading(false); return; }
    setLoading(true);
    const unsub = subscribeMemberRedemptions(familyId, userId, (data) => {
      setRedemptions(data);
      setLoading(false);
    });
    return unsub;
  }, [familyId, userId]);

  return { redemptions, loading };
};

// ─── All family redemptions — admin (real-time) ───────────────────────────────

export const useFamilyRedemptions = (familyId: string | undefined) => {
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!familyId) { setLoading(false); return; }
    setLoading(true);
    const unsub = subscribeFamilyRedemptions(familyId, (data) => {
      setRedemptions(data);
      setLoading(false);
    });
    return unsub;
  }, [familyId]);

  return { redemptions, loading };
};

// ─── Pending redemptions count (admin badge) ──────────────────────────────────

export const usePendingRedemptionsCount = (familyId: string | undefined): number => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!familyId) return;
    const unsub = subscribePendingRedemptions(familyId, (data) => setCount(data.length));
    return unsub;
  }, [familyId]);

  return count;
};

// ─── Pending redemptions list (admin approvals) ───────────────────────────────

export const usePendingRedemptions = (familyId: string | undefined) => {
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!familyId) { setLoading(false); return; }
    setLoading(true);
    const unsub = subscribePendingRedemptions(familyId, (data) => {
      setRedemptions(data);
      setLoading(false);
    });
    return unsub;
  }, [familyId]);

  return { redemptions, loading };
};
