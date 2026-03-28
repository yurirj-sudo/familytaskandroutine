import { getMessaging, getToken, isSupported } from 'firebase/messaging';
import { doc, updateDoc } from 'firebase/firestore';
import app, { db } from '../firebase';

// ─── Initialize FCM and save token to Firestore ───────────────────────────────

/**
 * Requests push notification permission and saves the FCM token to the
 * member's Firestore document so Cloud Functions can send targeted pushes.
 *
 * Returns the token string, or null if not supported / permission denied.
 */
export const initFCM = async (
  familyId: string,
  userId: string
): Promise<string | null> => {
  try {
    const supported = await isSupported();
    if (!supported) return null;

    // iOS Safari requires the app to be installed as PWA (Add to Home Screen)
    // before push is allowed. isSupported() returns true on iOS 16.4+.
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return null;

    const messaging = getMessaging(app);
    const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;

    const token = await getToken(messaging, { vapidKey });
    if (!token) return null;

    // Persist token so Cloud Functions can address this device
    const memberRef = doc(db, 'families', familyId, 'members', userId);
    await updateDoc(memberRef, { fcmToken: token });

    return token;
  } catch (err) {
    // Silently ignore — FCM is enhancement, not critical path
    console.warn('[FCM] init failed:', err);
    return null;
  }
};

// ─── Check current notification permission state ─────────────────────────────

export const getNotificationPermission = (): NotificationPermission | 'unsupported' => {
  if (typeof Notification === 'undefined') return 'unsupported';
  return Notification.permission;
};

// ─── Detect iOS PWA context ───────────────────────────────────────────────────

export const isIOS = (): boolean => {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
};

export const isInstalledPWA = (): boolean => {
  return window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
};
