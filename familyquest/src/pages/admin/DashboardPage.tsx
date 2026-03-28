import React, { useState, useMemo, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import AppLayout from '../../components/layout/AppLayout';
import Avatar from '../../components/ui/Avatar';
import PointsBadge from '../../components/ui/PointsBadge';
import { useCurrentFamily, useCurrentMember } from '../../store/authStore';
import { useFamilyMembers } from '../../store/familyStore';
import { usePendingApprovalsCount } from '../../hooks/useCompletions';
import { subscribeFamilyTodayCompletions } from '../../services/completion.service';
import { Completion, Member } from '../../types';

// ─── Chart tooltip ─────────────────────────────────────────────────────────────

interface TooltipEntry { name: string; value: number; color: string; }
const ChartTooltip: React.FC<{ active?: boolean; payload?: TooltipEntry[] }> = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface-container-lowest border border-outline-variant/20 rounded-DEFAULT p-3 text-xs space-y-1 shadow-cloud">
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-on-surface-variant">{p.name}:</span>
          <span className="text-on-surface font-bold">{p.value}</span>
        </div>
      ))}
    </div>
  );
};

// ─── Legend ────────────────────────────────────────────────────────────────────

const LEGEND: [string, string][] = [
  ['#006a2d', 'Feitas'],
  ['#745700', 'Pendentes'],
  ['#b41340', 'Perdidas'],
];

// ─── Dashboard ─────────────────────────────────────────────────────────────────

const DashboardPage: React.FC = () => {
  const family = useCurrentFamily();
  const member = useCurrentMember();
  const members = useFamilyMembers();
  const pendingCount = usePendingApprovalsCount(family?.id);
  const [copied, setCopied] = useState(false);
  const [todayCompletions, setTodayCompletions] = useState<Completion[]>([]);

  useEffect(() => {
    if (!family?.id) return;
    return subscribeFamilyTodayCompletions(family.id, (data) => setTodayCompletions(data));
  }, [family?.id]);

  const handleCopyCode = () => {
    if (family?.inviteCode) {
      navigator.clipboard.writeText(family.inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const memberStats = useMemo(() => {
    return members.map((m: Member) => {
      const mine = todayCompletions.filter((c) => c.userId === m.uid);
      const done = mine.filter((c) => c.status === 'completed' || c.status === 'approved').length;
      const missed = mine.filter((c) => c.status === 'missed').length;
      const pending = mine.filter((c) => c.status === 'pending' || c.status === 'submitted').length;
      return { member: m, done, missed, pending, total: mine.length };
    });
  }, [members, todayCompletions]);

  const totalDone = memberStats.reduce((s, x) => s + x.done, 0);
  const totalMissed = memberStats.reduce((s, x) => s + x.missed, 0);
  const totalPending = memberStats.reduce((s, x) => s + x.pending, 0);

  const chartData = memberStats
    .filter((x) => x.total > 0)
    .map((x) => ({
      name: x.member.displayName.split(' ')[0],
      Feitas: x.done,
      Perdidas: x.missed,
      Pendentes: x.pending,
    }));

  const ranking = [...members].sort((a, b) => b.totalPoints - a.totalPoints);

  return (
    <AppLayout title="Dashboard">
      <div className="space-y-5 mt-4">

        {/* Family header */}
        <div className="primary-gradient rounded-DEFAULT p-6 relative overflow-hidden shadow-primary-glow">
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
          <div className="relative">
            <p className="text-on-primary/70 text-xs mb-1">Família</p>
            <h2 className="text-xl font-headline font-bold text-on-primary">{family?.name || 'Carregando...'}</h2>
            {member && (
              <div className="mt-3 flex items-center gap-2">
                <Avatar value={member.avatar} size="sm" />
                <div>
                  <p className="text-sm font-semibold text-on-primary">{member.displayName}</p>
                  <p className="text-xs text-on-primary/70">Administrador</p>
                </div>
                <div className="ml-auto">
                  <PointsBadge points={member.totalPoints} />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Today stats */}
        <div>
          <h3 className="text-on-surface-variant text-xs font-headline font-bold uppercase tracking-wider mb-3">Hoje</h3>
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: '✅', label: 'Feitas', value: totalDone, color: 'text-secondary' },
              { icon: '⏳', label: 'Pendentes', value: totalPending, color: 'text-tertiary' },
              { icon: '❌', label: 'Perdidas', value: totalMissed, color: 'text-error' },
            ].map((stat) => (
              <div key={stat.label} className="bg-surface-container-lowest rounded-DEFAULT shadow-cloud p-4 text-center">
                <span className="text-xl">{stat.icon}</span>
                <p className={`font-headline font-bold text-lg mt-1 ${stat.color}`}>{stat.value}</p>
                <p className="text-on-surface-variant text-xs">{stat.label}</p>
              </div>
            ))}
          </div>
          {pendingCount > 0 && (
            <div className="mt-3 bg-tertiary-container/20 border border-tertiary/20 rounded-DEFAULT px-4 py-3 flex items-center gap-3">
              <span className="text-xl">📋</span>
              <p className="text-tertiary text-sm font-medium">
                {pendingCount} {pendingCount === 1 ? 'tarefa aguarda' : 'tarefas aguardam'} aprovação
              </p>
            </div>
          )}
        </div>

        {/* Completion chart */}
        {chartData.length > 0 && (
          <div>
            <h3 className="text-on-surface-variant text-xs font-headline font-bold uppercase tracking-wider mb-3">
              Conclusões por membro (hoje)
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
                  <Bar dataKey="Feitas" fill="#006a2d" radius={[4, 4, 0, 0] as [number, number, number, number]} />
                  <Bar dataKey="Pendentes" fill="#745700" radius={[4, 4, 0, 0] as [number, number, number, number]} />
                  <Bar dataKey="Perdidas" fill="#b41340" radius={[4, 4, 0, 0] as [number, number, number, number]} />
                </BarChart>
              </ResponsiveContainer>
              <div className="flex items-center justify-center gap-5 mt-2">
                {LEGEND.map(([color, label]) => (
                  <div key={label} className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm" style={{ background: color }} />
                    <span className="text-on-surface-variant text-xs">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Per-member progress */}
        {memberStats.some((x) => x.total > 0) && (
          <div>
            <h3 className="text-on-surface-variant text-xs font-headline font-bold uppercase tracking-wider mb-3">
              Progresso individual
            </h3>
            <div className="space-y-2">
              {memberStats.filter((x) => x.total > 0).map(({ member: m, done, total }) => (
                <div key={m.uid} className="bg-surface-container-lowest rounded-DEFAULT shadow-cloud p-4">
                  <div className="flex items-center gap-3">
                    <Avatar value={m.avatar} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-medium text-on-surface truncate">{m.displayName}</p>
                        <p className="text-xs text-on-surface-variant ml-2 flex-shrink-0">{done}/{total}</p>
                      </div>
                      <div className="h-1.5 rounded-full bg-surface-container-high overflow-hidden">
                        <div
                          className="h-full rounded-full bg-secondary transition-all"
                          style={{ width: total > 0 ? `${Math.round((done / total) * 100)}%` : '0%' }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Points ranking */}
        <div>
          <h3 className="text-on-surface-variant text-xs font-headline font-bold uppercase tracking-wider mb-3">Ranking de pontos</h3>
          {ranking.length === 0 ? (
            <div className="bg-surface-container-lowest rounded-DEFAULT shadow-cloud text-center py-8">
              <p className="text-3xl mb-2">👨‍👩‍👧‍👦</p>
              <p className="text-on-surface-variant text-sm">Nenhum membro ainda. Compartilhe o código abaixo!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {ranking.map((m, i) => (
                <div key={m.uid} className="bg-surface-container-lowest rounded-DEFAULT shadow-cloud p-4">
                  <div className="flex items-center gap-3">
                    <span className="text-base font-headline font-bold w-6 text-center text-on-surface-variant">
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}
                    </span>
                    <Avatar value={m.avatar} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-on-surface truncate">{m.displayName}</p>
                      <p className="text-xs text-on-surface-variant">{m.role === 'admin' ? 'Admin' : 'Membro'}</p>
                    </div>
                    <PointsBadge points={m.totalPoints} size="sm" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Invite code */}
        {family && (
          <div className="bg-surface-container-lowest rounded-DEFAULT shadow-cloud p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-on-surface-variant text-xs mb-1">Código de convite</p>
                <p className="text-tertiary-dim font-mono font-headline font-extrabold text-2xl tracking-widest">{family.inviteCode}</p>
                <p className="text-on-surface-variant text-xs mt-0.5">Compartilhe para convidar membros</p>
              </div>
              <button
                onClick={handleCopyCode}
                className="p-3 rounded-DEFAULT bg-surface-container-low hover:bg-surface-container transition-all text-2xl"
                aria-label="Copiar código"
              >
                {copied ? '✅' : '📋'}
              </button>
            </div>
          </div>
        )}

      </div>
    </AppLayout>
  );
};

export default DashboardPage;
