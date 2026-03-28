import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { loginWithEmail } from '../../services/auth.service';

const schema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
});

type FormData = z.infer<typeof schema>;

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    try {
      setError(null);
      await loginWithEmail(data.email, data.password);
      navigate('/home', { replace: true });
    } catch (err: any) {
      const msg = err.code === 'auth/invalid-credential'
        ? 'Email ou senha incorretos.'
        : err.code === 'auth/user-not-found'
        ? 'Usuário não encontrado.'
        : 'Erro ao entrar. Tente novamente.';
      setError(msg);
    }
  };

  return (
    <div className="min-h-screen min-h-dvh bg-surface flex flex-col items-center justify-center p-4">
      {/* Background decoratives */}
      <div className="fixed top-[-10%] right-[-10%] w-80 h-80 bg-primary/5 rounded-full blur-3xl -z-10 pointer-events-none" />
      <div className="fixed bottom-[-5%] left-[-5%] w-64 h-64 bg-tertiary-container/10 rounded-full blur-3xl -z-10 pointer-events-none" />

      <main className="w-full max-w-md space-y-6 animate-fade-up">
        {/* Logo */}
        <div className="flex flex-col items-center text-center gap-2">
          <div className="w-20 h-20 primary-gradient rounded-xl flex items-center justify-center shadow-primary-glow mb-2">
            <span className="material-symbols-outlined text-on-primary" style={{ fontSize: '3rem' }}>emoji_events</span>
          </div>
          <h1 className="font-headline font-extrabold text-4xl text-primary tracking-tight">FamilyQuest</h1>
          <p className="text-on-surface-variant font-medium text-base mt-1">Prepare-se para a aventura!</p>
        </div>

        {/* Illustration banner */}
        <div className="relative overflow-hidden rounded-DEFAULT bg-surface-container-low h-40 flex items-center justify-center shadow-cloud">
          <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 to-tertiary-container/15" />
          <div className="relative flex flex-col items-center gap-2">
            <span className="text-5xl">👨‍👩‍👧‍👦</span>
          </div>
          <div className="absolute bottom-3 left-4 right-4 bg-surface-container-lowest/90 backdrop-blur-md px-4 py-2 rounded-full flex items-center gap-2">
            <span className="material-symbols-outlined text-tertiary material-symbols-filled" style={{ fontSize: '1.1rem' }}>stars</span>
            <span className="text-xs font-headline font-bold uppercase tracking-wider text-on-surface-variant">
              Novas missões diárias disponíveis!
            </span>
          </div>
        </div>

        {/* Login Form Card */}
        <div className="bg-surface-container-lowest rounded-DEFAULT p-8 shadow-cloud-lg">
          <form
            id="login-form"
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-6"
            noValidate
          >
            {/* Email */}
            <div className="space-y-2">
              <label className="block text-sm font-headline font-bold text-on-surface-variant px-2 uppercase tracking-wide" htmlFor="login-email">
                E-mail
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline" style={{ fontSize: '1.25rem' }}>mail</span>
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  autoFocus
                  placeholder="seu@email.com"
                  className={[
                    'w-full pl-12 pr-5 py-4 bg-surface-container-low border-none rounded-full',
                    'text-on-surface placeholder:text-outline text-sm',
                    'focus:outline-none focus:ring-2 focus:ring-primary focus:bg-surface-container-highest transition-all duration-200',
                    errors.email ? 'ring-2 ring-error' : '',
                  ].join(' ')}
                  {...register('email')}
                />
              </div>
              {errors.email && <p className="text-error text-xs px-2">{errors.email.message}</p>}
            </div>

            {/* Password */}
            <div className="space-y-2">
              <div className="flex justify-between items-center px-2">
                <label className="block text-sm font-headline font-bold text-on-surface-variant uppercase tracking-wide" htmlFor="login-password">
                  Senha
                </label>
                <a className="text-xs font-headline font-bold text-primary hover:text-primary-dim transition-colors" href="#">
                  Esqueceu a senha?
                </a>
              </div>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline" style={{ fontSize: '1.25rem' }}>lock</span>
                <input
                  id="login-password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className={[
                    'w-full pl-12 pr-5 py-4 bg-surface-container-low border-none rounded-full',
                    'text-on-surface placeholder:text-outline text-sm',
                    'focus:outline-none focus:ring-2 focus:ring-primary focus:bg-surface-container-highest transition-all duration-200',
                    errors.password ? 'ring-2 ring-error' : '',
                  ].join(' ')}
                  {...register('password')}
                />
              </div>
              {errors.password && <p className="text-error text-xs px-2">{errors.password.message}</p>}
            </div>

            {/* Error */}
            {error && (
              <div className="bg-error-container/15 border border-error/20 rounded-DEFAULT px-4 py-3">
                <p className="text-error text-sm">⚠️ {error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              id="login-submit-btn"
              type="submit"
              disabled={isSubmitting}
              className="w-full primary-gradient text-on-primary font-headline font-extrabold py-4 rounded-full shadow-primary-glow active:scale-95 transition-all duration-200 flex items-center justify-center gap-2 text-lg disabled:opacity-60"
            >
              {isSubmitting ? (
                <span className="w-5 h-5 border-2 border-on-primary border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  Entrar
                  <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>rocket_launch</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Secondary actions */}
        <div className="text-center space-y-4">
          <p className="text-on-surface-variant font-medium">Ainda não tem uma família?</p>
          <div className="flex flex-col gap-3 items-center">
            <Link
              id="login-register-link"
              to="/register"
              className="inline-flex items-center gap-2 px-8 py-3 bg-surface-container-high text-primary font-headline font-extrabold rounded-full hover:bg-surface-container-highest transition-all"
            >
              Criar Família
              <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>group_add</span>
            </Link>
            <Link
              id="login-join-link"
              to="/join"
              className="text-sm text-on-surface-variant hover:text-primary transition-colors font-medium"
            >
              Tenho um código de convite →
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
};

export default LoginPage;
