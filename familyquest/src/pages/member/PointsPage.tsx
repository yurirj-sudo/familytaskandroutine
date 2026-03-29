import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import AppLayout from '../../components/layout/AppLayout';
import { useCurrentFamily, useCurrentMember } from '../../store/authStore';
import { useMemberRedemptions } from '../../hooks/usePrizes';
import { useTodayCompletions } from '../../hooks/useCompletions';
import { useMemberCycles } from '../../hooks/useCycle';
import { formatPoints } from '../../utils/points';
import { getMonthName } from '../../utils/date';
import { Cycle } from '../../types';
import { useThemeColors } from '../../hooks/useThemeColors';

// ─── Tooltip ───────────────────────────────────────────────────────────────────

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
          <span className="text-on-surface-variant">{p.name}:</span>
          <span className="text-on-surface font-bold">{p.value} pts</span>
        </div>
      ))}
    </div>
  );
};

// ─── PointsPage ────────────────────────────────────────────────────────────────

const PointsPage: React.FC = () => {
  const family = useCurrentFamily();
  const member = useCurrentMember();
  const themeColors = useThemeColors();
  const { redemptions, loading: loadingRedemptions } = useMemberRedemptions(family?.id, member?.uid);
  const { completions } = useTodayCompletions(family?.id, member?.uid);
  const { cycles, loading: loadingCycles } = useMemberCycles(family?.id, member?.uid);
  const now = new Date();

  const totalPoints = member?.totalPoints ?? 0;
  const lifetimePoints = member?.lifetimePoints ?? 0;
  const currentStreak = member?.currentStreak ?? 0;
  const longestStreak = member?.longestStreak ?? 0;

  const earnedToday = completions
    .filter((c) => c.status === 'completed' || c.status === 'approved')
    .reduce((sum, c) => sum + (c.pointsAwarded ?? 0), 0);

  // Chart: last 6 cycles oldest-first
  const chartData = useMemo(() => {
    return [...cycles]
      .slice(0, 6)
      .reverse()
      .map((c: Cycle) => ({
        name: getMonthName(c.month).slice(0, 3),
        Ganhos: c.pointsEarned,
        Perdidos: Math.abs(c.pointsLost),
        month: c.month,
        year: c.year,
      }));
  }, [cycles]);

  const isCurrentMonth = (c: { month: number; year: number }) =>
    c.month === now.getMonth() + 1 && c.year === now.getFullYear();

  return (
    <AppLayout title="Pontos">
      {/* Balance card */}
      <div className="bg-surface-container-lowest rounded-DEFAULT shadow-cloud p-6 mt-2 text-center">
        <p className="text-on-surface-variant text-xs mb-1">Saldo atual</p>
        <p className="text-5xl font-headline font-black text-tertiary-dim">{totalPoints.toLocaleString('pt-BR')}</p>
        <p className="text-on-tertiary-container/60 text-sm mt-0.5">pontos</p>
        {earnedToday > 0 && (
          <p className="text-secondary text-xs mt-2 font-headline font-bold">+{earnedToday} pts hoje</p>
        )}
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-3 mt-4">
        {[
          { label: 'Total ganho', value: formatPoints(lifetimePoints), icon: '🏆' },
          { label: 'Sequência atual', value: `${currentStreak}d`, icon: '🔥' },
          { label: 'Recorde', value: `${longestStreak}d`, icon: '⭐' },
        ].map((s) => (
          <div key={s.label} className="bg-surface-container-lowest rounded-DEFAULT shadow-cloud p-3 text-center">
            <span className="text-xl">{s.icon}</span>
            <p className="text-on-surface font-headline font-bold text-sm mt-1">{s.value}</p>
            <p className="text-on-surface-variant text-xs">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Monthly chart */}
      {!loadingCycles && chartData.length > 0 && (
        <section className="mt-6">
          <h3 className="text-on-surface-variant text-xs font-headline font-bold uppercase tracking-wider mb-3">
            Histórico mensal
          </h3>
          <div className="bg-surface-container-lowest rounded-DEFAULT shadow-cloud p-4">
            <ResponsiveContainer width="100%" height={160}>
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
                <Tooltip content={<ChartTooltip />} cursor={{ fill: themeColors.primaryCursor }} />
                <Bar
                  dataKey="Ganhos"
                  radius={[4, 4, 0, 0] as [number, number, number, number]}
                >
                  {chartData.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={isCurrentMonth(entry) ? themeColors.primary : '#006a2d'}
                    />
                  ))}
                </Bar>
                <Bar
                  dataKey="Perdidos"
                  fill="#b41340"
                  radius={[4, 4, 0, 0] as [number, number, number, number]}
                />
              </BarChart>
            </ResponsiveContainer>
            <div className="flex items-center justify-center gap-5 mt-2">
              {[[themeColors.primary, 'Mês atual'], ['#006a2d', 'Ganhos'], ['#b41340', 'Perdidos']].map(([color, label]) => (
                <div key={label} className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm" style={{ background: color }} />
                  <span className="text-on-surface-variant text-xs">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Redemption history */}
      <section className="mt-6">
        <h3 className="text-on-surface-variant text-xs font-headline font-bold uppercase tracking-wider mb-3">
          Histórico de Resgates
        </h3>
        {loadingRedemptions ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          </div>
        ) : redemptions.length === 0 ? (
          <div className="bg-surface-container-lowest rounded-DEFAULT shadow-cloud text-center py-8">
            <p className="text-on-surface-variant text-sm">Nenhum resgate ainda.</p>
            <p className="text-on-surface-variant/60 text-xs mt-1">Use seus pontos para resgatar prêmios!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {redemptions.map((r) => (
              <div key={r.id} className="flex items-center gap-3 bg-surface-container-low rounded-DEFAULT px-4 py-3">
                <span className="text-2xl">{r.prizeEmoji || '🎁'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-on-surface text-sm font-medium truncate">{r.prizeTitle}</p>
                  <p className="text-on-surface-variant text-xs">
                    {r.redeemedAt?.toDate
                      ? new Intl.DateTimeFormat('pt-BR', {
                          day: '2-digit', month: '2-digit', year: '2-digit',
                        }).format(r.redeemedAt.toDate())
                      : ''}
                  </p>
                </div>
                <span className="text-error font-headline font-bold text-sm flex-shrink-0">
                  -{r.pointsCost.toLocaleString('pt-BR')} pts
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </AppLayout>
  );
};

export default PointsPage;
