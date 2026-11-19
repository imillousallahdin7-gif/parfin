import { initializeApp, getApps, getApp } from 'firebase/app';
import type { Auth } from 'firebase/auth';
import type { FirebaseStorage } from 'firebase/storage';
import {
  doc,
  getDocFromServer,
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

function createFirestore(): Firestore {
  try {
    return initializeFirestore(
      app,
      {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager(),
        }),
        experimentalForceLongPolling: true,
      },
      firebaseConfig.firestoreDatabaseId
    );
  } catch {
    try {
      return initializeFirestore(
        app,
        {
          experimentalForceLongPolling: true,
        },
        firebaseConfig.firestoreDatabaseId
      );
    } catch {
      return getFirestore(app, firebaseConfig.firestoreDatabaseId);
    }
  }
}

export const db: Firestore = createFirestore();
export const firebaseProjectId = firebaseConfig.projectId;

let cachedAuth: Auth | null = null;
let cachedStorage: FirebaseStorage | null = null;

export async function getFirebaseAuth(): Promise<Auth> {
  if (cachedAuth) return cachedAuth;
  const { getAuth } = await import('firebase/auth');
  cachedAuth = getAuth(app);
  return cachedAuth;
}

export async function getFirebaseStorage(): Promise<FirebaseStorage> {
  if (cachedStorage) return cachedStorage;
  const { getStorage } = await import('firebase/storage');
  cachedStorage = getStorage(app);
  return cachedStorage;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const user = cachedAuth?.currentUser;
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: user?.uid ?? null,
      email: user?.email ?? null,
      emailVerified: user?.emailVerified ?? null,
      isAnonymous: user?.isAnonymous ?? null,
      tenantId: user?.tenantId ?? null,
      providerInfo:
        user?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function testConnection(): Promise<{ ok: boolean; latencyMs: number; message: string }> {
  const start = performance.now();
  try {
    await getDocFromServer(doc(db, 'settings', 'general'));
    const latencyMs = Math.round(performance.now() - start);
    return {
      ok: true,
      latencyMs,
      message: `الاتصال بقاعدة البيانات نشط (${latencyMs} ms).`,
    };
  } catch (error) {
    const latencyMs = Math.round(performance.now() - start);
    const code = (error as { code?: string })?.code || '';
    const msg = error instanceof Error ? error.message : String(error);
    const lower = msg.toLowerCase();
    if (
      code === 'unavailable' ||
      lower.includes('the client is offline') ||
      lower.includes('unavailable') ||
      lower.includes('could not reach') ||
      lower.includes('failed to get document')
    ) {
      return {
        ok: false,
        latencyMs,
        message: 'تعذر الوصول إلى خادم Firestore: يرجى التحقق من الاتصال أو إعدادات Firebase.',
      };
    }
    if (code === 'permission-denied' || lower.includes('permission-denied') || lower.includes('insufficient permissions')) {
      return {
        ok: false,
        latencyMs,
        message: 'تم رفض الوصول إلى Firestore بسبب قواعد الأمان.',
      };
    }
    return {
      ok: false,
      latencyMs,
      message: `تعذر التحقق من اتصال Firestore (${msg}).`,
    };
  }
}

void testConnection().catch(() => {});
