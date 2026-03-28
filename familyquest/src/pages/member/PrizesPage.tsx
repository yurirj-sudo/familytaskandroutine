import React, { useState } from "react";
import AppLayout from "../../components/layout/AppLayout";
import PrizeCard from "../../components/prizes/PrizeCard";
import RedeemModal from "../../components/prizes/RedeemModal";
import { usePrizes, useMemberRedemptions } from "../../hooks/usePrizes";
import { useCurrentFamily, useCurrentMember } from "../../store/authStore";
import { Prize } from "../../types";

const PrizesPage: React.FC = () => {
  const family = useCurrentFamily();
  const member = useCurrentMember();
  const { available, loading } = usePrizes(family?.id);
  const { redemptions, loading: loadingRedemptions } = useMemberRedemptions(family?.id, member?.uid);
  const [redeemTarget, setRedeemTarget] = useState<Prize | null>(null);

  const totalPoints = member?.totalPoints ?? 0;

  return (
    <AppLayout title="Prêmios">
      {/* Header */}
      <div className="mb-8 pt-2">
        <h2 className="font-headline font-extrabold text-3xl text-on-surface tracking-tight leading-tight">
          Loja de Prêmios
        </h2>
        <p className="text-on-surface-variant text-sm mt-2 font-medium">
          Troque seus pontos por recompensas incríveis!
        </p>
      </div>

      {/* Points banner */}
      <div className="bg-tertiary-container/20 border border-tertiary/10 rounded-DEFAULT px-5 py-3 flex items-center gap-3 mb-6 shadow-cloud">
        <span className="text-2xl">⭐</span>
        <div>
          <p className="text-on-surface-variant text-xs font-medium">Seus pontos disponíveis</p>
          <p className="text-on-tertiary-container font-headline font-extrabold text-xl">
            {totalPoints.toLocaleString("pt-BR")} pts
          </p>
        </div>
      </div>

      {/* Prize catalog */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        </div>
      ) : available.length === 0 ? (
        <div className="bg-surface-container-lowest rounded-DEFAULT shadow-cloud text-center py-12">
          <div className="text-4xl mb-3">🎁</div>
          <h3 className="font-headline font-bold text-on-surface">Nenhum prêmio disponível</h3>
          <p className="text-on-surface-variant text-sm mt-1">
            Peça ao administrador para cadastrar prêmios.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {available.map((prize) => (
            <PrizeCard
              key={prize.id}
              prize={prize}
              totalPoints={totalPoints}
              onRedeem={setRedeemTarget}
            />
          ))}
        </div>
      )}

      {/* Redemption history */}
      {!loadingRedemptions && redemptions.length > 0 && (
        <section className="mt-8">
          <h3 className="text-on-surface-variant text-xs font-headline font-bold uppercase tracking-wider mb-3">
            Histórico de Resgates
          </h3>
          <div className="space-y-2">
            {redemptions.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between bg-surface-container-low rounded-DEFAULT px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{r.prizeEmoji || "🎁"}</span>
                  <div>
                    <p className="text-on-surface text-sm font-medium">{r.prizeTitle}</p>
                    <p className="text-on-surface-variant text-xs">
                      {r.redeemedAt?.toDate
                        ? new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" }).format(r.redeemedAt.toDate())
                        : ""}
                    </p>
                  </div>
                </div>
                <span className="text-error text-sm font-headline font-bold">-{r.pointsCost} pts</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Redeem modal */}
      {redeemTarget && (
        <RedeemModal
          prize={redeemTarget}
          familyId={family?.id ?? ""}
          userId={member?.uid ?? ""}
          userName={member?.displayName ?? ""}
          totalPoints={totalPoints}
          onClose={() => setRedeemTarget(null)}
          onSuccess={() => setRedeemTarget(null)}
        />
      )}
    </AppLayout>
  );
};

export default PrizesPage;
