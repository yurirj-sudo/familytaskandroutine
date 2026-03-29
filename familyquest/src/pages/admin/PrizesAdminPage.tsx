import React, { useState } from "react";
import AppLayout from "../../components/layout/AppLayout";
import PrizeCard from "../../components/prizes/PrizeCard";
import PrizeForm, { PrizeFormValues } from "../../components/prizes/PrizeForm";
import {
  usePrizes,
  useFamilyRedemptions,
  usePendingRedemptions,
} from "../../hooks/usePrizes";
import { useCurrentFamily, useCurrentMember } from "../../store/authStore";
import { useFamilyMembers } from "../../store/familyStore";
import { createPrize, updatePrize, togglePrizeAvailability } from "../../services/prize.service";
import {
  approvePrizeRedemption,
  rejectPrizeRedemption,
} from "../../services/redemption.service";
import { Prize, Redemption } from "../../types";

type View = "list" | "form" | "approvals" | "history";

// ─── Approval Card ─────────────────────────────────────────────────────────────

const ApprovalCard: React.FC<{
  redemption: Redemption;
  onApprove: () => Promise<void>;
  onReject: () => Promise<void>;
}> = ({ redemption, onApprove, onReject }) => {
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);

  const handleApprove = async () => {
    setApproving(true);
    try { await onApprove(); } finally { setApproving(false); }
  };

  const handleReject = async () => {
    setRejecting(true);
    try { await onReject(); } finally { setRejecting(false); }
  };

  const busy = approving || rejecting;

  const requestedDate = redemption.requestedAt?.toDate
    ? new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit", month: "2-digit", year: "2-digit",
        hour: "2-digit", minute: "2-digit",
      }).format(redemption.requestedAt.toDate())
    : "";

  return (
    <div className="bg-surface-container-lowest rounded-DEFAULT shadow-cloud p-4">
      {/* Prize + Member row */}
      <div className="flex items-center gap-3 mb-3">
        <span className="text-3xl">{redemption.prizeEmoji || "🎁"}</span>
        <div className="flex-1 min-w-0">
          <p className="font-headline font-bold text-on-surface text-sm truncate">
            {redemption.prizeTitle}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-base leading-none">{redemption.userAvatar || "👤"}</span>
            <p className="text-on-surface-variant text-xs">{redemption.userName}</p>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="font-headline font-extrabold text-primary text-base leading-none">
            {redemption.pointsCost} pts
          </p>
          <p className="text-on-surface-variant text-[10px] mt-0.5">{requestedDate}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={handleReject}
          disabled={busy}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-full bg-error-container/15 text-error hover:bg-error-container/30 text-sm font-medium transition-colors disabled:opacity-50"
        >
          {rejecting ? (
            <span className="w-3.5 h-3.5 border-2 border-error border-t-transparent rounded-full animate-spin" />
          ) : (
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
          )}
          Recusar
        </button>
        <button
          onClick={handleApprove}
          disabled={busy}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-full bg-secondary text-on-secondary hover:bg-secondary/90 text-sm font-headline font-bold transition-colors disabled:opacity-50"
        >
          {approving ? (
            <span className="w-3.5 h-3.5 border-2 border-on-secondary border-t-transparent rounded-full animate-spin" />
          ) : (
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>check</span>
          )}
          Aprovar
        </button>
      </div>
    </div>
  );
};

// ─── Main Page ─────────────────────────────────────────────────────────────────

const PrizesAdminPage: React.FC = () => {
  const family = useCurrentFamily();
  const member = useCurrentMember();
  const members = useFamilyMembers();
  const { prizes, loading } = usePrizes(family?.id);
  const { redemptions: pending, loading: loadingPending } = usePendingRedemptions(family?.id);
  const { redemptions, loading: loadingRedemptions } = useFamilyRedemptions(family?.id);
  const [view, setView] = useState<View>("list");
  const [editing, setEditing] = useState<Prize | null>(null);

  const memberMap = new Map(members.map((m) => [m.uid, m]));

  const handleOpenCreate = () => { setEditing(null); setView("form"); };
  const handleOpenEdit = (prize: Prize) => { setEditing(prize); setView("form"); };
  const handleCancel = () => { setEditing(null); setView("list"); };

  const handleSubmit = async (values: PrizeFormValues) => {
    if (!family?.id || !member?.uid) return;
    const data = {
      title: values.title,
      description: values.description ?? "",
      emoji: values.emoji ?? "",
      pointsCost: values.pointsCost,
      quantity: values.hasLimit ? (values.quantity ?? 1) : null,
    };
    if (editing) {
      await updatePrize(family.id, editing.id, data);
    } else {
      await createPrize({ familyId: family.id, createdBy: member.uid, data });
    }
    setView("list");
    setEditing(null);
  };

  const handleToggle = async (prize: Prize) => {
    if (!family?.id) return;
    await togglePrizeAvailability(family.id, prize.id, !prize.isAvailable);
  };

  const handleApprove = async (redemption: Redemption) => {
    if (!family?.id || !member?.uid) return;
    await approvePrizeRedemption(family.id, redemption.id, member.uid);
  };

  const handleReject = async (redemption: Redemption) => {
    if (!family?.id || !member?.uid) return;
    await rejectPrizeRedemption(family.id, redemption.id, member.uid);
  };

  // ── Form view ──────────────────────────────────────────────────────────────
  if (view === "form") {
    return (
      <AppLayout title={editing ? "Editar Prêmio" : "Novo Prêmio"} showBack>
        <div className="mt-4 pb-8">
          <PrizeForm
            initialValues={editing ?? undefined}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isEditing={Boolean(editing)}
          />
        </div>
      </AppLayout>
    );
  }

  // ── Approvals view ────────────────────────────────────────────────────────
  if (view === "approvals") {
    return (
      <AppLayout title="Aprovar Resgates" showBack>
        <div className="mt-2 space-y-3 pb-8">
          {loadingPending ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
            </div>
          ) : pending.length === 0 ? (
            <div className="bg-surface-container-lowest rounded-DEFAULT shadow-cloud text-center py-12 mt-4">
              <div className="text-5xl mb-3">✅</div>
              <h3 className="font-headline font-bold text-on-surface">Nenhuma solicitação pendente</h3>
              <p className="text-on-surface-variant text-sm mt-1">Todas as solicitações foram processadas.</p>
            </div>
          ) : (
            pending.map((r) => (
              <ApprovalCard
                key={r.id}
                redemption={r}
                onApprove={() => handleApprove(r)}
                onReject={() => handleReject(r)}
              />
            ))
          )}
        </div>
      </AppLayout>
    );
  }

  // ── History view ──────────────────────────────────────────────────────────
  if (view === "history") {
    const approved = redemptions.filter((r) => r.status === "approved");
    const rejected = redemptions.filter((r) => r.status === "rejected");
    return (
      <AppLayout title="Histórico de Resgates" showBack>
        <div className="mt-2 space-y-3 pb-8">
          {loadingRedemptions ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
            </div>
          ) : approved.length === 0 && rejected.length === 0 ? (
            <div className="bg-surface-container-lowest rounded-DEFAULT shadow-cloud text-center py-12">
              <p className="text-on-surface-variant text-sm">Nenhum resgate registrado ainda.</p>
            </div>
          ) : (
            <>
              {approved.length > 0 && (
                <section>
                  <h3 className="text-on-surface-variant text-xs font-headline font-bold uppercase tracking-wider mb-2">
                    ✅ Aprovados ({approved.length})
                  </h3>
                  <div className="space-y-2">
                    {approved.map((r) => {
                      const m = memberMap.get(r.userId);
                      return (
                        <div key={r.id} className="flex items-center gap-3 bg-surface-container-low rounded-DEFAULT px-4 py-3">
                          <span className="text-2xl">{r.prizeEmoji || "🎁"}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-on-surface text-sm font-medium truncate">{r.prizeTitle}</p>
                            <p className="text-on-surface-variant text-xs">
                              {m?.displayName ?? r.userName}
                            </p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-error text-sm font-headline font-bold">-{r.pointsCost} pts</p>
                            <p className="text-on-surface-variant text-xs">
                              {r.redeemedAt?.toDate
                                ? new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(r.redeemedAt.toDate())
                                : ""}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}
              {rejected.length > 0 && (
                <section className="mt-4">
                  <h3 className="text-on-surface-variant text-xs font-headline font-bold uppercase tracking-wider mb-2">
                    ❌ Recusados ({rejected.length})
                  </h3>
                  <div className="space-y-2 opacity-70">
                    {rejected.map((r) => {
                      const m = memberMap.get(r.userId);
                      return (
                        <div key={r.id} className="flex items-center gap-3 bg-surface-container-low rounded-DEFAULT px-4 py-3">
                          <span className="text-2xl opacity-50">{r.prizeEmoji || "🎁"}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-on-surface-variant text-sm font-medium truncate line-through">{r.prizeTitle}</p>
                            <p className="text-on-surface-variant text-xs">
                              {m?.displayName ?? r.userName}
                            </p>
                          </div>
                          <p className="text-on-surface-variant text-xs text-right flex-shrink-0">
                            {r.pointsCost} pts
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </AppLayout>
    );
  }

  // ── List view (default) ───────────────────────────────────────────────────
  return (
    <AppLayout
      title="Prêmios"
      rightAction={
        <div className="flex items-center gap-3">
          {/* Pending approvals button */}
          <button
            className="relative text-on-surface-variant text-sm flex items-center gap-1"
            onClick={() => setView("approvals")}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>approval</span>
            {pending.length > 0 && (
              <span className="absolute -top-1 -right-2 bg-error text-on-error text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-0.5">
                {pending.length > 9 ? "9+" : pending.length}
              </span>
            )}
          </button>
          <button
            className="text-on-surface-variant text-sm"
            onClick={() => setView("history")}
          >
            Histórico
          </button>
          <button
            className="text-primary font-headline font-bold text-sm"
            onClick={handleOpenCreate}
          >
            + Novo
          </button>
        </div>
      }
    >
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        </div>
      ) : prizes.length === 0 ? (
        <div className="bg-surface-container-lowest rounded-DEFAULT shadow-cloud text-center py-12 mt-4">
          <div className="text-5xl mb-3">🎁</div>
          <h3 className="font-headline font-bold text-on-surface">Nenhum prêmio cadastrado</h3>
          <p className="text-on-surface-variant text-sm mt-1 mb-4">Crie prêmios para motivar sua família!</p>
          <button className="primary-gradient text-on-primary font-headline font-bold px-6 py-3 rounded-full shadow-primary-glow mx-auto" onClick={handleOpenCreate}>
            Criar primeiro prêmio
          </button>
        </div>
      ) : (
        <div className="space-y-3 mt-2">
          {/* Pending banner */}
          {pending.length > 0 && (
            <button
              onClick={() => setView("approvals")}
              className="w-full flex items-center gap-3 bg-primary/5 border border-primary/20 rounded-DEFAULT px-4 py-3 text-left"
            >
              <span className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-primary" style={{ fontSize: 18 }}>pending</span>
              </span>
              <div className="flex-1">
                <p className="text-on-surface font-headline font-bold text-sm">
                  {pending.length} solicitaç{pending.length === 1 ? "ão pendente" : "ões pendentes"}
                </p>
                <p className="text-on-surface-variant text-xs">Toque para aprovar ou recusar</p>
              </div>
              <span className="material-symbols-outlined text-on-surface-variant" style={{ fontSize: 20 }}>chevron_right</span>
            </button>
          )}

          {prizes.map((prize) => (
            <PrizeCard
              key={prize.id}
              prize={prize}
              totalPoints={0}
              onRedeem={() => {}}
              adminMode
              onEdit={handleOpenEdit}
              onToggle={handleToggle}
            />
          ))}
        </div>
      )}
    </AppLayout>
  );
};

export default PrizesAdminPage;
