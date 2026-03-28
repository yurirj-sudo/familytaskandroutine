import {
  collection,
  doc,
  runTransaction,
  query,
  where,
  orderBy,
  onSnapshot,
  getDocs,
  serverTimestamp,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '../firebase';
import { Redemption } from '../types';
import { getCurrentCycleId } from '../utils/date';

// ─── Redeem Prize (atomic transaction) ───────────────────────────────────────

export const redeemPrize = async (
  familyId: string,
  userId: string,
  userName: string,
  prizeId: string
): Promise<void> => {
  await runTransaction(db, async (transaction) => {
    const memberRef = doc(db, 'families', familyId, 'members', userId);
    const prizeRef = doc(db, 'families', familyId, 'prizes', prizeId);

    const [memberSnap, prizeSnap] = await Promise.all([
      transaction.get(memberRef),
      transaction.get(prizeRef),
    ]);

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

    // Debit points
    transaction.update(memberRef, {
      totalPoints: member.totalPoints - prize.pointsCost,
    });

    // Increment quantityRedeemed
    transaction.update(prizeRef, {
      quantityRedeemed: prize.quantityRedeemed + 1,
    });

    // Create redemption record
    const redemptionRef = doc(collection(db, 'families', familyId, 'redemptions'));
    transaction.set(redemptionRef, {
      prizeId,
      prizeTitle: prize.title,
      prizeEmoji: prize.emoji ?? '',
      pointsCost: prize.pointsCost,
      userId,
      userName,
      familyId,
      status: 'approved',
      redeemedAt: serverTimestamp(),
      cycleId: getCurrentCycleId(),
    });
  });
};

// ─── Subscribe member redemptions (real-time) ─────────────────────────────────

export const subscribeMemberRedemptions = (
  familyId: string,
  userId: string,
  onData: (redemptions: Redemption[]) => void,
  onError?: (err: Error) => void
): Unsubscribe => {
  const q = query(
    collection(db, 'families', familyId, 'redemptions'),
    where('userId', '==', userId),
    orderBy('redeemedAt', 'desc')
  );
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Redemption))),
    onError
  );
};

// ─── Subscribe all family redemptions (admin) ─────────────────────────────────

export const subscribeFamilyRedemptions = (
  familyId: string,
  onData: (redemptions: Redemption[]) => void,
  onError?: (err: Error) => void
): Unsubscribe => {
  const q = query(
    collection(db, 'families', familyId, 'redemptions'),
    orderBy('redeemedAt', 'desc')
  );
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Redemption))),
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
      where('cycleId', '==', cycleId),
      orderBy('redeemedAt', 'desc')
    )
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Redemption));
};
