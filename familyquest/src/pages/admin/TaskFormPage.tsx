import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import AppLayout from '../../components/layout/AppLayout';
import TaskForm, { TaskFormValues, MemberOption } from '../../components/tasks/TaskForm';
import { useCurrentFamily, useCurrentMember } from '../../store/authStore';
import { createTask, updateTask, getActiveTasks } from '../../services/task.service';
import { Task } from '../../types';
import { db } from '../../firebase';

const TaskFormPage: React.FC = () => {
  const { taskId } = useParams<{ taskId?: string }>();
  const navigate = useNavigate();
  const family = useCurrentFamily();
  const member = useCurrentMember();
  const isEditing = Boolean(taskId);

  const [existingTask, setExistingTask] = useState<Task | undefined>(undefined);
  const [loadingTask, setLoadingTask] = useState(isEditing);
  const [members, setMembers] = useState<MemberOption[]>([]);
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

  // Load family members for assignment
  useEffect(() => {
    if (!family?.id) return;
    getDocs(collection(db, 'families', family.id, 'members')).then((snap) => {
      const list: MemberOption[] = snap.docs
        .map((d) => {
          const data = d.data();
          return {
            uid: d.id,
            displayName: data.displayName ?? 'Membro',
            avatar: data.avatar ?? '👤',
          };
        })
        // Show only active non-viewer members
        .filter((_, i) => snap.docs[i].data().isActive !== false);
      setMembers(list);
    });
  }, [family?.id]);

  const handleSubmit = async (values: TaskFormValues) => {
    if (!family?.id || !member?.uid) return;
    setSubmitError(null);

    try {
      // Build task data without undefined fields — Firestore rejects undefined values
      const taskData: Record<string, unknown> = {
        title: values.title,
        description: values.description ?? '',
        category: values.category,
        emoji: values.emoji ?? '',
        type: values.type,
        frequency: values.frequency,
        pointsOnComplete: values.pointsOnComplete,
        // UI shows positive value — convert to negative for mandatory, 0 for optional
        pointsOnMiss: values.type === 'mandatory' ? -Math.abs(values.pointsOnMiss) : 0,
        assignedTo: values.assignedTo,
        requireApproval: values.requireApproval,
        requirePhotoProof: values.requirePhotoProof,
      };

      // Only include frequency-specific fields when applicable
      if (values.frequency === 'weekly') {
        taskData.activeDays = values.activeDays ?? [];
      }
      if (values.frequency === 'monthly') {
        taskData.dayOfMonth = values.dayOfMonth;
      }
      if (values.frequency === 'monthly_relative') {
        taskData.weekOfMonth = values.weekOfMonth;
        taskData.dayOfWeekRelative = values.dayOfWeekRelative;
      }
      if (values.frequency === 'once' && values.startDate) {
        taskData.startDate = new Date(values.startDate);
      }
      if (values.dueTime) {
        taskData.dueTime = values.dueTime;
      }

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
      const message =
        err instanceof Error ? err.message : 'Erro ao salvar tarefa. Tente novamente.';
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
          members={members}
        />
      </div>
    </AppLayout>
  );
};

export default TaskFormPage;
