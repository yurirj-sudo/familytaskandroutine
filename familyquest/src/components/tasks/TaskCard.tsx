import React from 'react';
import { Completion, Task } from '../../types';
import CompletionButton from './CompletionButton';

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
  /** Admin mode: show edit/delete actions instead of completion */
  adminMode?: boolean;
  /** Members list for resolving assignedTo UIDs in admin mode */
  members?: TaskMember[];
  onEdit?: (task: Task) => void;
  onDelete?: (task: Task) => void;
}

const categoryColors: Record<string, string> = {
  higiene: 'bg-surface-container-high text-primary',
  escola: 'bg-primary-container/20 text-primary',
  casa: 'bg-tertiary-container/30 text-tertiary',
  alimentação: 'bg-secondary-container/30 text-secondary',
  exercício: 'bg-error-container/20 text-error',
};

const frequencyLabel: Record<string, string> = {
  daily: 'Diária',
  weekly: 'Semanal',
  monthly: 'Mensal',
  monthly_relative: 'Mensal (relativa)',
  once: 'Uma vez',
};

// ─── Status circle (left icon) ───────────────────────────────────────────────

function StatusCircle({
  task,
  completion,
  adminMode,
}: {
  task: Task;
  completion: Completion | undefined;
  adminMode: boolean;
}) {
  const status = completion?.status;

  // ── Admin mode: show emoji or type badge ──
  if (adminMode) {
    return (
      <div className="w-11 h-11 rounded-full bg-surface-container flex items-center justify-center flex-shrink-0 text-xl">
        {task.emoji || (task.type === 'mandatory' ? '⚠️' : '⭐')}
      </div>
    );
  }

  // ── Completed / approved ──
  if (status === 'completed' || status === 'approved') {
    return (
      <div className="w-11 h-11 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
        <span className="material-symbols-filled text-on-secondary" style={{ fontSize: 26 }}>
          check_circle
        </span>
      </div>
    );
  }

  // ── Submitted — awaiting approval ──
  if (status === 'submitted') {
    return (
      <div className="w-11 h-11 rounded-full bg-warning/10 border-2 border-warning flex items-center justify-center flex-shrink-0">
        <span className="material-symbols-outlined text-warning" style={{ fontSize: 24 }}>
          schedule
        </span>
      </div>
    );
  }

  // ── Missed ──
  if (status === 'missed') {
    return (
      <div className="w-11 h-11 rounded-full bg-error/10 border-2 border-error flex items-center justify-center flex-shrink-0">
        <span className="material-symbols-filled text-error" style={{ fontSize: 26 }}>
          cancel
        </span>
      </div>
    );
  }

  // ── Rejected ──
  if (status === 'rejected') {
    return (
      <div className="w-11 h-11 rounded-full bg-error/10 border-2 border-error flex items-center justify-center flex-shrink-0">
        <span className="material-symbols-outlined text-error" style={{ fontSize: 24 }}>
          block
        </span>
      </div>
    );
  }

  // ── Pending — mandatory ──
  if (task.type === 'mandatory') {
    return (
      <div className="w-11 h-11 rounded-full border-2 border-error/50 flex items-center justify-center flex-shrink-0">
        <span className="material-symbols-outlined text-error/50" style={{ fontSize: 26 }}>
          radio_button_unchecked
        </span>
      </div>
    );
  }

  // ── Pending — optional ──
  return (
    <div className="w-11 h-11 rounded-full border-2 border-outline/30 flex items-center justify-center flex-shrink-0">
      <span className="material-symbols-outlined text-outline/40" style={{ fontSize: 26 }}>
        radio_button_unchecked
      </span>
    </div>
  );
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
}) => {
  const catColor =
    categoryColors[task.category] ?? 'bg-surface-container-high text-on-surface-variant';
  const isCompleted =
    completion?.status === 'completed' || completion?.status === 'approved';

  return (
    <div
      className={[
        'bg-surface-container-lowest rounded-DEFAULT shadow-cloud',
        'p-4 flex flex-col gap-3 transition-opacity relative overflow-hidden',
        isCompleted ? 'opacity-70' : '',
      ].join(' ')}
    >
      {/* Left accent for mandatory */}
      {task.type === 'mandatory' && !isCompleted && (
        <div className="absolute top-0 left-0 h-full w-1.5 bg-error rounded-l-DEFAULT" />
      )}

      <div className="flex items-center gap-3 pl-1">
        {/* Status / emoji circle */}
        <StatusCircle task={task} completion={completion} adminMode={adminMode} />

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3
              className={`font-headline font-bold text-sm leading-snug ${
                isCompleted ? 'line-through text-on-surface-variant' : 'text-on-surface'
              }`}
            >
              {task.title}
            </h3>
            {task.type === 'mandatory' && !isCompleted && (
              <span className="flex-shrink-0 text-[10px] bg-error-container/20 text-error font-headline font-bold uppercase tracking-wide rounded-full px-2 py-0.5">
                Obrigatória
              </span>
            )}
          </div>

          {task.description && (
            <p className="text-on-surface-variant text-xs mt-0.5 leading-snug">
              {task.description}
            </p>
          )}

          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span
              className={`text-[10px] font-headline font-bold uppercase tracking-wider rounded-md px-2 py-0.5 ${catColor}`}
            >
              {task.category}
            </span>
            {adminMode && (
              <span className="text-[10px] bg-surface-container text-on-surface-variant rounded-full px-2 py-0.5">
                {frequencyLabel[task.frequency]}
              </span>
            )}
            {task.dueTime && (
              <span className="text-[10px] text-on-surface-variant flex items-center gap-1">
                <span className="material-symbols-outlined" style={{ fontSize: 12 }}>
                  schedule
                </span>
                <span className={isCompleted ? '' : 'text-error font-bold'}>
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
                  <span className="material-symbols-outlined" style={{ fontSize: 11 }}>
                    public
                  </span>
                  Livre
                </span>
              ) : (
                (task.assignedTo as string[]).map((uid) => {
                  const m = members.find((mb) => mb.uid === uid);
                  return (
                    <span
                      key={uid}
                      className="inline-flex items-center gap-1 text-[10px] bg-secondary-container/20 text-secondary rounded-full px-2 py-0.5"
                    >
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

      {/* Completed label */}
      {isCompleted && (
        <div className="flex items-center gap-1 text-xs text-secondary font-headline font-bold uppercase tracking-wider pl-1">
          <span className="material-symbols-filled text-secondary" style={{ fontSize: 14 }}>
            check_circle
          </span>
          Concluído
        </div>
      )}

      {/* Submitted label */}
      {completion?.status === 'submitted' && (
        <div className="flex items-center gap-1 text-xs text-warning font-headline font-bold uppercase tracking-wider pl-1">
          <span className="material-symbols-outlined text-warning" style={{ fontSize: 14 }}>
            schedule
          </span>
          Aguardando aprovação
        </div>
      )}

      {/* Rejected label */}
      {completion?.status === 'rejected' && (
        <div className="flex flex-col gap-0.5 pl-1">
          <div className="flex items-center gap-1 text-xs text-error font-headline font-bold uppercase tracking-wider">
            <span className="material-symbols-outlined text-error" style={{ fontSize: 14 }}>
              block
            </span>
            Rejeitado
          </div>
          {completion.rejectionReason && (
            <p className="text-xs text-on-surface-variant">{completion.rejectionReason}</p>
          )}
        </div>
      )}

      {/* Actions */}
      {!isCompleted && completion?.status !== 'submitted' && (
        <div>
          {adminMode ? (
            <div className="flex gap-2">
              <button
                className="flex-1 text-xs bg-surface-container-low hover:bg-surface-container text-on-surface-variant rounded-full py-2 transition-colors font-medium"
                onClick={() => onEdit?.(task)}
              >
                ✏️ Editar
              </button>
              <button
                className="flex-1 text-xs bg-error-container/15 hover:bg-error-container/25 text-error rounded-full py-2 transition-colors font-medium"
                onClick={() => onDelete?.(task)}
              >
                🗑️ Remover
              </button>
            </div>
          ) : (
            completion?.status !== 'missed' && (
              <CompletionButton
                task={task}
                familyId={familyId}
                userId={userId}
                completion={completion}
                requireApproval={requireApproval}
                requirePhotoProof={requirePhotoProof}
              />
            )
          )}
        </div>
      )}
    </div>
  );
};

export default TaskCard;
