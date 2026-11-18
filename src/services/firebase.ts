import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { doc, getDocFromServer, getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const storage = getStorage(app);
export const firebaseProjectId = firebaseConfig.projectId;

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
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid ?? null,
      email: auth.currentUser?.email ?? null,
      emailVerified: auth.currentUser?.emailVerified ?? null,
      isAnonymous: auth.currentUser?.isAnonymous ?? null,
      tenantId: auth.currentUser?.tenantId ?? null,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
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
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes('the client is offline')) {
      return {
        ok: false,
        latencyMs,
        message: 'العميل غير متصل بالإنترنت: يرجى التحقق من إعدادات Firebase.',
      };
    }
    // Even if doc doesn't exist yet, reaching server means connection works
    if (msg.includes('permission-denied')) {
      return {
        ok: false,
        latencyMs,
        message: 'تم رفض الوصول إلى Firestore بسبب قواعد الأمان.',
      };
    }
    return {
      ok: true,
      latencyMs,
      message: `خادم Firestore متصل (${latencyMs} ms).`,
    };
  }
}
