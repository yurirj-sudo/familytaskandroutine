import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useCurrentFamily, useIsAdmin, useViewAsRole, useSetViewAsRole } from '../../store/authStore';
import { usePendingApprovalsCount } from '../../hooks/useCompletions';
import { usePendingRedemptionsCount } from '../../hooks/usePrizes';

interface NavItem {
  to: string;
  label: string;
  icon: string;
}

const memberNavItems: NavItem[] = [
  { to: '/home', label: 'Início', icon: 'home' },
  { to: '/points', label: 'Pontos', icon: 'stars' },
  { to: '/prizes', label: 'Prêmios', icon: 'card_giftcard' },
  { to: '/performance', label: 'Desempenho', icon: 'insights' },
  { to: '/profile', label: 'Perfil', icon: 'person' },
];

const adminNavItems: NavItem[] = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { to: '/admin/approvals', label: 'Aprovar', icon: 'task_alt' },
  { to: '/admin/tasks', label: 'Tarefas', icon: 'checklist' },
  { to: '/admin/prizes', label: 'Prêmios', icon: 'card_giftcard' },
  { to: '/admin/members', label: 'Membros', icon: 'group' },
];

export const BottomNav: React.FC = () => {
  const isAdmin = useIsAdmin();
  const family = useCurrentFamily();
  const viewAsRole = useViewAsRole();
  const setViewAsRole = useSetViewAsRole();
  const navigate = useNavigate();
  // Effective role for navigation: admins can switch view
  const effectiveRole = isAdmin ? viewAsRole : 'member';

  const pendingCount = usePendingApprovalsCount(isAdmin ? family?.id : undefined);
  const pendingRedemptionsCount = usePendingRedemptionsCount(
    isAdmin && effectiveRole === 'admin' ? family?.id : undefined
  );
  const navItems = effectiveRole === 'admin' ? adminNavItems : memberNavItems;

  const handleToggleView = () => {
    if (effectiveRole === 'admin') {
      setViewAsRole('member');
      navigate('/home');
    } else {
      setViewAsRole('admin');
      navigate('/admin/dashboard');
    }
  };

  return (
    <nav
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full z-50 safe-bottom"
      style={{ maxWidth: 430 }}
      aria-label="Navegação principal"
    >
      {/* Admin view-switch pill — visible only to admins */}
      {isAdmin && (
        <div className="flex justify-center pb-1">
          <button
            onClick={handleToggleView}
            className={`flex items-center gap-1.5 text-[10px] font-headline font-bold uppercase tracking-wider rounded-full px-3 py-1 shadow-cloud transition-all ${
              effectiveRole === 'member'
                ? 'bg-primary text-on-primary'
                : 'bg-surface-container-lowest text-on-surface-variant border border-outline-variant/20'
            }`}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '0.875rem' }}>
              {effectiveRole === 'member' ? 'admin_panel_settings' : 'supervised_user_circle'}
            </span>
            {effectiveRole === 'member' ? 'Voltar ao Admin' : 'Ver como membro'}
          </button>
        </div>
      )}

      <div
        className="w-full"
        style={{
          background: 'var(--tw-glass-bg)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderTop: '1px solid var(--tw-glass-border)',
          borderRadius: '2.5rem 2.5rem 0 0',
          boxShadow: '0 -10px 30px rgba(33, 47, 66, 0.08)',
        }}
      >
        <div className="flex items-stretch justify-around h-20 px-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              id={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
              className={({ isActive }) =>
                [
                  'flex flex-col items-center justify-center flex-1 gap-0.5 mx-1 my-2',
                  'text-[10px] font-headline font-bold uppercase tracking-wider',
                  'transition-all duration-200 rounded-2xl',
                  'focus:outline-none focus:ring-2 focus:ring-primary/50',
                  isActive
                    ? 'bg-surface-container-lowest text-primary shadow-cloud scale-105'
                    : 'text-on-surface-variant hover:text-primary',
                ].join(' ')
              }
            >
              {({ isActive }) => (
                <>
                  <span className="relative">
                    <span
                      className={[
                        'material-symbols-outlined transition-all duration-200 block',
                        isActive ? 'scale-110 material-symbols-filled' : 'scale-100',
                      ].join(' ')}
                      style={{ fontSize: '1.5rem' }}
                    >
                      {item.icon}
                    </span>
                    {item.to === '/admin/approvals' && pendingCount > 0 && (
                      <span className="absolute -top-1 -right-2 bg-error text-on-error text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-0.5">
                        {pendingCount > 9 ? '9+' : pendingCount}
                      </span>
                    )}
                    {item.to === '/admin/prizes' && pendingRedemptionsCount > 0 && (
                      <span className="absolute -top-1 -right-2 bg-error text-on-error text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-0.5">
                        {pendingRedemptionsCount > 9 ? '9+' : pendingRedemptionsCount}
                      </span>
                    )}
                  </span>
                  <span>{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  );
};

export default BottomNav;
