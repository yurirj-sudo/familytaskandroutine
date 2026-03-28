import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

/**
 * Protege rotas que requerem autenticação.
 * Se não autenticado → redireciona para /login.
 * Se carregando → exibe spinner.
 */
export const ProtectedRoute: React.FC = () => {
  const { firebaseUser, loading } = useAuthStore();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-primary-500 border-t-transparent animate-spin" />
          <p className="text-white/60 text-sm">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!firebaseUser) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
