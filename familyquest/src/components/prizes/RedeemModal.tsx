import React, { useState } from 'react';
import { Prize } from '../../types';
import { requestPrizeRedemption } from '../../services/redemption.service';

interface RedeemModalProps {
  prize: Prize;
  familyId: string;
  userId: string;
  userName: string;
  userAvatar: string;
  totalPoints: number;
  onClose: () => void;
  onSuccess: () => void;
}

export const RedeemModal: React.FC<RedeemModalProps> = ({
  prize,
  familyId,
  userId,
  userName,
  userAvatar,
  totalPoints,
  onClose,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const pointsAfter = totalPoints - prize.pointsCost;

  const handleConfirm = async () => {
    setLoading(true);
    setError(null);
    try {
      await requestPrizeRedemption(familyId, userId, userName, userAvatar, prize.id);
      setDone(true);
      setTimeout(onSuccess, 2500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao solicitar. Tente novamente.');
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/60 p-5"
      onClick={onClose}
    >
      <div
        className="bg-surface-container-lowest rounded-DEFAULT shadow-cloud p-6 w-full max-w-sm animate-fade-up"
        onClick={(e) => e.stopPropagation()}
      >
        {done ? (
          // ── Success state ─────────────────────────────────────────────────
          <div className="text-center py-4">
            <div className="text-6xl mb-3">📬</div>
            <h3 className="font-headline font-bold text-on-surface text-lg">Solicitação enviada!</h3>
            <p className="text-on-surface-variant text-sm mt-1">
              Aguardando aprovação do administrador. Seus pontos serão descontados após a confirmação.
            </p>
          </div>
        ) : (
          <>
            {/* Prize summary */}
            <div className="flex items-center gap-4 mb-5">
              <span className="text-5xl">{prize.emoji || '🎁'}</span>
              <div>
                <h3 className="font-headline font-bold text-on-surface text-base">{prize.title}</h3>
                {prize.description && (
                  <p className="text-on-surface-variant text-xs mt-0.5">{prize.description}</p>
                )}
              </div>
            </div>

            {/* Points summary */}
            <div className="bg-surface-container-low rounded-DEFAULT p-4 mb-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-on-surface-variant">Seus pontos</span>
                <span className="text-on-surface font-medium">
                  {totalPoints.toLocaleString('pt-BR')} pts
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-on-surface-variant">Custo</span>
                <span className="text-error font-headline font-bold">
                  -{prize.pointsCost.toLocaleString('pt-BR')} pts
                </span>
              </div>
              <div className="h-px bg-outline-variant/20" />
              <div className="flex justify-between text-sm">
                <span className="text-on-surface-variant">Saldo após aprovação</span>
                <span className={`font-headline font-bold ${pointsAfter >= 0 ? 'text-secondary' : 'text-error'}`}>
                  {pointsAfter.toLocaleString('pt-BR')} pts
                </span>
              </div>
            </div>

            {/* Approval notice */}
            <div className="flex items-start gap-2 bg-primary/5 border border-primary/15 rounded-DEFAULT px-3 py-2 mb-4">
              <span className="material-symbols-outlined text-primary flex-shrink-0" style={{ fontSize: 16, marginTop: 1 }}>info</span>
              <p className="text-xs text-on-surface-variant">
                Sua solicitação será enviada ao administrador para aprovação. Os pontos só serão descontados após a confirmação.
              </p>
            </div>

            {error && (
              <p className="text-error text-sm text-center mb-3">⚠️ {error}</p>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                className="flex-1 bg-surface-container-high hover:bg-surface-container-highest text-on-surface rounded-full py-3 text-sm font-medium transition-colors"
                onClick={onClose}
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                className="flex-1 primary-gradient text-on-primary rounded-full py-3 text-sm font-headline font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                onClick={handleConfirm}
                disabled={loading}
              >
                {loading && (
                  <span className="w-4 h-4 border-2 border-on-primary border-t-transparent rounded-full animate-spin" />
                )}
                Solicitar
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default RedeemModal;
