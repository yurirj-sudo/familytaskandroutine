import React, { useMemo } from 'react';
import AppLayout from '../../components/layout/AppLayout';
import TaskCard from '../../components/tasks/TaskCard';
import PushPermissionBanner from '../../components/notifications/PushPermissionBanner';
import { useCurrentFamily, useCurrentMember } from '../../store/authStore';
import { useTodayTasks } from '../../hooks/useTasks';
import { useTodayCompletions } from '../../hooks/useCompletions';
import { formatDateFull } from '../../utils/date';

const LEVEL_NAMES = ['Iniciante', 'Aprendiz', 'Aventureiro', 'Herói', 'Campeão', 'Lenda'];
const XP_PER_LEVEL = 150;

function getMemberLevel(pts: number) {
  const level = Math.floor(pts / XP_PER_LEVEL) + 1;
  const xpInLevel = pts % XP_PER_LEVEL;
  const levelName = LEVEL_NAMES[Math.min(level - 1, LEVEL_NAMES.length - 1)];
  const pct = Math.round((xpInLevel / XP_PER_LEVEL) * 100);
  return { level, xpInLevel, xpNeeded: XP_PER_LEVEL, levelName, pct };
}

const HomePage: React.FC = () => {
  const family = useCurrentFamily();
  const member = useCurrentMember();

  const { mandatory, optional, loading } = useTodayTasks(family?.id, member?.uid);
  const { completionMap, loading: loadingCompletions } = useTodayCompletions(
    family?.id,
    member?.uid
  );



  const stats = useMemo(() => {
    const allToday = [...mandatory, ...optional];
    const done = allToday.filter((t) => {
      const c = completionMap.get(t.id);
      return c?.status === 'completed' || c?.status === 'approved' || c?.status === 'submitted';
    });
    const pending = allToday.filter(
      (t) => !completionMap.has(t.id) || completionMap.get(t.id)?.status === 'pending'
    );
    const pointsToday = [...completionMap.values()]
      .filter((c) => c.status === 'completed' || c.status === 'approved')
      .reduce((sum, c) => sum + (c.pointsAwarded ?? 0), 0);
    return { done: done.length, total: allToday.length, pending: pending.length, pointsToday };
  }, [mandatory, optional, completionMap]);

  const levelInfo = getMemberLevel(member?.lifetimePoints ?? member?.totalPoints ?? 0);
  const isLoading = loading || loadingCompletions;

  return (
    <AppLayout>
      <PushPermissionBanner />

      {/* Greeting */}
      <div className="mb-6 pt-2">
        <p className="text-on-surface-variant text-sm capitalize">{formatDateFull(new Date())}</p>
        <h2 className="text-2xl font-headline font-extrabold text-on-surface mt-0.5">
          Olá, {member?.displayName?.split(' ')[0] ?? 'você'}! {member?.avatar ?? '👋'}
        </h2>
      </div>

      {/* Level / XP Hero Card */}
      <div className="bg-surface-container-lowest p-6 rounded-DEFAULT shadow-cloud relative overflow-hidden mb-5">
        {/* Points badge — rotated sticker */}
        <div className="absolute top-4 right-4 bg-tertiary-container text-on-tertiary-container font-headline font-bold px-4 py-1 rounded-full text-sm shadow-cloud"
          style={{ transform: 'rotate(3deg)' }}>
          {member?.totalPoints ?? 0} pts
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <p className="text-on-surface-variant text-sm font-medium">Nível Atual</p>
            <h3 className="text-xl font-headline font-extrabold text-primary">
              Nível {levelInfo.level} — {levelInfo.levelName}
            </h3>
          </div>

          {/* XP progress bar */}
          <div className="space-y-2">
            <div className="h-4 w-full bg-surface-container-high rounded-full overflow-hidden p-0.5">
              <div
                className="h-full primary-gradient rounded-full transition-all duration-500"
                style={{ width: `${levelInfo.pct}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] font-headline font-bold text-on-surface-variant uppercase tracking-widest">
              <span>0 XP</span>
              <span>Próximo Nível: {levelInfo.xpNeeded} XP</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats bento */}
      <div className="grid grid-cols-2 gap-4 mb-5">
        <div className="bg-surface-container-low p-5 rounded-DEFAULT flex flex-col items-center justify-center space-y-2 text-center border-b-4 border-primary/10">
          <span className="material-symbols-outlined text-primary" style={{ fontSize: '2rem' }}>task_alt</span>
          <div>
            <p className="text-2xl font-headline font-extrabold text-on-surface">{stats.done}/{stats.total}</p>
            <p className="text-[10px] font-headline font-bold text-on-surface-variant uppercase tracking-tighter">Tarefas Hoje</p>
          </div>
        </div>
        <div className="bg-surface-container-low p-5 rounded-DEFAULT flex flex-col items-center justify-center space-y-2 text-center border-b-4 border-tertiary/10">
          <span className="material-symbols-outlined text-tertiary" style={{ fontSize: '2rem' }}>local_fire_department</span>
          <div>
            <p className="text-2xl font-headline font-extrabold text-on-surface">{member?.currentStreak ?? 0}</p>
            <p className="text-[10px] font-headline font-bold text-on-surface-variant uppercase tracking-tighter">Dias Seguidos</p>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        </div>
      ) : mandatory.length === 0 && optional.length === 0 ? (
        <div className="bg-surface-container-lowest rounded-DEFAULT shadow-cloud text-center py-12">
          <span className="text-4xl">🎉</span>
          <h3 className="font-headline font-bold text-on-surface mt-2">Nenhuma tarefa hoje!</h3>
          <p className="text-on-surface-variant text-sm mt-1">Aproveite o dia livre.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {mandatory.length > 0 && (
            <section>
              <h3 className="text-on-surface-variant text-xs font-headline font-bold uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-error" style={{ fontSize: '1rem' }}>warning</span>
                Obrigatórias
              </h3>
              <div className="space-y-3">
                {mandatory.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    familyId={family?.id ?? ''}
                    userId={member?.uid ?? ''}
                    completion={completionMap.get(task.id)}
                    requireApproval={task.requireApproval ?? false}
                    requirePhotoProof={task.requirePhotoProof ?? false}
                  />
                ))}
              </div>
            </section>
          )}

          {optional.length > 0 && (
            <section>
              <h3 className="text-on-surface-variant text-xs font-headline font-bold uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-tertiary material-symbols-filled" style={{ fontSize: '1rem' }}>stars</span>
                Opcionais (bônus)
              </h3>
              <div className="space-y-3">
                {optional.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    familyId={family?.id ?? ''}
                    userId={member?.uid ?? ''}
                    completion={completionMap.get(task.id)}
                    requireApproval={task.requireApproval ?? false}
                    requirePhotoProof={task.requirePhotoProof ?? false}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </AppLayout>
  );
};

export default HomePage;
