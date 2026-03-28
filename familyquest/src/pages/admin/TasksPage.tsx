import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../../components/layout/AppLayout';
import TaskCard from '../../components/tasks/TaskCard';
import { useTasks } from '../../hooks/useTasks';
import { useCurrentFamily, useCurrentMember } from '../../store/authStore';
import { deactivateTask } from '../../services/task.service';
import { Task } from '../../types';

const TasksPage: React.FC = () => {
  const navigate = useNavigate();
  const family = useCurrentFamily();
  const member = useCurrentMember();
  const { tasks, loading } = useTasks(family?.id);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const mandatory = tasks.filter((t) => t.type === 'mandatory');
  const optional = tasks.filter((t) => t.type === 'optional');

  const handleEdit = (task: Task) => {
    navigate(`/admin/tasks/${task.id}/edit`);
  };

  const handleDelete = async (task: Task) => {
    if (!family?.id) return;
    const confirmed = window.confirm(`Remover a tarefa "${task.title}"? Esta ação não pode ser desfeita.`);
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
          <p className="text-on-surface-variant text-sm mt-1 mb-4">Crie tarefas para sua família começar a ganhar pontos!</p>
          <button
            className="primary-gradient text-on-primary font-headline font-bold px-6 py-3 rounded-full shadow-primary-glow mx-auto"
            onClick={() => navigate('/admin/tasks/new')}
          >
            Criar primeira tarefa
          </button>
        </div>
      ) : (
        <div className="space-y-6 mt-2">
          {mandatory.length > 0 && (
            <section>
              <h3 className="text-on-surface-variant text-xs font-headline font-bold uppercase tracking-wider mb-3">
                ⚠️ Obrigatórias ({mandatory.length})
              </h3>
              <div className="space-y-3">
                {mandatory.map((task) => (
                  <div key={task.id} className={deletingId === task.id ? 'opacity-50 pointer-events-none' : ''}>
                    <TaskCard
                      task={task}
                      familyId={family?.id ?? ''}
                      userId={member?.uid ?? ''}
                      completion={undefined}
                      requireApproval={false}
                      requirePhotoProof={false}
                      adminMode
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                    />
                  </div>
                ))}
              </div>
            </section>
          )}

          {optional.length > 0 && (
            <section>
              <h3 className="text-on-surface-variant text-xs font-headline font-bold uppercase tracking-wider mb-3">
                ⭐ Opcionais ({optional.length})
              </h3>
              <div className="space-y-3">
                {optional.map((task) => (
                  <div key={task.id} className={deletingId === task.id ? 'opacity-50 pointer-events-none' : ''}>
                    <TaskCard
                      task={task}
                      familyId={family?.id ?? ''}
                      userId={member?.uid ?? ''}
                      completion={undefined}
                      requireApproval={false}
                      requirePhotoProof={false}
                      adminMode
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
