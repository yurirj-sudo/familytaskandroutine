import React, { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import RoleRoute from './RoleRoute';

// ─── Loading Fallback ─────────────────────────────────────────────────────────

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="flex flex-col items-center gap-4">
      <div className="w-10 h-10 rounded-full border-4 border-primary-500 border-t-transparent animate-spin" />
      <p className="text-white/50 text-sm">Carregando...</p>
    </div>
  </div>
);

// ─── Lazy Pages ───────────────────────────────────────────────────────────────

// Auth
const LoginPage = lazy(() => import('../pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('../pages/auth/RegisterPage'));
const JoinFamilyPage = lazy(() => import('../pages/auth/JoinFamilyPage'));

// Member
const HomePage = lazy(() => import('../pages/member/HomePage'));
const PointsPage = lazy(() => import('../pages/member/PointsPage'));
const PrizesPage = lazy(() => import('../pages/member/PrizesPage'));
const PerformancePage = lazy(() => import('../pages/member/PerformancePage'));
const ProfilePage = lazy(() => import('../pages/member/ProfilePage'));

// Admin
const DashboardPage = lazy(() => import('../pages/admin/DashboardPage'));
const ApprovalsPage = lazy(() => import('../pages/admin/ApprovalsPage'));
const TaskFormPage = lazy(() => import("../pages/admin/TaskFormPage"));
const TasksPage = lazy(() => import('../pages/admin/TasksPage'));
const PrizesAdminPage = lazy(() => import('../pages/admin/PrizesAdminPage'));
const MembersPage = lazy(() => import('../pages/admin/MembersPage'));
const PointsAdjustPage = lazy(() => import('../pages/admin/PointsAdjustPage'));
const SettingsPage = lazy(() => import('../pages/admin/SettingsPage'));

// ─── Router ───────────────────────────────────────────────────────────────────

const wrap = (element: React.ReactNode) => (
  <Suspense fallback={<PageLoader />}>{element}</Suspense>
);

export const router = createBrowserRouter([
  // ── Redirecionamento raiz ──────────────────────────────────────────────────
  {
    path: '/',
    element: <Navigate to="/home" replace />,
  },

  // ── Rotas públicas ─────────────────────────────────────────────────────────
  { path: '/login', element: wrap(<LoginPage />) },
  { path: '/register', element: wrap(<RegisterPage />) },
  { path: '/join', element: wrap(<JoinFamilyPage />) },
  { path: '/join/:inviteCode', element: wrap(<JoinFamilyPage />) },

  // ── Rotas protegidas (requer auth) ──────────────────────────────────────────
  {
    element: <ProtectedRoute />,
    children: [
      // Perfil (todos os roles)
      { path: '/profile', element: wrap(<ProfilePage />) },

      // ── Member routes ────────────────────────────────────────────────────
      { path: '/home', element: wrap(<HomePage />) },
      { path: '/points', element: wrap(<PointsPage />) },
      { path: '/prizes', element: wrap(<PrizesPage />) },
      { path: '/performance', element: wrap(<PerformancePage />) },

      // ── Admin routes ──────────────────────────────────────────────────────
      {
        path: '/admin',
        element: <RoleRoute allowedRoles={['admin']} redirectTo="/home" />,
        children: [
          { index: true, element: <Navigate to="/admin/dashboard" replace /> },
          { path: 'dashboard', element: wrap(<DashboardPage />) },
          { path: 'approvals', element: wrap(<ApprovalsPage />) },
          { path: 'tasks', element: wrap(<TasksPage />) },
          { path: 'tasks/new', element: wrap(<TaskFormPage />) },
          { path: 'tasks/:taskId/edit', element: wrap(<TaskFormPage />) },
          { path: 'prizes', element: wrap(<PrizesAdminPage />) },
          { path: 'members', element: wrap(<MembersPage />) },
          { path: 'members/:uid/points', element: wrap(<PointsAdjustPage />) },
          { path: 'settings', element: wrap(<SettingsPage />) },
        ],
      },
    ],
  },

  // ── 404 ───────────────────────────────────────────────────────────────────
  {
    path: '*',
    element: (
      <div className="min-h-screen flex items-center justify-center flex-col gap-4">
        <span className="text-6xl">🗺️</span>
        <h1 className="text-2xl font-bold text-white">Página não encontrada</h1>
        <a href="/" className="text-primary-400 underline">Voltar ao início</a>
      </div>
    ),
  },
]);

export default router;
