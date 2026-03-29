import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import AppLayout from '../../components/layout/AppLayout';
import TaskCard, { TaskMember } from '../../components/tasks/TaskCard';
import { useTasks } from '../../hooks/useTasks';
import { useCurrentFamily, useCurrentMember } from '../../store/authStore';
import { deactivateTask } from '../../services/task.service';
import { Task } from '../../types';

type MemberFilter = TaskMember;

const TasksPage: React.FC = () => {
  const navigate = useNavigate();
  const family = useCurrentFamily();
  const member = useCurrentMember();
  const { tasks, loading } = useTasks(family?.id);
  const [deletingId, setDeletingId] = useState<string | null>(null);
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

  const handleDelete = async (task: Task) => {
    if (!family?.id) return;
    const confirmed = window.confirm(
      `Remover a tarefa "${task.title}"? Esta ação não pode ser desfeita.`
    );
    if (!confirmed) return;
    setDeletingId(task.id);
    try {
      await deactivateTask(family.id, task.id);
    } finally {
      setDeletingId(null);
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
                    />
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </AppLayout>
  );
};

export default TasksPage;
