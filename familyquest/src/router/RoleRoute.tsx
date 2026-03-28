import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import type { MemberRole } from '../types';

interface RoleRouteProps {
  allowedRoles: MemberRole[];
  redirectTo?: string;
}

/**
 * Protege rotas por role.
 * Ex: <RoleRoute allowedRoles={['admin']} /> → apenas admins acessam.
 */
export const RoleRoute: React.FC<RoleRouteProps> = ({
  allowedRoles,
  redirectTo = '/home',
}) => {
  const { member, loading } = useAuthStore();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-primary-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!member || !allowedRoles.includes(member.role)) {
    return <Navigate to={redirectTo} replace />;
  }

  return <Outlet />;
};

export default RoleRoute;
