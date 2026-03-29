import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import AppLayout from '../../components/layout/AppLayout';
import TaskCard, { TaskMember } from '../../components/tasks/TaskCard';
import { useTasks } from '../../hooks/useTasks';
import { useCurrentFamily, useCurrentMember } from '../../store/authStore';
import { deactivateTask, deleteTaskCompletions } from '../../services/task.service';
import { Task } from '../../types';

// ─── Delete Confirm Dialog ────────────────────────────────────────────────────

const DeleteTaskDialog: React.FC<{
  task: Task;
  onConfirm: (deleteHistory: boolean) => Promise<void>;
  onCancel: () => void;
}> = ({ task, onConfirm, onCancel }) => {
  const [deleting, setDeleting] = useState(false);
  const [deleteHistory, setDeleteHistory] = useState(false);
  const deleteHistoryRef = useRef(false);

  const toggleHistory = () => {
    const next = !deleteHistoryRef.current;
    deleteHistoryRef.current = next;
    setDeleteHistory(next);
  };

  const handle = async () => {
    setDeleting(true);
    try {
      await onConfirm(deleteHistoryRef.current);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-on-surface/60 p-5">
      <div className="bg-surface-container-lowest rounded-DEFAULT shadow-cloud p-5 w-full max-w-sm">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-error-container/20 flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-error">delete</span>
          </div>
          <div>
            <h3 className="font-headline font-bold text-on-surface text-base">Remover tarefa</h3>
            <p className="text-on-surface-variant text-xs truncate max-w-[200px]">"{task.title}"</p>
          </div>
        </div>

        {/* Toggle: also delete history */}
        <button
          type="button"
          onClick={toggleHistory}
          disabled={deleting}
          className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-DEFAULT border-2 transition-colors mb-4 ${
            deleteHistory
              ? 'border-error/40 bg-error/5'
              : 'border-outline-variant/20 bg-surface-container-low'
          }`}
        >
          <div className="text-left">
            <p className={`text-sm font-headline font-bold ${deleteHistory ? 'text-error' : 'text-on-surface'}`}>
              Apagar histórico de conclusões
            </p>
            <p className="text-on-surface-variant text-xs mt-0.5">
              {deleteHistory
                ? 'Todas as conclusões registradas serão apagadas.'
                : 'O histórico de conclusões será preservado.'}
            </p>
          </div>
          {/* Toggle switch */}
          <div className={`relative w-12 h-6 rounded-full flex-shrink-0 transition-colors ${deleteHistory ? 'bg-error' : 'bg-gray-300'}`}>
            <span className={`absolute top-[2px] w-5 h-5 bg-white rounded-full shadow-md transition-all duration-200 ${deleteHistory ? 'left-[26px]' : 'left-[2px]'}`} />
          </div>
        </button>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            disabled={deleting}
            className="flex-1 bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant rounded-full py-2.5 text-sm font-medium transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handle}
            disabled={deleting}
            className={`flex-1 rounded-full py-2.5 text-sm font-headline font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2 ${
              deleteHistory
                ? 'bg-error text-white hover:bg-error/90'
                : 'bg-surface-container-high hover:bg-surface-container-highest text-on-surface'
            }`}
          >
            {deleting && (
              <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            )}
            Remover
          </button>
        </div>
      </div>
    </div>
  );
};

type MemberFilter = TaskMember;

const TasksPage: React.FC = () => {
  const navigate = useNavigate();
  const family = useCurrentFamily();
  const member = useCurrentMember();
  const { tasks, loading } = useTasks(family?.id);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [members, setMembers] = useState<MemberFilter[]>([]);
  const [selectedUid, setSelectedUid] = useState<string | null>(null); // null = todos

  // Load family members for filter
  useEffect(() => {
    if (!family?.id) return;
    getDocs(collection(db, 'families', family.id, 'members')).then((snap) => {
      setMembers(
        snap.docs
          .filter((d) => d.data().isActive !== false)
          .map((d) => ({
            uid: d.id,
            displayName: d.data().displayName ?? 'Membro',
            avatar: d.data().avatar ?? '👤',
          }))
      );
    });
  }, [family?.id]);

  // Filter tasks by selected member
  const filteredTasks = selectedUid
    ? tasks.filter((t) => {
        if (t.assignedTo === 'all') return true; // 'all' = livre = aparece para todos
        return Array.isArray(t.assignedTo) && t.assignedTo.includes(selectedUid);
      })
    : tasks;

  const mandatory = filteredTasks.filter((t) => t.type === 'mandatory');
  const optional = filteredTasks.filter((t) => t.type === 'optional');

  const handleEdit = (task: Task) => {
    navigate(`/admin/tasks/${task.id}/edit`);
  };

  const handleStats = (task: Task) => {
    navigate(`/admin/tasks/${task.id}/stats`);
  };

  const handleDelete = (task: Task) => {
    setTaskToDelete(task);
  };

  const handleDeleteConfirm = async (deleteHistory: boolean) => {
    if (!taskToDelete || !family?.id) return;
    setDeletingId(taskToDelete.id);
    try {
      if (deleteHistory) {
        await deleteTaskCompletions(family.id, taskToDelete.id);
      }
      await deactivateTask(family.id, taskToDelete.id);
    } finally {
      setDeletingId(null);
      setTaskToDelete(null);
    }
  };

  return (
    <AppLayout
      title="Tarefas"
      rightAction={
        <button
          className="text-primary font-headline font-bold text-sm"
          onClick={() => navigate('/admin/tasks/new')}
        >
          + Nova
        </button>
      }
    >
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        </div>
      ) : tasks.length === 0 ? (
        <div className="bg-surface-container-lowest rounded-DEFAULT shadow-cloud text-center py-12 mt-4">
          <div className="text-5xl mb-3">✅</div>
          <h3 className="font-headline font-bold text-on-surface">Nenhuma tarefa criada</h3>
          <p className="text-on-surface-variant text-sm mt-1 mb-4">
            Crie tarefas para sua família começar a ganhar pontos!
          </p>
          <button
            className="primary-gradient text-on-primary font-headline font-bold px-6 py-3 rounded-full shadow-primary-glow mx-auto"
            onClick={() => navigate('/admin/tasks/new')}
          >
            Criar primeira tarefa
          </button>
        </div>
      ) : (
        <div className="space-y-4 mt-2">

          {/* ── Person filter chips ── */}
          {members.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-none">
              {/* Todos */}
              <button
                onClick={() => setSelectedUid(null)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  selectedUid === null
                    ? 'bg-primary text-on-primary shadow-sm'
                    : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
                }`}
              >
                <span className="material-symbols-outlined text-sm">groups</span>
                Todos
              </button>

              {/* Member chips */}
              {members.map((m) => (
                <button
                  key={m.uid}
                  onClick={() => setSelectedUid(m.uid === selectedUid ? null : m.uid)}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    selectedUid === m.uid
                      ? 'bg-secondary text-on-secondary shadow-sm'
                      : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
                  }`}
                >
                  <span className="text-base leading-none">{m.avatar}</span>
                  {m.displayName}
                </button>
              ))}
            </div>
          )}

          {/* ── Empty filtered state ── */}
          {filteredTasks.length === 0 && selectedUid && (
            <div className="text-center py-10 text-on-surface-variant">
              <div className="text-4xl mb-2">
                {members.find((m) => m.uid === selectedUid)?.avatar ?? '👤'}
              </div>
              <p className="text-sm font-medium">
                Nenhuma tarefa atribuída a{' '}
                <span className="text-on-surface font-bold">
                  {members.find((m) => m.uid === selectedUid)?.displayName}
                </span>
              </p>
            </div>
          )}

          {/* ── Mandatory section ── */}
          {mandatory.length > 0 && (
            <section>
              <h3 className="text-on-surface-variant text-xs font-headline font-bold uppercase tracking-wider mb-3">
                ⚠️ Obrigatórias ({mandatory.length})
              </h3>
              <div className="space-y-3">
                {mandatory.map((task) => (
                  <div
                    key={task.id}
                    className={deletingId === task.id ? 'opacity-50 pointer-events-none' : ''}
                  >
                    <TaskCard
                      task={task}
                      familyId={family?.id ?? ''}
                      userId={member?.uid ?? ''}
                      completion={undefined}
                      requireApproval={false}
                      requirePhotoProof={false}
                      adminMode
                      members={members}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      onStats={handleStats}
                    />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── Optional section ── */}
          {optional.length > 0 && (
            <section>
              <h3 className="text-on-surface-variant text-xs font-headline font-bold uppercase tracking-wider mb-3">
                ⭐ Opcionais ({optional.length})
              </h3>
              <div className="space-y-3">
                {optional.map((task) => (
                  <div
                    key={task.id}
                    className={deletingId === task.id ? 'opacity-50 pointer-events-none' : ''}
                  >
                    <TaskCard
                      task={task}
                      familyId={family?.id ?? ''}
                      userId={member?.uid ?? ''}
                      completion={undefined}
                      requireApproval={false}
                      requirePhotoProof={false}
                      adminMode
                      members={members}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      onStats={handleStats}
                    />
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {taskToDelete && (
        <DeleteTaskDialog
          task={taskToDelete}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setTaskToDelete(null)}
        />
      )}
    </AppLayout>
  );
};

export default TasksPage;
