import React, { useState } from 'react';
import AppLayout from '../../components/layout/AppLayout';
import { useCurrentFamily } from '../../store/authStore';
import { useFamilyStore } from '../../store/familyStore';
import { updateFamilySettings } from '../../services/family.service';
import { FamilySettings } from '../../types';

interface ToggleRowProps {
  label: string;
  description: string;
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}

const ToggleRow: React.FC<ToggleRowProps> = ({ label, description, value, onChange, disabled }) => (
  <div className="flex items-start justify-between gap-4 py-4 border-b border-outline-variant/20 last:border-0">
    <div className="flex-1">
      <p className="text-on-surface font-medium text-sm">{label}</p>
      <p className="text-on-surface-variant text-xs mt-0.5 leading-snug">{description}</p>
    </div>
    <button
      role="switch"
      aria-checked={value}
      disabled={disabled}
      onClick={() => onChange(!value)}
      className={[
        'relative flex-shrink-0 w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none',
        value ? 'bg-primary' : 'bg-outline-variant/40',
        disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer',
      ].join(' ')}
    >
      <span
        className={[
          'absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-surface-container-lowest shadow transition-transform duration-200',
          value ? 'translate-x-5' : 'translate-x-0',
        ].join(' ')}
      />
    </button>
  </div>
);

const SettingsPage: React.FC = () => {
  const family = useCurrentFamily();
  const setFamily = useFamilyStore((s) => s.setFamily);

  const settings = family?.settings;
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!family || !settings) {
    return (
      <AppLayout title="Configurações">
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        </div>
      </AppLayout>
    );
  }

  const toggle = async (key: keyof FamilySettings, value: boolean | string) => {
    setSaving(key);
    setError(null);
    try {
      await updateFamilySettings(family.id, { [key]: value });
      setFamily({ ...family, settings: { ...settings, [key]: value } });
    } catch {
      setError('Erro ao salvar. Tente novamente.');
    } finally {
      setSaving(null);
    }
  };

  return (
    <AppLayout title="Configurações">
      <div className="space-y-5 mt-2">

        {error && (
          <div className="bg-error-container/15 border border-error/20 rounded-DEFAULT px-4 py-3">
            <p className="text-error text-sm text-center">⚠️ {error}</p>
          </div>
        )}

        {/* Invite code */}
        <div className="bg-surface-container-lowest rounded-DEFAULT shadow-cloud p-5">
          <p className="text-on-surface-variant text-xs font-headline font-bold uppercase tracking-wider mb-3">Código de Convite</p>
          <div className="flex items-center justify-between">
            <p className="text-tertiary-dim font-mono font-headline font-extrabold text-2xl tracking-widest">{family.inviteCode}</p>
            <button
              className="text-primary font-headline font-bold text-sm"
              onClick={() => navigator.clipboard.writeText(family.inviteCode)}
            >
              Copiar
            </button>
          </div>
          <p className="text-on-surface-variant text-xs mt-2">Compartilhe este código para convidar membros da família.</p>
        </div>

        {/* Task approval settings */}
        <div className="bg-surface-container-lowest rounded-DEFAULT shadow-cloud p-5">
          <p className="text-on-surface-variant text-xs font-headline font-bold uppercase tracking-wider mb-1">Tarefas e Aprovação</p>
          <ToggleRow
            label="Exigir aprovação do admin"
            description="Filhos submetem a tarefa e você precisa aprovar antes dos pontos serem creditados."
            value={settings.requireTaskApproval}
            onChange={(v) => toggle('requireTaskApproval', v)}
            disabled={saving === 'requireTaskApproval'}
          />
          <ToggleRow
            label="Exigir foto-prova"
            description="Filhos precisam tirar uma foto para comprovar a conclusão da tarefa."
            value={settings.requirePhotoProof}
            onChange={(v) => toggle('requirePhotoProof', v)}
            disabled={saving === 'requirePhotoProof'}
          />
        </div>

        {/* Points mode */}
        <div className="bg-surface-container-lowest rounded-DEFAULT shadow-cloud p-5">
          <p className="text-on-surface-variant text-xs font-headline font-bold uppercase tracking-wider mb-3">Ciclo de Pontos</p>
          <div className="grid grid-cols-2 gap-2">
            {(['monthly_reset', 'accumulate'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => toggle('pointsMode', mode)}
                disabled={saving === 'pointsMode'}
                className={[
                  'rounded-DEFAULT border-2 px-3 py-3 text-left transition-colors',
                  settings.pointsMode === mode
                    ? 'border-primary bg-primary/5'
                    : 'border-transparent bg-surface-container-low hover:border-outline-variant/40',
                ].join(' ')}
              >
                <p className={`font-headline font-bold text-sm ${settings.pointsMode === mode ? 'text-primary' : 'text-on-surface-variant'}`}>
                  {mode === 'monthly_reset' ? '🔄 Reset Mensal' : '📈 Acumulativo'}
                </p>
                <p className="text-on-surface-variant text-xs mt-0.5">
                  {mode === 'monthly_reset'
                    ? 'Pontos zerados todo mês. Histórico salvo.'
                    : 'Pontos nunca zerados. Só diminuem ao resgatar.'}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Family info */}
        <div className="bg-surface-container-lowest rounded-DEFAULT shadow-cloud p-5">
          <p className="text-on-surface-variant text-xs font-headline font-bold uppercase tracking-wider mb-3">Família</p>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-on-surface-variant text-sm">Nome</span>
              <span className="text-on-surface text-sm font-medium">{family.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-on-surface-variant text-sm">Fuso horário</span>
              <span className="text-on-surface text-sm font-medium">{settings.timezone}</span>
            </div>
          </div>
        </div>

      </div>
    </AppLayout>
  );
};

export default SettingsPage;
