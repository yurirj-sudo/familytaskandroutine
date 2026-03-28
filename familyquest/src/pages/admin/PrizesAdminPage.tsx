import React, { useState } from "react";
import AppLayout from "../../components/layout/AppLayout";
import PrizeCard from "../../components/prizes/PrizeCard";
import PrizeForm, { PrizeFormValues } from "../../components/prizes/PrizeForm";
import { usePrizes, useFamilyRedemptions } from "../../hooks/usePrizes";
import { useCurrentFamily, useCurrentMember } from "../../store/authStore";
import { useFamilyMembers } from "../../store/familyStore";
import { createPrize, updatePrize, togglePrizeAvailability } from "../../services/prize.service";
import { Prize } from "../../types";

type View = "list" | "form" | "history";

const PrizesAdminPage: React.FC = () => {
  const family = useCurrentFamily();
  const member = useCurrentMember();
  const members = useFamilyMembers();
  const { prizes, loading } = usePrizes(family?.id);
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

  if (view === "history") {
    return (
      <AppLayout title="Histórico de Resgates" showBack>
        <div className="mt-2 space-y-3 pb-8">
          {loadingRedemptions ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
            </div>
          ) : redemptions.length === 0 ? (
            <div className="bg-surface-container-lowest rounded-DEFAULT shadow-cloud text-center py-12">
              <p className="text-on-surface-variant text-sm">Nenhum resgate registrado ainda.</p>
            </div>
          ) : redemptions.map((r) => {
            const m = memberMap.get(r.userId);
            return (
              <div key={r.id} className="flex items-center gap-3 bg-surface-container-low rounded-DEFAULT px-4 py-3">
                <span className="text-2xl">{r.prizeEmoji || "🎁"}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-on-surface text-sm font-medium truncate">{r.prizeTitle}</p>
                  <p className="text-on-surface-variant text-xs">{m?.displayName ?? r.userName}</p>
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
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="Prêmios"
      rightAction={
        <div className="flex items-center gap-3">
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
