import React, { useRef, useState } from 'react';
import { Completion, Task } from '../../types';
import {
  markTaskCompleted,
  submitTaskForApproval,
  undoCompletion,
  cancelSubmission,
} from '../../services/completion.service';
import { uploadTaskProof } from '../../services/storage.service';

export interface TaskMember {
  uid: string;
  displayName: string;
  avatar: string;
}

interface TaskCardProps {
  task: Task;
  familyId: string;
  userId: string;
  completion: Completion | undefined;
  requireApproval: boolean;
  requirePhotoProof: boolean;
  adminMode?: boolean;
  members?: TaskMember[];
  onEdit?: (task: Task) => void;
  onDelete?: (task: Task) => void;
  onStats?: (task: Task) => void;
}

// ─── Style maps ──────────────────────────────────────────────────────────────

const categoryColors: Record<string, string> = {
  higiene:     'bg-surface-container-high text-primary',
  escola:      'bg-primary-container/20 text-primary',
  casa:        'bg-tertiary-container/30 text-tertiary',
  alimentação: 'bg-secondary-container/30 text-secondary',
  exercício:   'bg-error-container/20 text-error',
};

const frequencyLabel: Record<string, string> = {
  daily:            'Diária',
  weekly:           'Semanal',
  monthly:          'Mensal',
  monthly_relative: 'Mensal (relativa)',
  once:             'Uma vez',
};

// Card wrapper styles per completion status
function cardStyle(status: string, isMandatory: boolean): string {
  switch (status) {
    case 'completed':
    case 'approved':
      return 'bg-secondary-container/10 border border-secondary/25';
    case 'submitted':
      return 'bg-amber-50 border border-amber-300/40';
    case 'missed':
      return 'bg-error-container/10 border border-error/25 opacity-75';
    case 'rejected':
      return 'bg-error-container/10 border border-error/25';
    default:
      return isMandatory
        ? 'bg-surface-container-lowest border border-transparent'
        : 'bg-surface-container-lowest border border-transparent';
  }
}

// ─── TaskCard ─────────────────────────────────────────────────────────────────

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  familyId,
  userId,
  completion,
  requireApproval,
  requirePhotoProof,
  adminMode = false,
  members = [],
  onEdit,
  onDelete,
  onStats,
}) => {
  const [loading, setLoading] = useState(false);
  const [undoing, setUndoing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const status = completion?.status ?? 'pending';
  const isCompleted = status === 'completed' || status === 'approved';
  const canComplete = !adminMode && (status === 'pending' || status === 'rejected');

  const catColor =
    categoryColors[task.category] ?? 'bg-surface-container-high text-on-surface-variant';

  // ── Completion logic ────────────────────────────────────────────────────────

  const handleCircleClick = () => {
    if (!canComplete || loading) return;
    if (requirePhotoProof) {
      fileInputRef.current?.click();
    } else {
      completeTask();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await completeTask(file);
    e.target.value = '';
  };

  const handleUndo = async () => {
    if (!completion || undoing) return;
    setUndoing(true);
    setError(null);
    try {
      if (status === 'completed') {
        await undoCompletion(familyId, userId, completion);
      } else if (status === 'submitted') {
        await cancelSubmission(familyId, completion.id);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao desfazer');
    } finally {
      setUndoing(false);
    }
  };

  const completeTask = async (photoFile?: File) => {
    setLoading(true);
    setError(null);
    try {
      let photoUrl: string | undefined;
      if (photoFile) {
        photoUrl = await uploadTaskProof(familyId, task.id, userId, photoFile);
      }
      if (requireApproval) {
        await submitTaskForApproval(familyId, userId, task, photoUrl);
      } else {
        await markTaskCompleted(familyId, userId, task, photoUrl);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao registrar tarefa');
    } finally {
      setLoading(false);
    }
  };

  // ── Status circle ───────────────────────────────────────────────────────────

  const renderCircle = () => {
    // Admin: emoji / type icon, not interactive
    if (adminMode) {
      return (
        <div className="w-11 h-11 rounded-full bg-surface-container flex items-center justify-center flex-shrink-0 text-xl select-none">
          {task.emoji || (task.type === 'mandatory' ? '⚠️' : '⭐')}
        </div>
      );
    }

    // Loading spinner
    if (loading) {
      return (
        <div className="w-11 h-11 rounded-full border-2 border-primary flex items-center justify-center flex-shrink-0">
          <span className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      );
    }

    // Completed / approved
    if (isCompleted) {
      return (
        <div className="w-11 h-11 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
          <span className="material-symbols-filled text-on-secondary" style={{ fontSize: 26 }}>
            check_circle
          </span>
        </div>
      );
    }

    // Submitted — awaiting approval
    if (status === 'submitted') {
      return (
        <div className="w-11 h-11 rounded-full bg-amber-100 border-2 border-amber-400 flex items-center justify-center flex-shrink-0">
          <span className="material-symbols-outlined text-amber-500" style={{ fontSize: 24 }}>
            schedule
          </span>
        </div>
      );
    }

    // Missed
    if (status === 'missed') {
      return (
        <div className="w-11 h-11 rounded-full bg-error/10 border-2 border-error flex items-center justify-center flex-shrink-0">
          <span className="material-symbols-filled text-error" style={{ fontSize: 26 }}>
            cancel
          </span>
        </div>
      );
    }

    // Rejected — clickable to retry
    if (status === 'rejected') {
      return (
        <button
          onClick={handleCircleClick}
          className="w-11 h-11 rounded-full bg-error/10 border-2 border-error flex items-center justify-center flex-shrink-0 active:scale-95 transition-transform"
          aria-label="Tentar novamente"
        >
          <span className="material-symbols-outlined text-error" style={{ fontSize: 24 }}>
            replay
          </span>
        </button>
      );
    }

    // Pending — mandatory (clickable)
    if (task.type === 'mandatory') {
      return (
        <button
          onClick={handleCircleClick}
          className="w-11 h-11 rounded-full border-2 border-error/60 flex items-center justify-center flex-shrink-0 hover:bg-error/5 active:scale-95 transition-all"
          aria-label="Marcar como concluída"
        >
          <span className="material-symbols-outlined text-error/50" style={{ fontSize: 26 }}>
            radio_button_unchecked
          </span>
        </button>
      );
    }

    // Pending — optional (clickable)
    return (
      <button
        onClick={handleCircleClick}
        className="w-11 h-11 rounded-full border-2 border-outline/40 flex items-center justify-center flex-shrink-0 hover:bg-primary/5 hover:border-primary/50 active:scale-95 transition-all"
        aria-label="Marcar como concluída"
      >
        <span className="material-symbols-outlined text-outline/50" style={{ fontSize: 26 }}>
          radio_button_unchecked
        </span>
      </button>
    );
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div
      className={[
        'rounded-DEFAULT shadow-cloud p-4 flex flex-col gap-3 transition-all relative overflow-hidden',
        cardStyle(status, task.type === 'mandatory'),
      ].join(' ')}
    >
      {/* Red left accent for pending mandatory */}
      {task.type === 'mandatory' && status === 'pending' && (
        <div className="absolute top-0 left-0 h-full w-1.5 bg-error rounded-l-DEFAULT" />
      )}

      <div className="flex items-center gap-3 pl-1">
        {/* Status circle (left) */}
        {renderCircle()}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3
              className={`font-headline font-bold text-sm leading-snug ${
                isCompleted || status === 'missed'
                  ? 'line-through text-on-surface-variant'
                  : 'text-on-surface'
              }`}
            >
              {task.title}
            </h3>

            <div className="flex items-center gap-1 flex-shrink-0">
              {task.type === 'mandatory' && status === 'pending' && (
                <span className="text-[10px] bg-error-container/20 text-error font-headline font-bold uppercase tracking-wide rounded-full px-2 py-0.5">
                  Obrigatória
                </span>
              )}
              {isCompleted && (
                <span className="text-[10px] bg-secondary-container/30 text-secondary font-headline font-bold uppercase tracking-wide rounded-full px-2 py-0.5">
                  Feita ✓
                </span>
              )}
              {status === 'submitted' && (
                <span className="text-[10px] bg-amber-100 text-amber-600 font-headline font-bold uppercase tracking-wide rounded-full px-2 py-0.5">
                  Pendente
                </span>
              )}
              {status === 'missed' && (
                <span className="text-[10px] bg-error-container/20 text-error font-headline font-bold uppercase tracking-wide rounded-full px-2 py-0.5">
                  Não feita
                </span>
              )}
              {status === 'rejected' && (
                <span className="text-[10px] bg-error-container/20 text-error font-headline font-bold uppercase tracking-wide rounded-full px-2 py-0.5">
                  Rejeitada
                </span>
              )}

              {/* Undo button — small icon, right side */}
              {!adminMode && (status === 'completed' || status === 'submitted') && (
                <button
                  onClick={handleUndo}
                  disabled={undoing}
                  title={status === 'submitted' ? 'Cancelar envio' : 'Desfazer conclusão'}
                  className="w-7 h-7 flex items-center justify-center rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface-variant transition-colors disabled:opacity-40 active:scale-90"
                >
                  {undoing ? (
                    <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span className="material-symbols-outlined" style={{ fontSize: 15 }}>undo</span>
                  )}
                </button>
              )}
            </div>
          </div>

          {task.description && (
            <p className="text-on-surface-variant text-xs mt-0.5 leading-snug">
              {task.description}
            </p>
          )}

          {status === 'rejected' && completion?.rejectionReason && (
            <p className="text-error text-xs mt-0.5">
              Motivo: {completion.rejectionReason}
            </p>
          )}

          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className={`text-[10px] font-headline font-bold uppercase tracking-wider rounded-md px-2 py-0.5 ${catColor}`}>
              {task.category}
            </span>
            {adminMode && (
              <span className="text-[10px] bg-surface-container text-on-surface-variant rounded-full px-2 py-0.5">
                {frequencyLabel[task.frequency]}
              </span>
            )}
            {task.dueTime && (
              <span className="text-[10px] text-on-surface-variant flex items-center gap-0.5">
                <span className="material-symbols-outlined" style={{ fontSize: 11 }}>schedule</span>
                <span className={status === 'pending' ? 'text-error font-bold' : ''}>
                  Até {task.dueTime}
                </span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs text-tertiary-dim font-headline font-bold">
              +{task.pointsOnComplete} pts
            </span>
            {task.type === 'mandatory' && task.pointsOnMiss < 0 && (
              <span className="text-xs text-error">{task.pointsOnMiss} pts se falhar</span>
            )}
          </div>

          {/* Assignment badge — admin only */}
          {adminMode && (
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              {task.assignedTo === 'all' ? (
                <span className="inline-flex items-center gap-1 text-[10px] bg-surface-container text-on-surface-variant rounded-full px-2 py-0.5">
                  <span className="material-symbols-outlined" style={{ fontSize: 11 }}>public</span>
                  Livre
                </span>
              ) : (
                (task.assignedTo as string[]).map((uid) => {
                  const m = members.find((mb) => mb.uid === uid);
                  return (
                    <span key={uid} className="inline-flex items-center gap-1 text-[10px] bg-secondary-container/20 text-secondary rounded-full px-2 py-0.5">
                      <span className="text-xs leading-none">{m?.avatar ?? '👤'}</span>
                      {m?.displayName ?? uid.slice(0, 6)}
                    </span>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>


      {/* Photo proof hint */}
      {canComplete && requirePhotoProof && (
        <p className="text-[10px] text-on-surface-variant text-center -mt-1">
          <span className="material-symbols-outlined" style={{ fontSize: 11 }}>photo_camera</span>
          {' '}Toque no círculo para tirar foto e concluir
        </p>
      )}
      {canComplete && !requirePhotoProof && (
        <p className="text-[10px] text-on-surface-variant text-center -mt-1">
          Toque no círculo para concluir
        </p>
      )}

      {/* Error */}
      {error && (
        <p className="text-error text-xs text-center">{error}</p>
      )}

      {/* Admin actions */}
      {adminMode && (
        <div className="flex gap-2">
          <button
            className="flex-1 text-xs bg-surface-container-low hover:bg-surface-container text-on-surface-variant rounded-full py-2 transition-colors font-medium"
            onClick={() => onEdit?.(task)}
          >
            ✏️ Editar
          </button>
          <button
            className="text-xs bg-primary/10 hover:bg-primary/20 text-primary rounded-full py-2 px-3 transition-colors font-medium"
            onClick={() => onStats?.(task)}
            title="Ver desempenho"
          >
            📊
          </button>
          <button
            className="flex-1 text-xs bg-error-container/15 hover:bg-error-container/25 text-error rounded-full py-2 transition-colors font-medium"
            onClick={() => onDelete?.(task)}
          >
            🗑️ Remover
          </button>
        </div>
      )}

      {/* Hidden file input for photo proof */}
      {requirePhotoProof && (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFileChange}
        />
      )}
    </div>
  );
};

export default TaskCard;
