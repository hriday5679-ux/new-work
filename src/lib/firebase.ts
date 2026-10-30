import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase app singleton
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);
// CRITICAL per Firebase integration guidelines: pass firestoreDatabaseId if configured
export const db = getFirestore(
  app,
  (firebaseConfig as any).firestoreDatabaseId || undefined
);
export const storage = getStorage(
  app,
  (firebaseConfig as any).storageBucket ? `gs://${(firebaseConfig as any).storageBucket}` : undefined
);

// Connection test per SKILL.md
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('[Firebase] Database offline or checking connectivity.');
    }
  }
}
testConnection().catch(() => {});

export default app;
