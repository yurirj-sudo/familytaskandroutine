import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import AppLayout from '../../components/layout/AppLayout';
import { useCurrentFamily } from '../../store/authStore';
import { useFamilyMembers } from '../../store/familyStore';
import { getActiveTasks } from '../../services/task.service';
import { isTaskDueToday } from '../../utils/recurrence';
import { Task, Completion, Member } from '../../types';

// Count how many days in a given month the task was due
function countDueDaysInMonth(task: Task, year: number, month: number): number {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  // Only count up to today if it's the current month
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
  const limit = isCurrentMonth ? today.getDate() : daysInMonth;

  let count = 0;
  for (let d = 1; d <= limit; d++) {
    const date = new Date(year, month, d);
    if (isTaskDueToday(task, date)) count++;
  }
  return count;
}

const TaskStatsPage: React.FC = () => {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const family = useCurrentFamily();
  const members = useFamilyMembers();

  const [task, setTask] = useState<Task | undefined>();
  const [completions, setCompletions] = useState<Completion[]>([]);
  const [loading, setLoading] = useState(true);

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const cycleId = `${year}-${String(month + 1).padStart(2, '0')}`;

  useEffect(() => {
    if (!family?.id || !taskId) return;

    const load = async () => {
      // Load task definition
      const tasks = await getActiveTasks(family.id);
      const found = tasks.find((t) => t.id === taskId);
      setTask(found);

      // Load completions for this task this month
      const startOfMonth = Timestamp.fromDate(new Date(year, month, 1));
      const endOfMonth = Timestamp.fromDate(new Date(year, month + 1, 0, 23, 59, 59));

      const snap = await getDocs(
        query(
          collection(db, 'families', family.id, 'completions'),
          where('taskId', '==', taskId),
          where('dueDate', '>=', startOfMonth),
          where('dueDate', '<=', endOfMonth)
        )
      );
      setCompletions(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Completion)));
      setLoading(false);
    };

    load();
  }, [family?.id, taskId, year, month]);

  if (loading) {
    return (
      <AppLayout title="Desempenho da tarefa" showBack>
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        </div>
      </AppLayout>
    );
  }

  if (!task) {
    return (
      <AppLayout title="Tarefa não encontrada" showBack>
        <div className="text-center py-16 text-on-surface-variant">Tarefa não encontrada.</div>
      </AppLayout>
    );
  }

  const dueDays = countDueDaysInMonth(task, year, month);
  const monthLabel = now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  // Build per-member stats
  const assignedMembers: Member[] =
    task.assignedTo === 'all'
      ? members
      : members.filter(
          (m) => Array.isArray(task.assignedTo) && task.assignedTo.includes(m.uid)
        );

  const memberStats = assignedMembers.map((m) => {
    const mc = completions.filter((c) => c.userId === m.uid);
    const done = mc.filter((c) => c.status === 'completed' || c.status === 'approved').length;
    const missed = mc.filter((c) => c.status === 'missed').length;
    const pending = mc.filter((c) => c.status === 'pending' || c.status === 'submitted').length;
    const pct = dueDays > 0 ? Math.round((done / dueDays) * 100) : 0;
    return { member: m, done, missed, pending, pct };
  });

  const totalDone = completions.filter(
    (c) => c.status === 'completed' || c.status === 'approved'
  ).length;
  const totalExpected = dueDays * assignedMembers.length;
  const overallPct = totalExpected > 0 ? Math.round((totalDone / totalExpected) * 100) : 0;

  // Recent completions (last 10, most recent first)
  const recentCompletions = [...completions]
    .filter((c) => c.status === 'completed' || c.status === 'approved' || c.status === 'missed')
    .sort((a, b) => {
      const ta = a.dueDate?.toMillis() ?? 0;
      const tb = b.dueDate?.toMillis() ?? 0;
      return tb - ta;
    })
    .slice(0, 15);

  const statusColor: Record<string, string> = {
    completed: 'text-secondary',
    approved: 'text-secondary',
    missed: 'text-error',
    pending: 'text-amber-500',
    submitted: 'text-amber-500',
    rejected: 'text-error',
  };
  const statusLabel: Record<string, string> = {
    completed: 'Feita',
    approved: 'Aprovada',
    missed: 'Não feita',
    pending: 'Pendente',
    submitted: 'Aguardando',
    rejected: 'Rejeitada',
  };

  return (
    <AppLayout title="Desempenho" showBack>
      <div className="space-y-4 mt-2 pb-8">

        {/* Task header */}
        <div className="bg-surface-container-lowest rounded-DEFAULT shadow-cloud p-4 flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-surface-container flex items-center justify-center text-2xl flex-shrink-0">
            {task.emoji || (task.type === 'mandatory' ? '⚠️' : '⭐')}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-headline font-bold text-on-surface text-base truncate">{task.title}</h2>
            <p className="text-on-surface-variant text-xs capitalize">{monthLabel}</p>
          </div>
          <span className={`text-xs font-headline font-bold uppercase rounded-full px-2.5 py-1 ${
            task.type === 'mandatory'
              ? 'bg-error-container/15 text-error'
              : 'bg-primary/10 text-primary'
          }`}>
            {task.type === 'mandatory' ? 'Obrigatória' : 'Opcional'}
          </span>
        </div>

        {/* Overall rate */}
        <div className="bg-surface-container-lowest rounded-DEFAULT shadow-cloud p-4">
          <p className="text-on-surface-variant text-xs font-headline font-bold uppercase tracking-wider mb-3">
            Taxa global este mês
          </p>
          <div className="flex items-end gap-3 mb-3">
            <span className={`text-5xl font-headline font-bold ${
              overallPct >= 80 ? 'text-secondary' : overallPct >= 50 ? 'text-amber-500' : 'text-error'
            }`}>
              {overallPct}%
            </span>
            <span className="text-on-surface-variant text-sm mb-1.5">
              {totalDone} de {totalExpected} esperadas
            </span>
          </div>
          {/* Progress bar */}
          <div className="h-3 bg-surface-container-high rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                overallPct >= 80 ? 'bg-secondary' : overallPct >= 50 ? 'bg-amber-400' : 'bg-error'
              }`}
              style={{ width: `${overallPct}%` }}
            />
          </div>
          <p className="text-on-surface-variant text-xs mt-2">
            {dueDays} {dueDays === 1 ? 'dia esperado' : 'dias esperados'} no período •{' '}
            {assignedMembers.length} {assignedMembers.length === 1 ? 'membro' : 'membros'}
          </p>
        </div>

        {/* Per-member breakdown */}
        {memberStats.length > 0 && (
          <div className="bg-surface-container-lowest rounded-DEFAULT shadow-cloud p-4">
            <p className="text-on-surface-variant text-xs font-headline font-bold uppercase tracking-wider mb-3">
              Por membro
            </p>
            <div className="space-y-3">
              {memberStats.map(({ member: m, done, missed, pct }) => (
                <div key={m.uid}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg leading-none">{m.avatar || '👤'}</span>
                    <span className="text-on-surface text-sm font-medium flex-1">{m.displayName}</span>
                    <span className={`text-sm font-headline font-bold ${
                      pct >= 80 ? 'text-secondary' : pct >= 50 ? 'text-amber-500' : 'text-error'
                    }`}>
                      {pct}%
                    </span>
                  </div>
                  <div className="h-2 bg-surface-container-high rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        pct >= 80 ? 'bg-secondary' : pct >= 50 ? 'bg-amber-400' : 'bg-error'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="text-on-surface-variant text-[10px] mt-0.5">
                    {done} feita{done !== 1 ? 's' : ''} · {missed} perdida{missed !== 1 ? 's' : ''}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent history */}
        {recentCompletions.length > 0 && (
          <div className="bg-surface-container-lowest rounded-DEFAULT shadow-cloud p-4">
            <p className="text-on-surface-variant text-xs font-headline font-bold uppercase tracking-wider mb-3">
              Histórico recente
            </p>
            <div className="space-y-2">
              {recentCompletions.map((c) => {
                const m = members.find((mb) => mb.uid === c.userId);
                const dateLabel = c.dueDate
                  ? new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' }).format(
                      c.dueDate.toDate()
                    )
                  : '--';
                return (
                  <div key={c.id} className="flex items-center gap-2">
                    <span className="text-base leading-none w-6 text-center">
                      {m?.avatar || '👤'}
                    </span>
                    <span className="text-on-surface text-xs flex-1">{m?.displayName ?? 'Membro'}</span>
                    <span className="text-on-surface-variant text-xs">{dateLabel}</span>
                    <span className={`text-xs font-headline font-bold w-20 text-right ${statusColor[c.status] ?? 'text-on-surface-variant'}`}>
                      {statusLabel[c.status] ?? c.status}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {recentCompletions.length === 0 && (
          <div className="bg-surface-container-lowest rounded-DEFAULT shadow-cloud p-8 text-center">
            <div className="text-4xl mb-2">📊</div>
            <p className="text-on-surface-variant text-sm">Nenhum registro de conclusão este mês.</p>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default TaskStatsPage;
