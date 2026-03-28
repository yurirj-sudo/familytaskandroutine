import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { registerAdmin } from '../../services/auth.service';

const schema = z.object({
  familyName: z.string().min(2, 'Nome da família deve ter ao menos 2 caracteres'),
  displayName: z.string().min(2, 'Seu nome deve ter ao menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter ao menos 6 caracteres'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'As senhas não coincidem',
  path: ['confirmPassword'],
});

type FormData = z.infer<typeof schema>;

const FAMILY_EMOJIS = ['👨‍👩‍👧‍👦', '👨‍👩‍👧', '👨‍👩‍👦', '👪', '🏠', '⭐', '🌟', '🎯', '🚀', '💡'];

const inputClass = (hasError: boolean) => [
  'w-full bg-surface-container-low border-none rounded-full px-6 py-4',
  'text-on-surface placeholder:text-outline text-sm',
  'focus:outline-none focus:ring-2 focus:ring-primary focus:bg-surface-container-highest transition-all duration-200',
  hasError ? 'ring-2 ring-error' : '',
].join(' ');

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [selectedEmoji, setSelectedEmoji] = useState('👨‍👩‍👧‍👦');
  const [pointsMode, setPointsMode] = useState<'monthly_reset' | 'accumulate'>('monthly_reset');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    try {
      setError(null);
      await registerAdmin({
        email: data.email,
        password: data.password,
        displayName: data.displayName,
        familyName: data.familyName,
        avatar: selectedEmoji,
      });
      navigate('/admin/dashboard', { replace: true });
    } catch (err: any) {
      console.error('[Register] erro:', err);
      const code = err?.code ?? '';
      const msg =
        code === 'auth/email-already-in-use' ? 'Este email já está em uso.' :
        code === 'permission-denied' ? 'Permissão negada pelo Firestore. Verifique as Security Rules.' :
        err?.message
          ? `${err.message} (${code || 'sem código'})`
          : 'Erro ao cadastrar. Tente novamente.';
      setError(msg);
    }
  };

  return (
    <div className="min-h-screen min-h-dvh bg-surface flex flex-col">
      {/* Background decoratives */}
      <div className="fixed top-[15%] -left-12 w-24 h-24 bg-tertiary-container/20 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="fixed bottom-[20%] -right-12 w-32 h-32 bg-primary-container/20 rounded-full blur-3xl pointer-events-none -z-10" />

      <div className="max-w-md mx-auto w-full min-h-screen flex flex-col px-6 pb-12">
        {/* Header */}
        <header className="pt-12 pb-8 flex flex-col items-center">
          <div className="w-16 h-16 primary-gradient rounded-xl flex items-center justify-center mb-6 shadow-primary-glow">
            <span className="text-4xl">🏰</span>
          </div>
          <h1 className="font-headline font-extrabold text-3xl text-on-surface tracking-tight text-center">
            Comece sua Jornada Familiar
          </h1>
          <p className="text-on-surface-variant text-center mt-2 font-medium">
            Transforme tarefas em aventuras épicas.
          </p>
        </header>

        {/* Progress bar */}
        <div className="mb-10">
          <div className="flex justify-between items-center mb-2 px-1">
            <span className="text-xs font-headline font-bold uppercase tracking-widest text-primary">Passo 1 de 2</span>
            <span className="text-xs font-headline font-bold text-on-surface-variant">Configurando Perfil</span>
          </div>
          <div className="h-2 w-full bg-surface-container rounded-full overflow-hidden">
            <div className="h-full w-1/2 primary-gradient rounded-full transition-all duration-700" />
          </div>
        </div>

        <form
          id="register-form"
          onSubmit={handleSubmit(onSubmit)}
          className="flex-grow space-y-8"
          noValidate
        >
          {/* Identity section */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-primary text-xl">🛡️</span>
              <h2 className="font-headline font-bold text-lg text-on-surface">Dados da Guilda</h2>
            </div>

            {/* Emoji picker */}
            <div className="space-y-2">
              <label className="block text-sm font-headline font-bold text-on-surface-variant mb-2 ml-1">
                Avatar da família
              </label>
              <div className="flex gap-2 flex-wrap">
                {FAMILY_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    aria-label={`Selecionar emoji ${emoji}`}
                    onClick={() => setSelectedEmoji(emoji)}
                    className={[
                      'w-10 h-10 rounded-xl text-xl transition-all duration-200',
                      selectedEmoji === emoji
                        ? 'bg-primary text-on-primary scale-110 shadow-primary-glow'
                        : 'bg-surface-container-low hover:bg-surface-container text-on-surface',
                    ].join(' ')}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="register-family-name" className="block text-sm font-headline font-bold text-on-surface-variant mb-2 ml-1">
                  Nome da Família
                </label>
                <input
                  id="register-family-name"
                  type="text"
                  placeholder="Ex: Família Silva"
                  className={inputClass(!!errors.familyName)}
                  {...register('familyName')}
                />
                {errors.familyName && <p className="text-error text-xs mt-1 ml-2">{errors.familyName.message}</p>}
              </div>

              <div>
                <label htmlFor="register-display-name" className="block text-sm font-headline font-bold text-on-surface-variant mb-2 ml-1">
                  Seu nome (responsável)
                </label>
                <input
                  id="register-display-name"
                  type="text"
                  placeholder="Ex: Maria"
                  autoFocus
                  className={inputClass(!!errors.displayName)}
                  {...register('displayName')}
                />
                {errors.displayName && <p className="text-error text-xs mt-1 ml-2">{errors.displayName.message}</p>}
              </div>

              <div>
                <label htmlFor="register-email" className="block text-sm font-headline font-bold text-on-surface-variant mb-2 ml-1">
                  E-mail do Admin
                </label>
                <input
                  id="register-email"
                  type="email"
                  autoComplete="email"
                  placeholder="pai@exemplo.com"
                  className={inputClass(!!errors.email)}
                  {...register('email')}
                />
                {errors.email && <p className="text-error text-xs mt-1 ml-2">{errors.email.message}</p>}
              </div>

              <div>
                <label htmlFor="register-password" className="block text-sm font-headline font-bold text-on-surface-variant mb-2 ml-1">
                  Senha Mestra
                </label>
                <input
                  id="register-password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Mínimo 6 caracteres"
                  className={inputClass(!!errors.password)}
                  {...register('password')}
                />
                {errors.password && <p className="text-error text-xs mt-1 ml-2">{errors.password.message}</p>}
              </div>

              <div>
                <label htmlFor="register-confirm-password" className="block text-sm font-headline font-bold text-on-surface-variant mb-2 ml-1">
                  Confirmar senha
                </label>
                <input
                  id="register-confirm-password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Repita a senha"
                  className={inputClass(!!errors.confirmPassword)}
                  {...register('confirmPassword')}
                />
                {errors.confirmPassword && <p className="text-error text-xs mt-1 ml-2">{errors.confirmPassword.message}</p>}
              </div>
            </div>
          </section>

          {/* Points mode section */}
          <section className="bg-surface-container-low p-6 rounded-DEFAULT space-y-4 relative overflow-hidden">
            <div className="flex items-center gap-2">
              <span className="text-tertiary text-xl">⚙️</span>
              <h2 className="font-headline font-bold text-lg text-on-surface">Modo de Pontos</h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPointsMode('monthly_reset')}
                className={[
                  'relative flex flex-col items-center justify-center p-4 bg-surface-container-lowest rounded-DEFAULT border-2 transition-all duration-200',
                  pointsMode === 'monthly_reset' ? 'border-primary' : 'border-transparent hover:border-outline-variant',
                ].join(' ')}
              >
                {pointsMode === 'monthly_reset' && (
                  <span className="absolute top-2 right-2 text-primary text-sm">✅</span>
                )}
                <span className="text-3xl mb-2">🔄</span>
                <span className="font-headline font-bold text-sm text-on-surface">Reset Mensal</span>
                <span className="text-[10px] text-on-surface-variant text-center mt-1">Competição fresca todo mês</span>
              </button>
              <button
                type="button"
                onClick={() => setPointsMode('accumulate')}
                className={[
                  'flex flex-col items-center justify-center p-4 bg-surface-container-lowest/50 rounded-DEFAULT border-2 transition-all duration-200',
                  pointsMode === 'accumulate' ? 'border-primary' : 'border-transparent hover:border-outline-variant',
                ].join(' ')}
              >
                {pointsMode === 'accumulate' && (
                  <span className="absolute top-2 right-2 text-primary text-sm">✅</span>
                )}
                <span className="text-3xl mb-2">📈</span>
                <span className="font-headline font-bold text-sm text-on-surface">Acumulativo</span>
                <span className="text-[10px] text-on-surface-variant text-center mt-1">Níveis infinitos e história</span>
              </button>
            </div>
          </section>

          {/* Error */}
          {error && (
            <div className="bg-error-container/15 border border-error/20 rounded-DEFAULT px-4 py-3">
              <p className="text-error text-sm">⚠️ {error}</p>
            </div>
          )}

          {/* Submit */}
          <footer className="mt-4">
            <button
              id="register-submit-btn"
              type="submit"
              disabled={isSubmitting}
              className="w-full primary-gradient py-5 rounded-full shadow-primary-glow flex items-center justify-center gap-3 active:scale-[0.98] transition-all disabled:opacity-60"
            >
              {isSubmitting ? (
                <span className="w-5 h-5 border-2 border-on-primary border-t-transparent rounded-full animate-spin" />
              ) : (
                <span className="font-headline font-extrabold text-on-primary text-lg tracking-wide">
                  Criar Nossa Guilda 🏰
                </span>
              )}
            </button>
            <p className="text-center text-on-surface-variant text-sm mt-6 font-medium">
              Já tem uma família?{' '}
              <Link id="register-login-link" to="/login" className="text-primary font-bold hover:underline">
                Entrar
              </Link>
              {' · '}
              <Link id="register-join-link" to="/join" className="text-primary font-bold hover:underline">
                Usar código de convite
              </Link>
            </p>
          </footer>
        </form>
      </div>
    </div>
  );
};

export default RegisterPage;
