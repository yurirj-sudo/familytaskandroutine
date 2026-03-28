import React from 'react';
import AppLayout from '../../components/layout/AppLayout';
import { useCurrentMember, useCurrentFamily } from '../../store/authStore';
import Avatar from '../../components/ui/Avatar';
import Button from '../../components/ui/Button';
import { logout } from '../../services/auth.service';
import { useNavigate } from 'react-router-dom';

const ProfilePage = () => {
  const member = useCurrentMember();
  const family = useCurrentFamily();
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = React.useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <AppLayout title="Perfil">
      <div className="space-y-4 mt-4">
        <div className="primary-gradient rounded-DEFAULT p-8 text-center shadow-primary-glow">
          <Avatar
            value={member?.avatar || '👤'}
            size="xl"
            name={member?.displayName}
            ring
            className="mx-auto mb-3"
          />
          <h2 className="text-xl font-headline font-bold text-on-primary">{member?.displayName}</h2>
          <p className="text-on-primary/70 text-sm capitalize">
            {member?.role === 'admin' ? '👑 Responsável' : '⭐ Membro'}
          </p>
          {family && (
            <p className="text-on-primary/60 text-sm mt-1">{family.name}</p>
          )}
        </div>

        {family && (
          <div className="bg-surface-container-lowest rounded-DEFAULT shadow-cloud p-5">
            <p className="text-on-surface-variant text-xs mb-1">Código de convite da família</p>
            <p className="text-tertiary-dim font-mono font-headline font-extrabold text-2xl tracking-widest">{family.inviteCode}</p>
            <p className="text-on-surface-variant text-xs mt-1">Compartilhe com a família para convidar membros</p>
          </div>
        )}

        <Button
          id="profile-logout-btn"
          variant="danger"
          fullWidth
          loading={loggingOut}
          onClick={handleLogout}
        >
          Sair da conta
        </Button>
      </div>
    </AppLayout>
  );
};

export default ProfilePage;
