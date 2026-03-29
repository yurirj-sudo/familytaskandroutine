import React from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
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

  const setGender = async (gender: 'male' | 'female') => {
    if (!family || !member) return;
    await updateDoc(doc(db, 'families', family.id, 'members', member.uid), { gender });
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

        {/* Gender / Theme selection */}
        <div className="bg-surface-container-lowest rounded-DEFAULT shadow-cloud p-5">
          <p className="text-on-surface-variant text-xs font-headline font-bold uppercase tracking-wider mb-3">Tema do aplicativo</p>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setGender('male')}
              className={[
                'flex flex-col items-center gap-2 p-4 rounded-DEFAULT border-2 transition-all',
                member?.gender === 'male'
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-outline-variant text-on-surface-variant hover:border-primary/40',
              ].join(' ')}
            >
              <span className="text-2xl">♂</span>
              <span className="text-sm font-semibold">Masculino</span>
              <span className="text-xs opacity-70">Tema azul</span>
            </button>
            <button
              onClick={() => setGender('female')}
              className={[
                'flex flex-col items-center gap-2 p-4 rounded-DEFAULT border-2 transition-all',
                member?.gender === 'female'
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-outline-variant text-on-surface-variant hover:border-primary/40',
              ].join(' ')}
            >
              <span className="text-2xl">♀</span>
              <span className="text-sm font-semibold">Feminino</span>
              <span className="text-xs opacity-70">Tema rosa</span>
            </button>
          </div>
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
