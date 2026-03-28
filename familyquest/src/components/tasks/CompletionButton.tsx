import React, { useRef, useState } from 'react';
import { Completion, Task } from '../../types';
import { markTaskCompleted, submitTaskForApproval } from '../../services/completion.service';
import { uploadTaskProof } from '../../services/storage.service';

interface CompletionButtonProps {
  task: Task;
  familyId: string;
  userId: string;
  completion: Completion | undefined;
  requireApproval: boolean;
  requirePhotoProof: boolean;
}

const statusConfig: Record<string, { label: string; className: string; disabled: boolean }> = {
  pending: { label: 'Marcar como feita', className: 'btn-primary', disabled: false },
  submitted: { label: 'Aguardando aprovação ⏳', className: 'bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-xl px-4 py-2 text-sm font-medium', disabled: true },
  approved: { label: 'Aprovada ✅', className: 'bg-success/20 text-success border border-success/30 rounded-xl px-4 py-2 text-sm font-medium', disabled: true },
  completed: { label: 'Concluída ✅', className: 'bg-success/20 text-success border border-success/30 rounded-xl px-4 py-2 text-sm font-medium', disabled: true },
  rejected: { label: 'Rejeitada — tentar novamente', className: 'bg-danger/20 text-danger border border-danger/30 rounded-xl px-4 py-2 text-sm font-medium', disabled: false },
  missed: { label: 'Não realizada ❌', className: 'bg-danger/20 text-danger border border-danger/30 rounded-xl px-4 py-2 text-sm font-medium', disabled: true },
};

export const CompletionButton: React.FC<CompletionButtonProps> = ({
  task,
  familyId,
  userId,
  completion,
  requireApproval,
  requirePhotoProof,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentStatus = completion?.status ?? 'pending';
  const config = statusConfig[currentStatus] ?? statusConfig.pending;

  const handleClick = async () => {
    if (config.disabled) return;

    if (requirePhotoProof) {
      fileInputRef.current?.click();
      return;
    }
    await completeTask();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await completeTask(file);
    // reset input so same file can be selected again
    e.target.value = '';
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

  return (
    <div>
      <button
        className={`${config.className} w-full flex items-center justify-center gap-2 transition-opacity ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
        onClick={handleClick}
        disabled={config.disabled || loading}
      >
        {loading ? (
          <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : null}
        {requirePhotoProof && currentStatus === 'pending' ? '📷 ' : ''}{config.label}
      </button>

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

      {error && <p className="text-danger text-xs mt-1 text-center">{error}</p>}
    </div>
  );
};

export default CompletionButton;
