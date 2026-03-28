import React from 'react';
import TopBar from './TopBar';
import BottomNav from './BottomNav';

interface AppLayoutProps {
  children: React.ReactNode;
  title?: string;
  showBack?: boolean;
  rightAction?: React.ReactNode;
  hideNav?: boolean;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  title,
  showBack,
  rightAction,
  hideNav = false,
}) => {
  return (
    <div className="min-h-screen min-h-dvh flex flex-col">
      <TopBar title={title} showBack={showBack} rightAction={rightAction} />
      <main className="flex-1 page-container animate-fade-up">
        {children}
      </main>
      {!hideNav && <BottomNav />}
    </div>
  );
};

export default AppLayout;
