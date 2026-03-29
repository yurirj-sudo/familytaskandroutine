import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { joinFamily } from '../../services/auth.service';
import { getFamilyByInviteCode } from '../../services/family.service';
import { Family } from '../../types';

const schema = z.object({
  inviteCode: z.string().length(6, 'O código deve ter 6 caracteres'),
  displayName: z.string().min(2, 'Seu nome deve ter ao menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter ao menos 6 caracteres'),
});

type FormData = z.infer<typeof schema>;

const CHILD_EMOJIS = ['👦', '👧', '🧒', '👶', '🐱', '🐶', '🦊', '🐼', '🦁', '🐯', '🦄', '🐸'];

const inputClass = (hasError: boolean) => [
  'w-full bg-surface-container-low border-none rounded-full px-6 py-4',
  'text-on-surface placeholder:text-outline text-sm',
  'focus:outline-none focus:ring-2 focus:ring-primary focus:bg-surface-container-highest transition-all duration-200',
  hasError ? 'ring-2 ring-error' : '',
].join(' ');

const JoinFamilyPage: React.FC = () => {
  const navigate = useNavigate();
  const { inviteCode: paramCode } = useParams<{ inviteCode?: string }>();
  const [error, setError] = useState<string | null>(null);
  const [family, setFamily] = useState<Family | null>(null);
  const [lookingUp, setLookingUp] = useState(false);
  // Preview lookup may fail with permission error when user isn't authenticated yet.
  // Only show "not found" if the lookup succeeded but returned empty (not a permission error).
  const [previewChecked, setPreviewChecked] = useState(false);
  const [selectedEmoji, setSelectedEmoji] = useState('👦');

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { inviteCode: paramCode || '' },
  });

  const inviteCode = watch('inviteCode');

  useEffect(() => {
    const code = inviteCode?.toUpperCase().trim();
    if (code?.length === 6) {
      setLookingUp(true);
      setFamily(null);
      setPreviewChecked(false);
      getFamilyByInviteCode(code)
        .then((f) => {
          setFamily(f);
          setPreviewChecked(true); // lookup succeeded (even if null = not found)
        })
        .catch(() => {
          // Permission error (unauthenticated) — don't show "not found"
          setFamily(null);
          setPreviewChecked(false);
        })
        .finally(() => setLookingUp(false));
    } else {
      setFamily(null);
      setPreviewChecked(false);
    }
  }, [inviteCode]);

  useEffect(() => {
    if (paramCode) setValue('inviteCode', paramCode.toUpperCase());
  }, [paramCode, setValue]);

  const onSubmit = async (data: FormData) => {
    try {
      setError(null);
      await joinFamily({
        email: data.email,
        password: data.password,
        displayName: data.displayName,
        inviteCode: data.inviteCode.toUpperCase(),
        avatar: selectedEmoji,
      });
      navigate('/home', { replace: true });
    } catch (err: any) {
      const msg =
        err.message === 'Código de convite inválido. Verifique e tente novamente.'
          ? err.message
          : err.code === 'auth/email-already-in-use'
          ? 'Este email já está em uso.'
          : 'Erro ao entrar na família. Tente novamente.';
      setError(msg);
    }
  };

  return (
    <div className="min-h-screen min-h-dvh bg-surface flex flex-col items-center justify-start px-6 py-10">
      {/* Background */}
      <div className="fixed top-[15%] -left-12 w-24 h-24 bg-tertiary-container/20 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="fixed bottom-[20%] -right-12 w-32 h-32 bg-primary-container/20 rounded-full blur-3xl pointer-events-none -z-10" />

      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8 animate-fade-up">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-tertiary-container rounded-xl shadow-glow-gold mb-3 text-3xl">
            🎟️
          </div>
          <h1 className="font-headline font-extrabold text-3xl text-on-surface tracking-tight">Entrar na Família</h1>
          <p className="text-on-surface-variant text-base mt-1">Use o código de convite compartilhado</p>
        </div>

        <form
          id="join-family-form"
          onSubmit={handleSubmit(onSubmit)}
          className="bg-surface-container-lowest rounded-DEFAULT p-8 shadow-cloud-lg space-y-6 animate-fade-up"
          noValidate
        >
          {/* Invite Code */}
          <div className="space-y-2">
            <label htmlFor="join-invite-code" className="block text-sm font-headline font-bold text-on-surface-variant mb-2 ml-1 uppercase tracking-wide">
              Código de convite <span className="text-outline normal-case">(6 caracteres)</span>
            </label>
            <input
              id="join-invite-code"
              type="text"
              autoFocus={!paramCode}
              maxLength={6}
              placeholder="Ex: ABC123"
              className={[
                'w-full bg-surface-container-low border-none rounded-full px-6 py-4',
                'text-on-surface placeholder:text-outline text-base font-mono tracking-widest uppercase text-center',
                'focus:outline-none focus:ring-2 focus:ring-primary focus:bg-surface-container-highest transition-all duration-200',
                errors.inviteCode ? 'ring-2 ring-error' : '',
              ].join(' ')}
              {...register('inviteCode', {
                onChange: (e) => (e.target.value = e.target.value.toUpperCase()),
              })}
            />
            {errors.inviteCode && <p className="text-error text-xs px-2">{errors.inviteCode.message}</p>}

            {lookingUp && (
              <p className="text-on-surface-variant text-xs flex items-center gap-1 px-2">
                <span className="animate-spin">⏳</span> Buscando família...
              </p>
            )}
            {family && !lookingUp && (
              <div className="flex items-center gap-2 bg-secondary-container/20 border border-secondary/20 rounded-DEFAULT px-4 py-3">
                <span className="text-secondary text-sm">✅</span>
                <p className="text-secondary text-sm font-headline font-bold">{family.name}</p>
              </div>
            )}
            {!family && !lookingUp && previewChecked && inviteCode?.length === 6 && (
              <div className="flex items-center gap-2 bg-error-container/15 border border-error/20 rounded-DEFAULT px-4 py-3">
                <span className="text-error text-sm">❌</span>
                <p className="text-error text-sm font-medium">Código não encontrado</p>
              </div>
            )}
          </div>

          {/* Emoji picker */}
          <div className="space-y-2">
            <label className="block text-sm font-headline font-bold text-on-surface-variant mb-2 ml-1 uppercase tracking-wide">
              Seu avatar
            </label>
            <div className="flex gap-2 flex-wrap">
              {CHILD_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  aria-label={`Avatar ${emoji}`}
                  onClick={() => setSelectedEmoji(emoji)}
                  className={[
                    'w-10 h-10 rounded-xl text-xl transition-all duration-200',
                    selectedEmoji === emoji
                      ? 'bg-tertiary-container border-2 border-tertiary scale-110'
                      : 'bg-surface-container-low hover:bg-surface-container',
                  ].join(' ')}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Display Name */}
          <div>
            <label htmlFor="join-display-name" className="block text-sm font-headline font-bold text-on-surface-variant mb-2 ml-1 uppercase tracking-wide">
              Seu nome
            </label>
            <input
              id="join-display-name"
              type="text"
              placeholder="Ex: João"
              className={inputClass(!!errors.displayName)}
              {...register('displayName')}
            />
            {errors.displayName && <p className="text-error text-xs mt-1 ml-2">{errors.displayName.message}</p>}
          </div>

          {/* Email */}
          <div>
            <label htmlFor="join-email" className="block text-sm font-headline font-bold text-on-surface-variant mb-2 ml-1 uppercase tracking-wide">
              E-mail
            </label>
            <input
              id="join-email"
              type="email"
              autoComplete="email"
              placeholder="seu@email.com"
              className={inputClass(!!errors.email)}
              {...register('email')}
            />
            {errors.email && <p className="text-error text-xs mt-1 ml-2">{errors.email.message}</p>}
          </div>

          {/* Password */}
          <div>
            <label htmlFor="join-password" className="block text-sm font-headline font-bold text-on-surface-variant mb-2 ml-1 uppercase tracking-wide">
              Senha
            </label>
            <input
              id="join-password"
              type="password"
              autoComplete="new-password"
              placeholder="Mínimo 6 caracteres"
              className={inputClass(!!errors.password)}
              {...register('password')}
            />
            {errors.password && <p className="text-error text-xs mt-1 ml-2">{errors.password.message}</p>}
          </div>

          {/* Error */}
          {error && (
            <div className="bg-error-container/15 border border-error/20 rounded-DEFAULT px-4 py-3">
              <p className="text-error text-sm">⚠️ {error}</p>
            </div>
          )}

          {/* Submit */}
          <button
            id="join-submit-btn"
            type="submit"
            disabled={isSubmitting}
            className={[
              'w-full py-4 rounded-full font-headline font-extrabold text-lg flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-60',
              family
                ? 'primary-gradient text-on-primary shadow-primary-glow'
                : 'bg-surface-container-high text-on-surface-variant',
            ].join(' ')}
          >
            {isSubmitting ? (
              <span className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <>🎟️ Entrar na Família</>
            )}
          </button>
        </form>

        <div className="mt-6 text-center animate-fade-up">
          <p className="text-on-surface-variant text-sm">
            <Link id="join-login-link" to="/login" className="text-primary font-bold hover:underline">
              Já tenho conta
            </Link>
            {' · '}
            <Link id="join-register-link" to="/register" className="text-primary font-bold hover:underline">
              Criar família
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default JoinFamilyPage;
