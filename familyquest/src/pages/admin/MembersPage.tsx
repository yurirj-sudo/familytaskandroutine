import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../../components/layout/AppLayout';
import { useCurrentFamily, useCurrentMember } from '../../store/authStore';
import {
  subscribeFamilyMembers,
  updateMemberRole,
  deactivateMember,
} from '../../services/family.service';
import { Member } from '../../types';

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  member: 'Membro',
  viewer: 'Visitante',
};

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-primary/10 text-primary',
  member: 'bg-secondary/10 text-secondary',
  viewer: 'bg-surface-container text-on-surface-variant',
};

const MembersPage: React.FC = () => {
  const navigate = useNavigate();
  const family = useCurrentFamily();
  const currentMember = useCurrentMember();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [actionUid, setActionUid] = useState<string | null>(null);

  useEffect(() => {
    if (!family?.id) return;
    const unsub = subscribeFamilyMembers(
      family.id,
      (list) => {
        // Sort: admins first, then members, then viewers; active before inactive
        const sorted = [...list].sort((a, b) => {
          if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
          const roleOrder: Record<string, number> = { admin: 0, member: 1, viewer: 2 };
          return (roleOrder[a.role] ?? 3) - (roleOrder[b.role] ?? 3);
        });
        setMembers(sorted);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [family?.id]);

  const copyInviteCode = async () => {
    if (!family?.inviteCode) return;
    await navigator.clipboard.writeText(family.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRoleChange = async (member: Member, newRole: Member['role']) => {
    if (!family?.id || actionUid) return;
    setActionUid(member.uid);
    try {
      await updateMemberRole(family.id, member.uid, newRole);
    } finally {
      setActionUid(null);
    }
  };

  const handleDeactivate = async (member: Member) => {
    if (!family?.id || actionUid) return;
    const confirmed = window.confirm(
      `Remover ${member.displayName} da família? Ele não poderá mais acessar o app.`
    );
    if (!confirmed) return;
    setActionUid(member.uid);
    try {
      await deactivateMember(family.id, member.uid);
    } finally {
      setActionUid(null);
    }
  };

  const activeMembers = members.filter((m) => m.isActive);
  const inactiveMembers = members.filter((m) => !m.isActive);

  return (
    <AppLayout title="Membros" showBack>
      <div className="space-y-5 mt-2 pb-8">

        {/* ── Invite Code Card ── */}
        <div className="bg-primary/5 border border-primary/20 rounded-DEFAULT p-4">
          <p className="text-xs text-on-surface-variant font-medium mb-1">
            Código de convite da família
          </p>
          <div className="flex items-center gap-3">
            <span className="font-mono font-extrabold text-2xl tracking-widest text-primary flex-1">
              {family?.inviteCode ?? '------'}
            </span>
            <button
              onClick={copyInviteCode}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium transition-colors ${
                copied
                  ? 'bg-secondary text-on-secondary'
                  : 'bg-primary text-on-primary'
              }`}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                {copied ? 'check' : 'content_copy'}
              </span>
              {copied ? 'Copiado!' : 'Copiar'}
            </button>
          </div>
          <p className="text-[11px] text-on-surface-variant mt-2">
            Compartilhe este código para convidar novos membros.
          </p>
        </div>

        {/* ── Loading ── */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          </div>
        )}

        {/* ── Active Members ── */}
        {!loading && activeMembers.length > 0 && (
          <section>
            <h3 className="text-xs font-headline font-bold uppercase tracking-wider text-on-surface-variant mb-3">
              Membros ativos ({activeMembers.length})
            </h3>
            <div className="space-y-3">
              {activeMembers.map((m) => (
                <MemberCard
                  key={m.uid}
                  member={m}
                  isSelf={m.uid === currentMember?.uid}
                  isLoading={actionUid === m.uid}
                  onRoleChange={handleRoleChange}
                  onAdjustPoints={() => navigate(`/admin/members/${m.uid}/points`)}
                  onDeactivate={handleDeactivate}
                  roleLabels={ROLE_LABELS}
                  roleColors={ROLE_COLORS}
                />
              ))}
            </div>
          </section>
        )}

        {/* ── Inactive Members ── */}
        {!loading && inactiveMembers.length > 0 && (
          <section>
            <h3 className="text-xs font-headline font-bold uppercase tracking-wider text-on-surface-variant mb-3">
              Inativos ({inactiveMembers.length})
            </h3>
            <div className="space-y-3 opacity-60">
              {inactiveMembers.map((m) => (
                <div
                  key={m.uid}
                  className="bg-surface-container-lowest rounded-DEFAULT p-4 flex items-center gap-3"
                >
                  <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-xl flex-shrink-0">
                    {m.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-headline font-bold text-sm text-on-surface-variant line-through">
                      {m.displayName}
                    </p>
                    <p className="text-xs text-on-surface-variant">Removido</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </AppLayout>
  );
};

// ─── MemberCard sub-component ─────────────────────────────────────────────

interface MemberCardProps {
  member: Member;
  isSelf: boolean;
  isLoading: boolean;
  onRoleChange: (m: Member, role: Member['role']) => void;
  onAdjustPoints: () => void;
  onDeactivate: (m: Member) => void;
  roleLabels: Record<string, string>;
  roleColors: Record<string, string>;
}

const MemberCard: React.FC<MemberCardProps> = ({
  member,
  isSelf,
  isLoading,
  onRoleChange,
  onAdjustPoints,
  onDeactivate,
  roleLabels,
  roleColors,
}) => {
  return (
    <div className="bg-surface-container-lowest rounded-DEFAULT shadow-cloud p-4">
      {/* Top row: avatar + info + points */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-2xl flex-shrink-0">
          {member.avatar}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-headline font-bold text-sm text-on-surface truncate">
              {member.displayName}
            </p>
            {isSelf && (
              <span className="text-[10px] bg-surface-container text-on-surface-variant rounded-full px-2 py-0.5 flex-shrink-0">
                Você
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={`text-[10px] font-bold rounded-full px-2 py-0.5 ${roleColors[member.role] ?? ''}`}>
              {roleLabels[member.role] ?? member.role}
            </span>
            <span className="text-[10px] text-on-surface-variant flex items-center gap-0.5">
              <span className="material-symbols-outlined" style={{ fontSize: 11 }}>local_fire_department</span>
              {member.currentStreak} dias
            </span>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="font-headline font-extrabold text-lg text-primary leading-none">
            {member.totalPoints}
          </p>
          <p className="text-[10px] text-on-surface-variant">pontos</p>
        </div>
      </div>

      {/* Actions */}
      {!isSelf && (
        <div className="flex gap-2 mt-3">
          {/* Role selector */}
          <select
            value={member.role}
            disabled={isLoading}
            onChange={(e) => onRoleChange(member, e.target.value as Member['role'])}
            className="flex-1 bg-surface-container-low text-on-surface text-xs rounded-full px-3 py-2 border-none focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
          >
            <option value="member">Membro</option>
            <option value="admin">Admin</option>
            <option value="viewer">Visitante</option>
          </select>

          {/* Adjust points */}
          <button
            onClick={onAdjustPoints}
            disabled={isLoading}
            className="flex items-center gap-1 px-3 py-2 rounded-full bg-primary/10 text-primary text-xs font-medium transition-colors hover:bg-primary/20 disabled:opacity-50"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>stars</span>
            Pontos
          </button>

          {/* Deactivate */}
          <button
            onClick={() => onDeactivate(member)}
            disabled={isLoading}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-error-container/15 text-error hover:bg-error-container/30 transition-colors disabled:opacity-50"
          >
            {isLoading ? (
              <span className="w-3.5 h-3.5 border-2 border-error border-t-transparent rounded-full animate-spin" />
            ) : (
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>person_remove</span>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default MembersPage;
