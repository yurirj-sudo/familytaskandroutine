import React from 'react';
import { Completion, Task } from '../../types';
import CompletionButton from './CompletionButton';

interface TaskCardProps {
  task: Task;
  familyId: string;
  userId: string;
  completion: Completion | undefined;
  requireApproval: boolean;
  requirePhotoProof: boolean;
  /** Admin mode: show edit/delete actions instead of completion */
  adminMode?: boolean;
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

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  familyId,
  userId,
  completion,
  requireApproval,
  requirePhotoProof,
  adminMode = false,
  onEdit,
  onDelete,
}) => {
  const catColor = categoryColors[task.category] ?? 'bg-surface-container-high text-on-surface-variant';
  const isCompleted = completion?.status === 'completed' || completion?.status === 'approved';

  return (
    <div
      className={[
        'bg-surface-container-lowest rounded-DEFAULT shadow-cloud',
        'p-5 flex flex-col gap-3 transition-opacity relative overflow-hidden',
        isCompleted ? 'opacity-70' : '',
      ].join(' ')}
    >
      {/* Left accent for mandatory */}
      {task.type === 'mandatory' && !isCompleted && (
        <div className="absolute top-0 left-0 h-full w-1.5 bg-error rounded-l-DEFAULT" />
      )}

      <div className="flex items-start gap-4 pl-1">
        {/* Emoji */}
        <div className="w-12 h-12 rounded-2xl bg-surface-container-low flex items-center justify-center text-2xl flex-shrink-0">
          {task.emoji ?? '📋'}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className={`font-headline font-bold text-base leading-tight ${isCompleted ? 'line-through text-on-surface-variant' : 'text-on-surface'}`}>
              {task.title}
            </h3>
            {task.type === 'mandatory' && !isCompleted && (
              <span className="flex-shrink-0 text-[10px] bg-error-container/20 text-error font-headline font-bold uppercase tracking-wide rounded-full px-2 py-0.5">
                Obrigatória
              </span>
            )}
          </div>

          {task.description && (
            <p className="text-on-surface-variant text-xs mt-0.5 leading-snug">{task.description}</p>
          )}

          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className={`text-[10px] font-headline font-bold uppercase tracking-wider rounded-md px-2 py-0.5 ${catColor}`}>
              {task.category}
            </span>
            {adminMode && (
              <span className="text-xs bg-surface-container text-on-surface-variant rounded-full px-2 py-0.5">
                {frequencyLabel[task.frequency]}
              </span>
            )}
            {task.dueTime && (
              <span className="text-xs text-on-surface-variant flex items-center gap-1">
                ⏰ <span className={isCompleted ? '' : 'text-error font-bold'}>Até {task.dueTime}</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 mt-2">
            <span className="text-xs text-tertiary-dim font-headline font-bold">+{task.pointsOnComplete} pts</span>
            {task.type === 'mandatory' && task.pointsOnMiss < 0 && (
              <span className="text-xs text-error">{task.pointsOnMiss} pts se falhar</span>
            )}
          </div>
        </div>
      </div>

      {/* Completed overlay */}
      {isCompleted && (
        <div className="flex items-center gap-1 text-xs text-secondary font-headline font-bold uppercase tracking-wider">
          ✅ Concluído
        </div>
      )}

      {/* Actions */}
      {!isCompleted && (
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
            <CompletionButton
              task={task}
              familyId={familyId}
              userId={userId}
              completion={completion}
              requireApproval={requireApproval}
              requirePhotoProof={requirePhotoProof}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default TaskCard;
