import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCurrentMember, useCurrentFamily } from '../../store/authStore';
import Avatar from '../ui/Avatar';
import PointsBadge from '../ui/PointsBadge';

interface TopBarProps {
  title?: string;
  showBack?: boolean;
  rightAction?: React.ReactNode;
}

export const TopBar: React.FC<TopBarProps> = ({
  title,
  showBack = false,
  rightAction,
}) => {
  const navigate = useNavigate();
  const member = useCurrentMember();
  const family = useCurrentFamily();

  return (
    <header className="sticky top-0 z-40 safe-top">
      <div className="glass shadow-cloud">
        <div className="flex items-center justify-between h-16 px-5">
          {/* Left */}
          <div className="flex items-center gap-3">
            {showBack ? (
              <button
                id="topbar-back-btn"
                onClick={() => navigate(-1)}
                className="p-1.5 rounded-full text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low transition-colors"
                aria-label="Voltar"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>arrow_back</span>
              </button>
            ) : (
              member && (
                <div className="relative">
                  <Avatar
                    value={member.avatar}
                    size="sm"
                    name={member.displayName}
                    ring
                  />
                  {/* Online indicator dot */}
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-secondary-fixed-dim rounded-full border-2 border-white" />
                </div>
              )
            )}

            <div>
              {title ? (
                <h1 className="font-headline font-bold text-on-surface text-base leading-tight">{title}</h1>
              ) : (
                <>
                  <p className="text-xs text-on-surface-variant leading-none font-medium">
                    {family?.name || 'FamilyQuest'}
                  </p>
                  <p className="text-sm font-headline font-bold text-primary leading-tight italic">
                    FamilyQuest
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Right */}
          <div className="flex items-center gap-2">
            {rightAction || (
              <>
                {member && <PointsBadge points={member.totalPoints} size="sm" />}
                <button
                  className="w-9 h-9 flex items-center justify-center rounded-full bg-surface-container-low text-on-surface-variant hover:text-primary hover:bg-surface-container transition-all duration-200"
                  aria-label="Notificações"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>notifications</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default TopBar;
