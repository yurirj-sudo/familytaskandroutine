import React, { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import AppLayout from '../../components/layout/AppLayout';
import Avatar from '../../components/ui/Avatar';
import { useCurrentFamily, useCurrentMember } from '../../store/authStore';
import { useFamilyMembers } from '../../store/familyStore';
import { useMemberCycles, useFamilyCurrentCycles } from '../../hooks/useCycle';
import { getMonthName } from '../../utils/date';
import { Cycle } from '../../types';

// ─── Custom tooltip ────────────────────────────────────────────────────────────

interface TooltipEntry { name: string; value: number; color: string; }
const ChartTooltip: React.FC<{ active?: boolean; payload?: TooltipEntry[]; label?: string }> = ({
  active, payload, label,
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface-container-lowest border border-outline-variant/20 rounded-DEFAULT p-3 text-xs space-y-1 shadow-cloud">
      <p className="text-on-surface-variant mb-1 capitalize">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-on-surface font-bold">{p.value} pts</span>
        </div>
      ))}
    </div>
  );
};

// ─── PerformancePage ───────────────────────────────────────────────────────────

const PerformancePage: React.FC = () => {
  const family = useCurrentFamily();
  const member = useCurrentMember();
  const members = useFamilyMembers();
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const { cycles: myCycles, loading: loadingCycles } = useMemberCycles(family?.id, member?.uid);
  const { cycles: familyCycles, loading: loadingRanking } = useFamilyCurrentCycles(
    family?.id, currentMonth, currentYear
  );

  // Chart data: last 6 months of personal cycles (oldest first)
  const chartData = useMemo(() => {
    return [...myCycles]
      .slice(0, 6)
      .reverse()
      .map((c: Cycle) => ({
        name: getMonthName(c.month).slice(0, 3),
        Ganhos: c.pointsEarned,
        Perdidos: Math.abs(c.pointsLost),
        Gastos: c.pointsSpent,
      }));
  }, [myCycles]);

  // Current cycle stats
  const currentCycle = myCycles.find(
    (c) => c.month === currentMonth && c.year === currentYear
  );

  // Family ranking: map family cycles to members
  const ranking = useMemo(() => {
    return members
      .map((m) => {
        const cycle = familyCycles.find((c) => c.userId === m.uid);
        return {
          member: m,
          points: cycle?.pointsEarned ?? m.totalPoints,
          completionRate: cycle?.completionRate ?? 0,
          hasCycle: !!cycle,
        };
      })
      .sort((a, b) => b.points - a.points);
  }, [members, familyCycles]);

  const myRank = ranking.findIndex((r) => r.member.uid === member?.uid) + 1;

  return (
    <AppLayout title="Desempenho">
      <div className="space-y-5 mt-4">

        {/* Current cycle summary */}
        <div className="grid grid-cols-2 gap-3">
          <div className="primary-gradient rounded-DEFAULT p-4 text-center shadow-primary-glow">
            <p className="text-on-primary/70 text-xs mb-1">Pontos atuais</p>
            <p className="text-on-primary font-headline font-black text-2xl">{(member?.totalPoints ?? 0).toLocaleString('pt-BR')}</p>
            <p className="text-on-primary/60 text-xs">pts</p>
          </div>
          <div className="bg-surface-container-lowest rounded-DEFAULT shadow-cloud p-4 text-center">
            <p className="text-on-surface-variant text-xs mb-1">Minha posição</p>
            <p className="text-on-surface font-headline font-black text-2xl">
              {myRank === 0 ? '-' : `${myRank}°`}
            </p>
            <p className="text-on-surface-variant text-xs">no ranking</p>
          </div>
        </div>

        {/* Streak */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-surface-container-lowest rounded-DEFAULT shadow-cloud p-4 text-center">
            <span className="text-2xl">🔥</span>
            <p className="text-on-surface font-headline font-bold text-lg mt-1">{member?.currentStreak ?? 0}</p>
            <p className="text-on-surface-variant text-xs">Sequência atual</p>
          </div>
          <div className="bg-surface-container-lowest rounded-DEFAULT shadow-cloud p-4 text-center">
            <span className="text-2xl">⭐</span>
            <p className="text-on-surface font-headline font-bold text-lg mt-1">{member?.longestStreak ?? 0}</p>
            <p className="text-on-surface-variant text-xs">Recorde pessoal</p>
          </div>
        </div>

        {/* Completion rate for current month */}
        {currentCycle && (
          <div className="bg-surface-container-lowest rounded-DEFAULT shadow-cloud p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-on-surface-variant text-xs font-headline font-bold uppercase tracking-wider">
                Taxa de conclusão — {getMonthName(currentMonth)}
              </p>
              <span className="text-on-surface font-bold text-sm">{currentCycle.completionRate}%</span>
            </div>
            <div className="h-2 rounded-full bg-surface-container-high overflow-hidden">
              <div
                className="h-full rounded-full primary-gradient transition-all"
                style={{ width: `${currentCycle.completionRate}%` }}
              />
            </div>
            <div className="flex items-center justify-between mt-2 text-xs text-on-surface-variant">
              <span>{currentCycle.tasksCompleted} feitas</span>
              <span>{currentCycle.tasksMissed} perdidas</span>
            </div>
          </div>
        )}

        {/* Monthly bar chart */}
        {!loadingCycles && chartData.length > 0 && (
          <div>
            <h3 className="text-on-surface-variant text-xs font-headline font-bold uppercase tracking-wider mb-3">
              Histórico mensal (pontos)
            </h3>
            <div className="bg-surface-container-lowest rounded-DEFAULT shadow-cloud p-4">
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 4 }}>
                  <XAxis
                    dataKey="name"
                    tick={{ fill: '#4e5c71', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: '#6a788d', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(70,71,211,0.05)' }} />
                  <Bar dataKey="Ganhos" radius={[4, 4, 0, 0] as [number, number, number, number]}>
                    {chartData.map((_, i) => (
                      <Cell
                        key={i}
                        fill={i === chartData.length - 1 ? '#4647d3' : '#006a2d'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <p className="text-on-surface-variant text-xs text-center mt-1">Mês atual em índigo</p>
            </div>
          </div>
        )}

        {/* Family ranking */}
        <div>
          <h3 className="text-on-surface-variant text-xs font-headline font-bold uppercase tracking-wider mb-3">
            Ranking familiar — {getMonthName(currentMonth)}
          </h3>
          {loadingRanking ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 rounded-full border-4 border-primary border-t-transparent animate-spin" />
            </div>
          ) : (
            <div className="space-y-2">
              {ranking.map((r, i) => {
                const isMe = r.member.uid === member?.uid;
                return (
                  <div
                    key={r.member.uid}
                    className={[
                      'rounded-DEFAULT p-4',
                      isMe
                        ? 'primary-gradient shadow-primary-glow'
                        : 'bg-surface-container-lowest shadow-cloud',
                    ].join(' ')}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`text-base font-headline font-bold w-6 text-center ${isMe ? 'text-on-primary/60' : 'text-on-surface-variant'}`}>
                        {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}
                      </span>
                      <Avatar value={r.member.avatar} size="sm" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className={`text-sm font-semibold truncate ${isMe ? 'text-on-primary' : 'text-on-surface'}`}>
                            {r.member.displayName}
                          </p>
                          {isMe && <span className={`text-xs ${isMe ? 'text-on-primary/70' : 'text-primary'}`}>(você)</span>}
                        </div>
                        {r.hasCycle && (
                          <p className={`text-xs ${isMe ? 'text-on-primary/60' : 'text-on-surface-variant'}`}>
                            {r.completionRate}% conclusão
                          </p>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className={`font-headline font-bold text-sm ${isMe ? 'text-on-primary' : 'text-tertiary-dim'}`}>
                          {r.points.toLocaleString('pt-BR')}
                        </p>
                        <p className={`text-xs ${isMe ? 'text-on-primary/60' : 'text-on-surface-variant'}`}>pts</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </AppLayout>
  );
};

export default PerformancePage;
