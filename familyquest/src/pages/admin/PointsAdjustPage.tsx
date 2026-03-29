import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import AppLayout from '../../components/layout/AppLayout';
import { useCurrentFamily } from '../../store/authStore';
import { adjustMemberPoints } from '../../services/family.service';
import { Member } from '../../types';

const PointsAdjustPage: React.FC = () => {
  const { uid } = useParams<{ uid: string }>();
  const navigate = useNavigate();
  const family = useCurrentFamily();

  const [member, setMember] = useState<Member | null>(null);
  const [delta, setDelta] = useState<string>('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!family?.id || !uid) return;
    const unsub = onSnapshot(
      doc(db, 'families', family.id, 'members', uid),
      (snap) => { if (snap.exists()) setMember(snap.data() as Member); }
    );
    return () => unsub();
  }, [family?.id, uid]);

  const handleApply = async () => {
    if (!family?.id || !uid || !delta) return;
    const pts = parseInt(delta, 10);
    if (isNaN(pts) || pts === 0) {
      setError('Informe um valor diferente de zero.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await adjustMemberPoints(family.id, uid, pts);
      setSuccess(true);
      setDelta('');
      setReason('');
      setTimeout(() => setSuccess(false), 2500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao ajustar pontos');
    } finally {
      setLoading(false);
    }
  };

  const pts = parseInt(delta, 10);
  const isPositive = !isNaN(pts) && pts > 0;
  const isNegative = !isNaN(pts) && pts < 0;

  return (
    <AppLayout title="Ajuste de Pontos" showBack>
      <div className="mt-4 pb-8 space-y-5">
        {/* Member info */}
        {member && (
          <div className="bg-surface-container-lowest rounded-DEFAULT shadow-cloud p-4 flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-3xl">
              {member.avatar}
            </div>
            <div>
              <p className="font-headline font-bold text-on-surface">{member.displayName}</p>
              <p className="text-on-surface-variant text-sm">
                Saldo atual:{' '}
                <span className="font-bold text-primary">{member.totalPoints} pts</span>
              </p>
              <p className="text-on-surface-variant text-xs">
                Total histórico: {member.lifetimePoints} pts
              </p>
            </div>
          </div>
        )}

        {/* Delta input */}
        <div className="bg-surface-container-lowest rounded-DEFAULT shadow-cloud p-5 space-y-4">
          <div>
            <label className="block text-sm font-headline font-bold text-on-surface-variant mb-2 ml-1">
              Pontos a ajustar
            </label>
            <div className="relative">
              <input
                type="number"
                value={delta}
                onChange={(e) => setDelta(e.target.value)}
                placeholder="Ex: 50 ou -20"
                className={`w-full bg-surface-container-low border-none rounded-full px-4 py-3 text-on-surface text-base font-bold text-center focus:outline-none focus:ring-2 transition-all ${
                  isPositive ? 'focus:ring-secondary ring-2 ring-secondary/50' :
                  isNegative ? 'focus:ring-error ring-2 ring-error/50' :
                  'focus:ring-primary'
                }`}
              />
            </div>
            {/* Preview */}
            {member && !isNaN(pts) && pts !== 0 && (
              <div className={`mt-2 text-center text-sm font-bold ${isPositive ? 'text-secondary' : 'text-error'}`}>
                {isPositive ? '+' : ''}{pts} pts →{' '}
                novo saldo: {Math.max(0, member.totalPoints + pts)} pts
              </div>
            )}
          </div>

          {/* Quick presets */}
          <div>
            <p className="text-xs text-on-surface-variant mb-2 ml-1">Atalhos</p>
            <div className="grid grid-cols-4 gap-2">
              {[10, 25, 50, 100].map((v) => (
                <button
                  key={v}
                  onClick={() => setDelta(String(v))}
                  className="py-2 rounded-full bg-secondary/10 text-secondary text-xs font-bold hover:bg-secondary/20 transition-colors"
                >
                  +{v}
                </button>
              ))}
              {[-10, -25, -50, -100].map((v) => (
                <button
                  key={v}
                  onClick={() => setDelta(String(v))}
                  className="py-2 rounded-full bg-error/10 text-error text-xs font-bold hover:bg-error/20 transition-colors"
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-headline font-bold text-on-surface-variant mb-2 ml-1">
              Motivo (opcional)
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex: Bom comportamento, tarefa extra..."
              className="w-full bg-surface-container-low border-none rounded-full px-4 py-3 text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Error / Success */}
          {error && (
            <p className="text-error text-sm text-center">{error}</p>
          )}
          {success && (
            <div className="flex items-center justify-center gap-2 text-secondary text-sm font-bold">
              <span className="material-symbols-outlined text-secondary" style={{ fontSize: 18 }}>check_circle</span>
              Pontos ajustados com sucesso!
            </div>
          )}

          {/* Apply */}
          <button
            onClick={handleApply}
            disabled={loading || !delta || isNaN(parseInt(delta)) || parseInt(delta) === 0}
            className={`w-full py-3 rounded-full font-headline font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 ${
              isNegative
                ? 'bg-error text-on-error'
                : 'primary-gradient text-on-primary shadow-primary-glow'
            }`}
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                {isNegative ? 'remove_circle' : 'add_circle'}
              </span>
            )}
            {isNegative ? 'Descontar pontos' : 'Adicionar pontos'}
          </button>
        </div>
      </div>
    </AppLayout>
  );
};

export default PointsAdjustPage;
