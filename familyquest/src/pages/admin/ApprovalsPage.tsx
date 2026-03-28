import React, { useState } from 'react';
import AppLayout from '../../components/layout/AppLayout';
import { usePendingApprovals } from '../../hooks/useCompletions';
import { useCurrentFamily, useCurrentMember } from '../../store/authStore';
import { approveCompletion, rejectCompletion } from '../../services/completion.service';
import { Completion } from '../../types';
import { useFamilyMembers } from '../../store/familyStore';

const PhotoModal: React.FC<{ url: string; onClose: () => void }> = ({ url, onClose }) => (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/60 p-4"
    onClick={onClose}
  >
    <div className="relative max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
      <img src={url} alt="Foto-prova" className="w-full rounded-DEFAULT object-contain max-h-[70vh]" />
      <button
        className="absolute top-2 right-2 bg-surface-container-lowest text-on-surface rounded-full w-8 h-8 flex items-center justify-center text-lg shadow-cloud"
        onClick={onClose}
      >
        ✕
      </button>
    </div>
  </div>
);

const RejectDialog: React.FC<{
  completion: Completion;
  onConfirm: (reason: string) => Promise<void>;
  onCancel: () => void;
}> = ({ completion, onConfirm, onCancel }) => {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!reason.trim()) return;
    setSubmitting(true);
    await onConfirm(reason.trim());
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-on-surface/60 p-4">
      <div className="bg-surface-container-lowest rounded-DEFAULT shadow-cloud p-5 w-full max-w-sm mb-4">
        <h3 className="font-headline font-bold text-on-surface mb-1">Rejeitar tarefa</h3>
        <p className="text-on-surface-variant text-sm mb-3">
          Motivo para <strong className="text-on-surface">{completion.taskTitle}</strong>
        </p>
        <textarea
          className="w-full bg-surface-container-low border-none rounded-DEFAULT px-3 py-2.5 text-on-surface text-sm placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          rows={3}
          placeholder="Ex: A foto não mostra a tarefa completa"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          autoFocus
        />
        <div className="flex gap-2 mt-3">
          <button
            className="flex-1 bg-surface-container-high hover:bg-surface-container-highest text-on-surface rounded-full py-2.5 text-sm font-medium transition-colors"
            onClick={onCancel}
          >
            Cancelar
          </button>
          <button
            className="flex-1 bg-error/15 hover:bg-error/25 text-error rounded-full py-2.5 text-sm font-headline font-bold transition-colors disabled:opacity-50"
            onClick={handleSubmit}
            disabled={!reason.trim() || submitting}
          >
            {submitting ? (
              <span className="w-4 h-4 border-2 border-error border-t-transparent rounded-full animate-spin inline-block" />
            ) : 'Rejeitar'}
          </button>
        </div>
      </div>
    </div>
  );
};

const ApprovalCard: React.FC<{
  completion: Completion;
  memberName: string;
  memberAvatar: string;
  familyId: string;
  adminUid: string;
}> = ({ completion, memberName, memberAvatar, familyId, adminUid }) => {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [approving, setApproving] = useState(false);

  const handleApprove = async () => {
    setApproving(true);
    try {
      await approveCompletion(familyId, adminUid, completion);
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async (reason: string) => {
    await rejectCompletion(familyId, adminUid, completion.id, reason);
    setRejectOpen(false);
  };

  const submittedAt = completion.submittedAt
    ? new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }).format(completion.submittedAt.toDate())
    : '--';

  return (
    <>
      <div className="bg-surface-container-lowest rounded-DEFAULT shadow-cloud p-5">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-2xl">{memberAvatar}</span>
          <div className="flex-1 min-w-0">
            <p className="text-on-surface font-headline font-bold text-sm truncate">{memberName}</p>
            <p className="text-on-surface-variant text-xs">{submittedAt}</p>
          </div>
          {completion.taskType === 'mandatory' && (
            <span className="text-xs bg-error-container/15 text-error border border-error/20 rounded-full px-2 py-0.5 flex-shrink-0 font-headline font-bold">
              Obrigatória
            </span>
          )}
        </div>

        <p className="text-on-surface font-medium text-sm mb-3">Tarefa: {completion.taskTitle}</p>

        {completion.photoProofUrl ? (
          <button
            className="w-full mb-3 rounded-DEFAULT overflow-hidden border border-outline-variant/20"
            onClick={() => setPhotoUrl(completion.photoProofUrl!)}
          >
            <img
              src={completion.photoProofUrl}
              alt="Foto-prova"
              className="w-full h-40 object-cover"
            />
            <p className="text-on-surface-variant text-xs py-1.5 bg-surface-container-low text-center">
              Toque para ampliar
            </p>
          </button>
        ) : (
          <div className="w-full mb-3 rounded-DEFAULT border border-outline-variant/20 bg-surface-container-low py-4 text-center">
            <p className="text-on-surface-variant text-xs">Sem foto-prova</p>
          </div>
        )}

        <p className="text-tertiary-dim font-headline font-bold text-xs mb-3">
          +{completion.pointsAwarded > 0 ? completion.pointsAwarded : '?'} pts ao aprovar
        </p>

        <div className="flex gap-2">
          <button
            className="flex-1 bg-error-container/15 hover:bg-error-container/25 text-error rounded-full py-2.5 text-sm font-headline font-bold transition-colors"
            onClick={() => setRejectOpen(true)}
          >
            Rejeitar
          </button>
          <button
            className="flex-1 bg-secondary/10 hover:bg-secondary/20 text-secondary rounded-full py-2.5 text-sm font-headline font-bold transition-colors disabled:opacity-50"
            onClick={handleApprove}
            disabled={approving}
          >
            {approving ? (
              <span className="w-4 h-4 border-2 border-secondary border-t-transparent rounded-full animate-spin inline-block" />
            ) : 'Aprovar'}
          </button>
        </div>
      </div>

      {photoUrl && <PhotoModal url={photoUrl} onClose={() => setPhotoUrl(null)} />}
      {rejectOpen && (
        <RejectDialog
          completion={completion}
          onConfirm={handleReject}
          onCancel={() => setRejectOpen(false)}
        />
      )}
    </>
  );
};

const ApprovalsPage: React.FC = () => {
  const family = useCurrentFamily();
  const adminMember = useCurrentMember();
  const members = useFamilyMembers();
  const { approvals, loading } = usePendingApprovals(family?.id);

  const memberMap = new Map(members.map((m) => [m.uid, m]));

  return (
    <AppLayout title="Aprovações">
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        </div>
      ) : approvals.length === 0 ? (
        <div className="bg-surface-container-lowest rounded-DEFAULT shadow-cloud text-center py-14 mt-4">
          <div className="text-5xl mb-3">✅</div>
          <h3 className="font-headline font-bold text-on-surface">Nenhuma aprovação pendente</h3>
          <p className="text-on-surface-variant text-sm mt-1">
            Quando seus filhos submeterem tarefas, elas aparecerão aqui.
          </p>
        </div>
      ) : (
        <div className="space-y-4 mt-2">
          <p className="text-on-surface-variant text-sm">
            {approvals.length} {approvals.length === 1 ? 'tarefa aguardando' : 'tarefas aguardando'} aprovação
          </p>
          {approvals.map((completion) => {
            const member = memberMap.get(completion.userId);
            return (
              <ApprovalCard
                key={completion.id}
                completion={completion}
                memberName={member?.displayName ?? 'Membro'}
                memberAvatar={member?.avatar ?? '??'}
                familyId={family?.id ?? ''}
                adminUid={adminMember?.uid ?? ''}
              />
            );
          })}
        </div>
      )}
    </AppLayout>
  );
};

export default ApprovalsPage;
