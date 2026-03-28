import React, { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, collection } from 'firebase/firestore';
import { auth, db } from './firebase';
import { useAuthStore } from './store/authStore';
import { useFamilyStore } from './store/familyStore';
import { router } from './router';
import { initFCM } from './services/fcm.service';
import type { AppUser, Member, Family } from './types';

const App: React.FC = () => {
  const {
    setFirebaseUser,
    setMember,
    setFamily,
    setLoading,
    setInitialized,
    reset,
  } = useAuthStore();
  const { setMembers } = useFamilyStore();

  useEffect(() => {
    let unsubMember: (() => void) | null = null;
    let unsubFamily: (() => void) | null = null;
    let unsubMembers: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      // Limpa subscriptions anteriores
      unsubMember?.();
      unsubFamily?.();
      unsubMembers?.();

      if (!firebaseUser) {
        reset();
        setFirebaseUser(null);
        setLoading(false);
        return;
      }

      setFirebaseUser(firebaseUser);
      setLoading(true);

      // Wait for user doc to exist (onAuthStateChanged fires before registerAdmin
      // finishes writing the /users/{uid} doc, so we must wait for it).
      const userSnap = await new Promise<any>((resolve) => {
        const unsub = onSnapshot(doc(db, 'users', firebaseUser.uid), (snap) => {
          if (snap.exists()) {
            resolve(snap);
            unsub();
          }
          // If doc doesn't exist yet, keep the listener open until it appears.
        });
      });


      const userData = userSnap.data() as AppUser;
      const familyId = userData.familyId;

      // Both member AND family must load before we clear the loading state.
      // Without this, RoleRoute sees loading:false but member:null → redirects admin to /home.
      let memberReady = false;
      let familyReady = false;
      const trySetReady = () => {
        if (memberReady && familyReady) {
          setLoading(false);
          setInitialized(true);
        }
      };

      // Realtime listener: membro
      unsubMember = onSnapshot(
        doc(db, 'families', familyId, 'members', firebaseUser.uid),
        (snap) => {
          if (snap.exists()) {
            setMember(snap.data() as Member);
            memberReady = true;
            trySetReady();
          }
        }
      );

      // Realtime listener: família
      unsubFamily = onSnapshot(doc(db, 'families', familyId), (snap) => {
        if (snap.exists()) {
          setFamily({ id: snap.id, ...snap.data() } as Family);
          familyReady = true;
          trySetReady();
        }
      });

      // Realtime listener: todos os membros da família
      unsubMembers = onSnapshot(
        collection(db, 'families', familyId, 'members'),
        (snap) => {
          setMembers(snap.docs.map((d) => d.data() as Member));
        }
      );

      // Initialize FCM in background — non-blocking
      // Only attempts if permission already granted (silent re-register)
      // or deferred to PushPermissionBanner for first-time prompt
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        initFCM(familyId, firebaseUser.uid).catch(() => {/* silent */});
      }
    });

    return () => {
      unsubAuth();
      unsubMember?.();
      unsubFamily?.();
      unsubMembers?.();
    };
  }, []);

  return <RouterProvider router={router} />;
};

export default App;
