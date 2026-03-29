import {
  collection,
  doc,
  addDoc,
  updateDoc,
  runTransaction,
  query,
  where,
  onSnapshot,
  getDocs,
  serverTimestamp,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '../firebase';
import { Redemption } from '../types';
import { getCurrentCycleId } from '../utils/date';

// ─── Request Prize Redemption (pending — no points deducted yet) ──────────────

export const requestPrizeRedemption = async (
  familyId: string,
  userId: string,
  userName: string,
  userAvatar: string,
  prizeId: string
): Promise<void> => {
  // Validate inline (non-transactional read is fine for optimistic check)
  const memberSnap = await import('firebase/firestore').then(({ getDoc }) =>
    getDoc(doc(db, 'families', familyId, 'members', userId))
  );
  const prizeSnap = await import('firebase/firestore').then(({ getDoc }) =>
    getDoc(doc(db, 'families', familyId, 'prizes', prizeId))
  );

  if (!memberSnap.exists()) throw new Error('Membro não encontrado.');
  if (!prizeSnap.exists()) throw new Error('Prêmio não encontrado.');

  const member = memberSnap.data();
  const prize = prizeSnap.data();

  if (!prize.isAvailable) throw new Error('Prêmio indisponível.');
  if (prize.quantity !== null && prize.quantityRedeemed >= prize.quantity) {
    throw new Error('Prêmio esgotado.');
  }
  if (member.totalPoints < prize.pointsCost) {
    throw new Error('Pontos insuficientes.');
  }

  await addDoc(collection(db, 'families', familyId, 'redemptions'), {
    prizeId,
    prizeTitle: prize.title,
    prizeEmoji: prize.emoji ?? '',
    pointsCost: prize.pointsCost,
    userId,
    userName,
    userAvatar,
    familyId,
    status: 'pending',
    requestedAt: serverTimestamp(),
    cycleId: getCurrentCycleId(),
  });
};

// ─── Approve Prize Redemption (deducts points atomically) ─────────────────────

export const approvePrizeRedemption = async (
  familyId: string,
  redemptionId: string,
  adminUid: string
): Promise<void> => {
  await runTransaction(db, async (transaction) => {
    const redemptionRef = doc(db, 'families', familyId, 'redemptions', redemptionId);
    const redemptionSnap = await transaction.get(redemptionRef);
    if (!redemptionSnap.exists()) throw new Error('Solicitação não encontrada.');

    const redemption = redemptionSnap.data();
    if (redemption.status !== 'pending') throw new Error('Solicitação já processada.');

    const memberRef = doc(db, 'families', familyId, 'members', redemption.userId);
    const prizeRef = doc(db, 'families', familyId, 'prizes', redemption.prizeId);

    const [memberSnap, prizeSnap] = await Promise.all([
      transaction.get(memberRef),
      transaction.get(prizeRef),
    ]);

    if (!memberSnap.exists()) throw new Error('Membro não encontrado.');
    if (!prizeSnap.exists()) throw new Error('Prêmio não encontrado.');

    const member = memberSnap.data();
    const prize = prizeSnap.data();

    if (member.totalPoints < redemption.pointsCost) {
      throw new Error('Membro não possui pontos suficientes.');
    }

    // Debit points
    transaction.update(memberRef, {
      totalPoints: member.totalPoints - redemption.pointsCost,
    });

    // Increment quantityRedeemed
    transaction.update(prizeRef, {
      quantityRedeemed: (prize.quantityRedeemed ?? 0) + 1,
    });

    // Mark redemption approved
    transaction.update(redemptionRef, {
      status: 'approved',
      redeemedAt: serverTimestamp(),
      reviewedAt: serverTimestamp(),
      reviewedBy: adminUid,
    });
  });
};

// ─── Reject Prize Redemption ──────────────────────────────────────────────────

export const rejectPrizeRedemption = async (
  familyId: string,
  redemptionId: string,
  adminUid: string,
  reason?: string
): Promise<void> => {
  await updateDoc(doc(db, 'families', familyId, 'redemptions', redemptionId), {
    status: 'rejected',
    reviewedAt: serverTimestamp(),
    reviewedBy: adminUid,
    ...(reason ? { rejectionReason: reason } : {}),
  });
};

// ─── Subscribe member redemptions (real-time) ─────────────────────────────────
// Uses only a single-field filter to avoid requiring a composite index.
// Results are sorted client-side by requestedAt (or redeemedAt for legacy records).

export const subscribeMemberRedemptions = (
  familyId: string,
  userId: string,
  onData: (redemptions: Redemption[]) => void,
  onError?: (err: Error) => void
): Unsubscribe => {
  const q = query(
    collection(db, 'families', familyId, 'redemptions'),
    where('userId', '==', userId)
  );
  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Redemption));
      items.sort((a, b) => {
        const ta = (a.requestedAt ?? a.redeemedAt)?.toMillis?.() ?? 0;
        const tb = (b.requestedAt ?? b.redeemedAt)?.toMillis?.() ?? 0;
        return tb - ta; // newest first
      });
      onData(items);
    },
    onError
  );
};

// ─── Subscribe all family redemptions (admin) ─────────────────────────────────
// No orderBy — sort client-side to avoid index requirements.

export const subscribeFamilyRedemptions = (
  familyId: string,
  onData: (redemptions: Redemption[]) => void,
  onError?: (err: Error) => void
): Unsubscribe => {
  const q = query(collection(db, 'families', familyId, 'redemptions'));
  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Redemption));
      items.sort((a, b) => {
        const ta = (a.requestedAt ?? a.redeemedAt)?.toMillis?.() ?? 0;
        const tb = (b.requestedAt ?? b.redeemedAt)?.toMillis?.() ?? 0;
        return tb - ta; // newest first
      });
      onData(items);
    },
    onError
  );
};

// ─── Subscribe pending redemptions (admin badge) ──────────────────────────────
// Single where-clause only — no composite index needed.

export const subscribePendingRedemptions = (
  familyId: string,
  onData: (redemptions: Redemption[]) => void,
  onError?: (err: Error) => void
): Unsubscribe => {
  const q = query(
    collection(db, 'families', familyId, 'redemptions'),
    where('status', '==', 'pending')
  );
  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Redemption));
      items.sort((a, b) => {
        const ta = a.requestedAt?.toMillis?.() ?? 0;
        const tb = b.requestedAt?.toMillis?.() ?? 0;
        return ta - tb; // oldest first (FIFO)
      });
      onData(items);
    },
    onError
  );
};

// ─── Get member redemptions for a cycle (one-time) ───────────────────────────

export const getMemberCycleRedemptions = async (
  familyId: string,
  userId: string,
  cycleId: string
): Promise<Redemption[]> => {
  const snap = await getDocs(
    query(
      collection(db, 'families', familyId, 'redemptions'),
      where('userId', '==', userId),
      where('cycleId', '==', cycleId)
    )
  );
  const items = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Redemption));
  items.sort((a, b) => {
    const ta = (a.requestedAt ?? a.redeemedAt)?.toMillis?.() ?? 0;
    const tb = (b.requestedAt ?? b.redeemedAt)?.toMillis?.() ?? 0;
    return tb - ta;
  });
  return items;
};
