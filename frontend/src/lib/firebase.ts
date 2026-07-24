import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const useEmulator = import.meta.env.VITE_FIREBASE_USE_EMULATOR === 'true';

function assertFirebaseConfig() {
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    throw new Error(
      'Firebase is not configured. Copy frontend/.env.example to frontend/.env and set VITE_FIREBASE_* variables.',
    );
  }
}

assertFirebaseConfig();

export const firebaseApp = initializeApp(firebaseConfig);
export const firebaseAuth = getAuth(firebaseApp);

if (useEmulator) {
  const host =
    import.meta.env.VITE_FIREBASE_AUTH_EMULATOR_HOST?.replace(/^https?:\/\//, '') ?? '127.0.0.1:9099';
  connectAuthEmulator(firebaseAuth, `http://${host}`, { disableWarnings: true });
}
