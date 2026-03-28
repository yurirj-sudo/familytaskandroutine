import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AppLayout from '../../components/layout/AppLayout';
import TaskForm, { TaskFormValues } from '../../components/tasks/TaskForm';
import { useCurrentFamily, useCurrentMember } from '../../store/authStore';
import { createTask, updateTask, getActiveTasks } from '../../services/task.service';
import { Task } from '../../types';

const TaskFormPage: React.FC = () => {
  const { taskId } = useParams<{ taskId?: string }>();
  const navigate = useNavigate();
  const family = useCurrentFamily();
  const member = useCurrentMember();
  const isEditing = Boolean(taskId);

  const [existingTask, setExistingTask] = useState<Task | undefined>(undefined);
  const [loadingTask, setLoadingTask] = useState(isEditing);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Load existing task when editing
  useEffect(() => {
    if (!isEditing || !family?.id) return;
    getActiveTasks(family.id).then((tasks) => {
      const found = tasks.find((t) => t.id === taskId);
      setExistingTask(found);
      setLoadingTask(false);
    });
  }, [isEditing, family?.id, taskId]);

  const handleSubmit = async (values: TaskFormValues) => {
    if (!family?.id || !member?.uid) return;
    setSubmitError(null);

    try {
      const taskData = {
        title: values.title,
        description: values.description ?? '',
        category: values.category,
        emoji: values.emoji ?? '',
        type: values.type,
        frequency: values.frequency,
        activeDays: values.frequency === 'weekly' ? (values.activeDays ?? []) : undefined,
        dayOfMonth: values.frequency === 'monthly' ? values.dayOfMonth : undefined,
        weekOfMonth: values.frequency === 'monthly_relative' ? (values.weekOfMonth as 1 | 2 | 3 | 4) : undefined,
        dayOfWeekRelative: values.frequency === 'monthly_relative' ? values.dayOfWeekRelative : undefined,
        dueTime: values.dueTime || undefined,
        pointsOnComplete: values.pointsOnComplete,
        pointsOnMiss: values.type === 'mandatory' ? values.pointsOnMiss : 0,
        assignedTo: values.assignedTo,
        startDate: values.frequency === 'once' && values.startDate
          ? new Date(values.startDate)
          : undefined,
      };

      if (isEditing && taskId) {
        await updateTask(family.id, taskId, taskData);
      } else {
        await createTask({
          familyId: family.id,
          createdBy: member.uid,
          data: taskData,
        });
      }

      navigate('/admin/tasks');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao salvar tarefa. Tente novamente.';
      setSubmitError(message);
    }
  };

  if (loadingTask) {
    return (
      <AppLayout title={isEditing ? 'Editar Tarefa' : 'Nova Tarefa'} showBack>
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title={isEditing ? 'Editar Tarefa' : 'Nova Tarefa'} showBack>
      <div className="mt-4 pb-8">
        {submitError && (
          <div className="mb-4 px-4 py-3 rounded-DEFAULT bg-error-container text-on-error-container text-sm flex items-start gap-2">
            <span className="material-symbols-outlined text-base mt-0.5">error</span>
            <span>{submitError}</span>
          </div>
        )}
        <TaskForm
          initialValues={existingTask}
          onSubmit={handleSubmit}
          onCancel={() => navigate('/admin/tasks')}
          isEditing={isEditing}
        />
      </div>
    </AppLayout>
  );
};

export default TaskFormPage;
