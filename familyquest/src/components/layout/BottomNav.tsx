import React from 'react';
import { NavLink } from 'react-router-dom';
import { useCurrentFamily, useIsAdmin } from '../../store/authStore';
import { usePendingApprovalsCount } from '../../hooks/useCompletions';

interface NavItem {
  to: string;
  label: string;
  icon: string;
  adminOnly?: boolean;
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
  { to: '/admin/members', label: 'Membros', icon: 'group' },
  { to: '/profile', label: 'Perfil', icon: 'person' },
];

export const BottomNav: React.FC = () => {
  const isAdmin = useIsAdmin();
  const family = useCurrentFamily();
  const pendingCount = usePendingApprovalsCount(isAdmin ? family?.id : undefined);
  const navItems = isAdmin ? adminNavItems : memberNavItems;

  return (
    <nav
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full z-50 safe-bottom"
      style={{ maxWidth: 430 }}
      aria-label="Navegação principal"
    >
      <div
        className="w-full"
        style={{
          background: 'rgba(244, 246, 255, 0.80)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderTop: '1px solid rgba(160, 174, 197, 0.15)',
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
