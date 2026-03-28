import React, { useState, useEffect } from 'react';
import {
  getNotificationPermission,
  initFCM,
  isIOS,
  isInstalledPWA,
} from '../../services/fcm.service';
import { useCurrentFamily, useCurrentMember } from '../../store/authStore';

// ─── iOS Install Guide ─────────────────────────────────────────────────────────

const IOSInstallGuide: React.FC<{ onDismiss: () => void }> = ({ onDismiss }) => (
  <div className="bg-primary/5 border border-primary/20 rounded-DEFAULT p-4 mx-0">
    <div className="flex items-start gap-3">
      <span className="text-2xl flex-shrink-0">📲</span>
      <div className="flex-1 min-w-0">
        <p className="text-on-surface font-headline font-bold text-sm">Instale o app para receber notificações</p>
        <p className="text-on-surface-variant text-xs mt-1 leading-relaxed">
          No Safari, toque em{' '}
          <span className="text-primary font-medium">Compartilhar</span>
          {' '}e depois{' '}
          <span className="text-primary font-medium">Adicionar à Tela Inicial</span>
        </p>
        <div className="flex items-center gap-2 mt-3 text-on-surface-variant text-xs">
          <span>Compartilhar</span>
          <span className="text-lg leading-none">⬆️</span>
          <span>→</span>
          <span>Adicionar à Tela Inicial</span>
          <span className="text-lg leading-none">➕</span>
        </div>
      </div>
      <button
        onClick={onDismiss}
        className="text-on-surface-variant hover:text-on-surface flex-shrink-0 p-1"
        aria-label="Fechar"
      >
        ✕
      </button>
    </div>
  </div>
);

// ─── Push Permission Request ───────────────────────────────────────────────────

const PushRequestBanner: React.FC<{
  onEnable: () => void;
  onDismiss: () => void;
  loading: boolean;
}> = ({ onEnable, onDismiss, loading }) => (
  <div className="bg-primary/5 border border-primary/20 rounded-DEFAULT p-4">
    <div className="flex items-start gap-3">
      <span className="text-2xl flex-shrink-0">🔔</span>
      <div className="flex-1 min-w-0">
        <p className="text-on-surface font-headline font-bold text-sm">Ativar notificações</p>
        <p className="text-on-surface-variant text-xs mt-1">
          Receba lembretes de tarefas e atualizações de pontos em tempo real.
        </p>
        <div className="flex gap-2 mt-3">
          <button
            onClick={onEnable}
            disabled={loading}
            className="flex-1 primary-gradient disabled:opacity-50 text-on-primary rounded-full py-2 text-xs font-headline font-bold transition-colors flex items-center justify-center gap-1.5"
          >
            {loading && (
              <span className="w-3 h-3 border-2 border-on-primary border-t-transparent rounded-full animate-spin" />
            )}
            Ativar
          </button>
          <button
            onClick={onDismiss}
            className="px-3 bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant rounded-full py-2 text-xs transition-colors"
          >
            Agora não
          </button>
        </div>
      </div>
    </div>
  </div>
);

// ─── Main component ────────────────────────────────────────────────────────────

export const PushPermissionBanner: React.FC = () => {
  const family = useCurrentFamily();
  const member = useCurrentMember();

  const [dismissed, setDismissed] = useState(() =>
    localStorage.getItem('push_banner_dismissed') === 'true'
  );
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [loading, setLoading] = useState(false);

  const ios = isIOS();
  const installed = isInstalledPWA();

  useEffect(() => {
    setPermission(getNotificationPermission());
  }, []);

  if (dismissed) return null;
  if (permission === 'granted' || permission === 'unsupported') return null;
  if (!family?.id || !member?.uid) return null;

  const dismiss = () => {
    setDismissed(true);
    localStorage.setItem('push_banner_dismissed', 'true');
  };

  // iOS + not installed as PWA: show install guide
  if (ios && !installed) {
    return (
      <div className="mb-4">
        <IOSInstallGuide onDismiss={dismiss} />
      </div>
    );
  }

  // permission === 'denied': nothing we can do from code
  if (permission === 'denied') return null;

  const handleEnable = async () => {
    setLoading(true);
    const token = await initFCM(family.id, member.uid);
    if (token) {
      setPermission('granted');
    } else {
      setPermission(getNotificationPermission());
    }
    setLoading(false);
    if (!token) dismiss();
  };

  return (
    <div className="mb-4">
      <PushRequestBanner onEnable={handleEnable} onDismiss={dismiss} loading={loading} />
    </div>
  );
};

export default PushPermissionBanner;
