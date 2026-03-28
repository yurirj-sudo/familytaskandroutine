import React from 'react';
import { Prize } from '../../types';

interface PrizeCardProps {
  prize: Prize;
  totalPoints: number;
  onRedeem: (prize: Prize) => void;
  /** Admin mode: show edit/toggle actions */
  adminMode?: boolean;
  onEdit?: (prize: Prize) => void;
  onToggle?: (prize: Prize) => void;
}

export const PrizeCard: React.FC<PrizeCardProps> = ({
  prize,
  totalPoints,
  onRedeem,
  adminMode = false,
  onEdit,
  onToggle,
}) => {
  const canAfford = totalPoints >= prize.pointsCost;
  const isSoldOut = prize.quantity !== null && prize.quantityRedeemed >= prize.quantity;
  const isUnavailable = !prize.isAvailable || isSoldOut;

  const remaining =
    prize.quantity !== null ? prize.quantity - prize.quantityRedeemed : null;

  return (
    <div
      className={[
        'bg-surface-container-lowest rounded-DEFAULT shadow-cloud p-5 flex flex-col gap-4 relative overflow-hidden',
        isUnavailable && !adminMode ? 'grayscale opacity-70' : '',
      ].join(' ')}
    >
      {/* Decorative glow top-right */}
      {!isUnavailable && (
        <div className="absolute top-0 right-0 w-24 h-24 bg-primary-container/10 rounded-full -mr-12 -mt-12 blur-2xl pointer-events-none" />
      )}

      {/* Locked overlay */}
      {isUnavailable && !adminMode && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="bg-on-surface/5 p-3 rounded-full backdrop-blur-sm">
            <span className="text-2xl">🔒</span>
          </div>
        </div>
      )}

      {/* Header: emoji + cost badge */}
      <div className="flex items-start justify-between">
        <div className="w-14 h-14 bg-surface-container rounded-DEFAULT flex items-center justify-center text-3xl flex-shrink-0">
          {prize.emoji || '🎁'}
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="bg-tertiary-container/20 text-on-tertiary-container px-3 py-1 rounded-full text-xs font-headline font-bold">
            {prize.pointsCost.toLocaleString('pt-BR')} pts
          </span>
          {remaining !== null && (
            <span className={`text-[10px] font-bold rounded-full px-2 py-0.5 ${
              remaining === 0
                ? 'bg-error-container/20 text-error'
                : remaining <= 3
                ? 'bg-warning/20 text-warning'
                : 'bg-surface-container-high text-on-surface-variant'
            }`}>
              {remaining === 0 ? 'Esgotado' : `${remaining} restante${remaining === 1 ? '' : 's'}`}
            </span>
          )}
        </div>
      </div>

      {/* Title + description */}
      <div className="flex-1">
        <h3 className={`font-headline font-bold text-base leading-tight ${isUnavailable && !adminMode ? 'text-on-surface-variant' : 'text-on-surface'}`}>
          {prize.title}
        </h3>
        {prize.description && (
          <p className="text-on-surface-variant text-xs mt-1 leading-snug">{prize.description}</p>
        )}
      </div>

      {/* Affordability bar (member mode only) */}
      {!adminMode && !isUnavailable && (
        <div className="h-1.5 rounded-full bg-surface-container-low overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${canAfford ? 'bg-secondary' : 'bg-warning'}`}
            style={{ width: `${Math.min(100, (totalPoints / prize.pointsCost) * 100)}%` }}
          />
        </div>
      )}

      {/* Actions */}
      {adminMode ? (
        <div className="flex gap-2">
          <button
            className="flex-1 text-xs bg-surface-container-low hover:bg-surface-container text-on-surface-variant rounded-full py-2 transition-colors font-medium"
            onClick={() => onEdit?.(prize)}
          >
            Editar
          </button>
          <button
            className={`flex-1 text-xs rounded-full py-2 transition-colors font-medium ${
              prize.isAvailable
                ? 'bg-warning/15 hover:bg-warning/25 text-warning'
                : 'bg-secondary-container/20 hover:bg-secondary-container/30 text-secondary'
            }`}
            onClick={() => onToggle?.(prize)}
          >
            {prize.isAvailable ? 'Desativar' : 'Ativar'}
          </button>
        </div>
      ) : (
        <button
          className={[
            'w-full rounded-full py-3 text-sm font-headline font-bold transition-all active:scale-95',
            isUnavailable
              ? 'bg-outline-variant/20 text-outline cursor-not-allowed'
              : canAfford
              ? 'primary-gradient text-on-primary shadow-primary-glow'
              : 'bg-surface-container-high text-on-surface-variant cursor-not-allowed',
          ].join(' ')}
          onClick={() => !isUnavailable && canAfford && onRedeem(prize)}
          disabled={isUnavailable || !canAfford}
        >
          {isUnavailable
            ? isSoldOut ? 'Esgotado' : 'Indisponível'
            : canAfford
            ? 'Resgatar'
            : `Faltam ${(prize.pointsCost - totalPoints).toLocaleString('pt-BR')} pts`}
        </button>
      )}
    </div>
  );
};

export default PrizeCard;
