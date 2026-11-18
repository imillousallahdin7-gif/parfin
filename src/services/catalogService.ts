import {
  CatalogSnapshot,
  DEFAULT_STORE_SETTINGS,
  Pack,
  Product,
  StoreSettings,
} from '../types/catalog';

const CACHE_KEY = 'parfumerie_elkhalifi_catalog_cache_v1';
const FRESH_TTL_MS = 10 * 60 * 1000; // 10 minutes
const STALE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

interface CacheEnvelope {
  timestamp: number;
  version: string;
  products: Product[];
  packs: Pack[];
  settings: StoreSettings;
}

let inFlightFetch: Promise<CatalogSnapshot> | null = null;

function isValidSnapshot(data: unknown): data is CatalogSnapshot {
  if (!data || typeof data !== 'object') return false;
  const obj = data as Record<string, unknown>;
  return (
    Array.isArray(obj.products) &&
    Array.isArray(obj.packs) &&
    Boolean(obj.settings && typeof obj.settings === 'object')
  );
}

function readCache(): CacheEnvelope | null {
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEnvelope;
    if (
      !parsed ||
      typeof parsed.timestamp !== 'number' ||
      !Array.isArray(parsed.products) ||
      !Array.isArray(parsed.packs) ||
      !parsed.settings
    ) {
      return null;
    }
    const age = Date.now() - parsed.timestamp;
    if (age > STALE_TTL_MS) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(snapshot: CatalogSnapshot): void {
  // Never cache empty or invalid responses over valid catalog
  if (!isValidSnapshot(snapshot)) return;
  if (snapshot.products.length === 0 && snapshot.packs.length === 0) return;

  try {
    const envelope: CacheEnvelope = {
      timestamp: Date.now(),
      version: snapshot.version || 'v1',
      products: snapshot.products,
      packs: snapshot.packs,
      settings: snapshot.settings,
    };
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(envelope));
  } catch {
    // Ignore storage quota or private browsing errors
  }
}

async function fetchNetworkCatalog(): Promise<CatalogSnapshot> {
  if (inFlightFetch) return inFlightFetch;

  inFlightFetch = (async () => {
    const response = await fetch(`/catalog.json?v=${Math.floor(Date.now() / 60000)}`, {
      cache: 'no-cache',
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const data = (await response.json()) as unknown;
    if (!isValidSnapshot(data)) {
      throw new Error('Format de catalogue invalide.');
    }

    const normalized: CatalogSnapshot = {
      version: typeof data.version === 'string' ? data.version : 'v1',
      generatedAt: typeof data.generatedAt === 'string' ? data.generatedAt : new Date().toISOString(),
      products: data.products,
      packs: data.packs,
      settings: {
        ...DEFAULT_STORE_SETTINGS,
        ...data.settings,
        customCategories: Array.isArray(data.settings?.customCategories)
          ? data.settings.customCategories
          : [],
      },
    };

    writeCache(normalized);
    return normalized;
  })().finally(() => {
    inFlightFetch = null;
  });

  return inFlightFetch;
}

export async function getPublicCatalog(options?: {
  forceRefresh?: boolean;
  onBackgroundUpdate?: (snapshot: CatalogSnapshot) => void;
}): Promise<CatalogSnapshot> {
  const cached = !options?.forceRefresh ? readCache() : null;

  if (cached) {
    const age = Date.now() - cached.timestamp;
    const cachedSnapshot: CatalogSnapshot = {
      version: cached.version,
      generatedAt: new Date(cached.timestamp).toISOString(),
      products: cached.products,
      packs: cached.packs,
      settings: { ...DEFAULT_STORE_SETTINGS, ...cached.settings },
    };

    if (age <= FRESH_TTL_MS) {
      // Fresh TTL: zero network calls
      return cachedSnapshot;
    }

    // Stale-while-revalidate: return cache immediately and refresh in background
    fetchNetworkCatalog()
      .then((fresh) => {
        if (options?.onBackgroundUpdate) {
          options.onBackgroundUpdate(fresh);
        }
      })
      .catch(() => {
        // Keep valid cache silently if background refresh fails
      });

    return cachedSnapshot;
  }

  try {
    return await fetchNetworkCatalog();
  } catch (err) {
    // Fallback to any non-expired cache even if forceRefresh failed
    const fallback = readCache();
    if (fallback) {
      return {
        version: fallback.version,
        generatedAt: new Date(fallback.timestamp).toISOString(),
        products: fallback.products,
        packs: fallback.packs,
        settings: { ...DEFAULT_STORE_SETTINGS, ...fallback.settings },
      };
    }
    throw err;
  }
}

export function clearCatalogCache(): void {
  try {
    window.localStorage.removeItem(CACHE_KEY);
  } catch {
    // ignore
  }
}

// ============================================================================
// ADMIN-ONLY FIRESTORE METHODS (Dynamically imports ./firebase)
// ============================================================================

export async function compressImageFile(file: File, maxDim = 900, maxBytes = 550000): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas non disponible.');
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  let quality = 0.82;
  let dataUrl = canvas.toDataURL('image/webp', quality);
  if (!dataUrl.startsWith('data:image/webp')) {
    dataUrl = canvas.toDataURL('image/jpeg', quality);
  }

  while (dataUrl.length > maxBytes && quality > 0.35) {
    quality -= 0.1;
    dataUrl = canvas.toDataURL('image/webp', quality);
    if (!dataUrl.startsWith('data:image/webp')) {
      dataUrl = canvas.toDataURL('image/jpeg', quality);
    }
  }

  if (dataUrl.length > 590000) {
    throw new Error('Image trop volumineuse après compression (max 600 Ko).');
  }
  return dataUrl;
}

export async function uploadAdminImage(
  file: File,
  folder: 'products' | 'packs',
  docId: string
): Promise<{ imageUrl?: string; imageData?: string }> {
  const compressedDataUrl = await compressImageFile(file);

  try {
    const [{ storage }, { ref, uploadString, getDownloadURL }] = await Promise.all([
      import('./firebase'),
      import('firebase/storage'),
    ]);
    const storageRef = ref(storage, `${folder}/${docId}-${Date.now()}.webp`);
    await uploadString(storageRef, compressedDataUrl, 'data_url');
    const downloadUrl = await getDownloadURL(storageRef);
    return { imageUrl: downloadUrl, imageData: compressedDataUrl };
  } catch {
    // Fallback to compressed Base64 (< 600KB) if Storage is unavailable or blocked
    return { imageData: compressedDataUrl };
  }
}

export async function subscribeAdminProducts(
  onUpdate: (products: Product[]) => void,
  onError: (err: Error) => void
): Promise<() => void> {
  const [{ db, handleFirestoreError, OperationType }, { collection, onSnapshot, orderBy, query }] =
    await Promise.all([import('./firebase'), import('firebase/firestore')]);

  const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const items: Product[] = snapshot.docs.map((d) => {
        const data = d.data() as Record<string, unknown>;
        return {
          id: d.id,
          name: (data.name as Product['name']) || { fr: '', ar: '' },
          description: (data.description as Product['description']) || { fr: '', ar: '' },
          category: String(data.category || 'Niche'),
          price: Number(data.price || 0),
          sizeLabel: typeof data.sizeLabel === 'string' ? data.sizeLabel : undefined,
          sizes: Array.isArray(data.sizes) ? (data.sizes as Product['sizes']) : [],
          inStock: Boolean(data.inStock),
          imageData: typeof data.imageData === 'string' ? data.imageData : undefined,
          imageUrl: typeof data.imageUrl === 'string' ? data.imageUrl : undefined,
          images: Array.isArray(data.images) ? (data.images as string[]) : undefined,
        };
      });
      onUpdate(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, 'products');
      } catch (e) {
        onError(e instanceof Error ? e : new Error(String(e)));
      }
    }
  );
}

export async function saveAdminProduct(
  product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
): Promise<string> {
  const [{ db, handleFirestoreError, OperationType }, { doc, getDoc, serverTimestamp, setDoc, updateDoc }] =
    await Promise.all([import('./firebase'), import('firebase/firestore')]);

  const id = product.id?.trim() || `prod_${Date.now()}`;
  const ref = doc(db, 'products', id);

  const sanitizedSizes = (product.sizes || []).slice(0, 20).map((s, idx) => ({
    id: s.id || `size_${idx + 1}`,
    label: s.label.trim().slice(0, 40) || '10 ml',
    price: Math.max(0, Number(s.price) || 0),
    inStock: Boolean(s.inStock),
  }));

  const payload: Record<string, unknown> = {
    name: {
      fr: product.name.fr.trim().slice(0, 160),
      ar: (product.name.ar || '').trim().slice(0, 160),
    },
    description: {
      fr: product.description.fr.trim().slice(0, 2000),
      ar: (product.description.ar || '').trim().slice(0, 2000),
    },
    category: product.category.trim().slice(0, 64) || 'Niche',
    price: Math.max(0, Number(product.price) || (sanitizedSizes[0]?.price ?? 0)),
    sizeLabel: (product.sizeLabel || sanitizedSizes[0]?.label || 'Flacon complet').slice(0, 40),
    sizes: sanitizedSizes,
    inStock: Boolean(product.inStock),
    updatedAt: serverTimestamp(),
  };

  if (product.imageData !== undefined) payload.imageData = product.imageData.slice(0, 600000);
  if (product.imageUrl !== undefined) payload.imageUrl = product.imageUrl.slice(0, 2048);
  if (product.images !== undefined) payload.images = product.images.slice(0, 5);

  try {
    const existingSnap = await getDoc(ref);
    if (existingSnap.exists()) {
      const existingData = existingSnap.data();
      await updateDoc(ref, {
        ...payload,
        createdAt: existingData.createdAt || serverTimestamp(),
      });
    } else {
      await setDoc(ref, {
        ...payload,
        createdAt: serverTimestamp(),
      });
    }
    return id;
  } catch (error) {
    return handleFirestoreError(error, OperationType.WRITE, `products/${id}`);
  }
}

export async function deleteAdminProduct(id: string): Promise<void> {
  const [{ db, handleFirestoreError, OperationType }, { deleteDoc, doc }] = await Promise.all([
    import('./firebase'),
    import('firebase/firestore'),
  ]);
  try {
    await deleteDoc(doc(db, 'products', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `products/${id}`);
  }
}

export async function subscribeAdminSettings(
  onUpdate: (settings: StoreSettings) => void,
  onError: (err: Error) => void
): Promise<() => void> {
  const [{ db, handleFirestoreError, OperationType }, { doc, onSnapshot }] = await Promise.all([
    import('./firebase'),
    import('firebase/firestore'),
  ]);

  let latest: StoreSettings = { ...DEFAULT_STORE_SETTINGS };

  const unsubWa = onSnapshot(
    doc(db, 'settings', 'whatsapp'),
    (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        latest = {
          ...latest,
          whatsappNumber: typeof data.number === 'string' ? data.number : latest.whatsappNumber,
        };
        onUpdate(latest);
      }
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, 'settings/whatsapp');
      } catch (e) {
        onError(e instanceof Error ? e : new Error(String(e)));
      }
    }
  );

  const unsubGeneral = onSnapshot(
    doc(db, 'settings', 'general'),
    (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        latest = {
          ...latest,
          storeName: typeof data.storeName === 'string' && data.storeName ? data.storeName : latest.storeName,
          announcementFr:
            typeof data.announcementFr === 'string' && data.announcementFr
              ? data.announcementFr
              : latest.announcementFr,
          announcementAr:
            typeof data.announcementAr === 'string' ? data.announcementAr : latest.announcementAr,
          customCategories: Array.isArray(data.customCategories)
            ? data.customCategories.filter((c): c is string => typeof c === 'string')
            : latest.customCategories,
          deliveryFeeLocal:
            typeof data.deliveryFeeLocal === 'number' ? data.deliveryFeeLocal : latest.deliveryFeeLocal,
          deliveryFeeNational:
            typeof data.deliveryFeeNational === 'number'
              ? data.deliveryFeeNational
              : latest.deliveryFeeNational,
        };
        onUpdate(latest);
      }
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, 'settings/general');
      } catch (e) {
        onError(e instanceof Error ? e : new Error(String(e)));
      }
    }
  );

  return () => {
    unsubWa();
    unsubGeneral();
  };
}

export async function saveAdminSettings(settings: StoreSettings): Promise<void> {
  const [{ db, handleFirestoreError, OperationType }, { doc, serverTimestamp, setDoc }] = await Promise.all([
    import('./firebase'),
    import('firebase/firestore'),
  ]);

  try {
    await Promise.all([
      setDoc(
        doc(db, 'settings', 'whatsapp'),
        {
          number: settings.whatsappNumber.replace(/[^\d+\s]/g, '').slice(0, 32) || '212610640666',
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      ),
      setDoc(
        doc(db, 'settings', 'general'),
        {
          storeName: settings.storeName.trim().slice(0, 120) || DEFAULT_STORE_SETTINGS.storeName,
          announcementFr:
            settings.announcementFr.trim().slice(0, 240) || DEFAULT_STORE_SETTINGS.announcementFr,
          announcementAr: (settings.announcementAr || '').trim().slice(0, 240),
          customCategories: settings.customCategories
            .map((c) => c.trim().slice(0, 64))
            .filter(Boolean)
            .slice(0, 20),
          deliveryFeeLocal: Math.max(0, Number(settings.deliveryFeeLocal) || 20),
          deliveryFeeNational: Math.max(0, Number(settings.deliveryFeeNational) || 35),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      ),
    ]);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'settings');
  }
}

export interface DiagnosticStepResult {
  step: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'CONFIRM_GONE';
  ok: boolean;
  detail: string;
}

export async function runFirestoreHealthCheck(): Promise<{
  ok: boolean;
  latencyMs: number;
  message: string;
}> {
  const { testConnection } = await import('./firebase');
  return testConnection();
}

export async function runFiveStepSelfTest(adminEmail: string): Promise<DiagnosticStepResult[]> {
  const [
    { db, handleFirestoreError, OperationType },
    { deleteDoc, doc, getDoc, serverTimestamp, setDoc, updateDoc },
  ] = await Promise.all([import('./firebase'), import('firebase/firestore')]);

  const testId = `diag_${Date.now()}`;
  const ref = doc(db, '_health', testId);
  const results: DiagnosticStepResult[] = [];

  // 1. CREATE
  try {
    await setDoc(ref, {
      status: 'created',
      step: 'CREATE',
      checkedBy: adminEmail || 'admin',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    results.push({ step: 'CREATE', ok: true, detail: `Document _health/${testId} créé.` });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `_health/${testId}`);
  }

  // 2. READ
  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) throw new Error('Document introuvable après création.');
    results.push({ step: 'READ', ok: true, detail: 'Lecture serveur confirmée.' });
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `_health/${testId}`);
  }

  // 3. UPDATE
  try {
    await updateDoc(ref, {
      status: 'updated',
      step: 'UPDATE',
      updatedAt: serverTimestamp(),
    });
    results.push({ step: 'UPDATE', ok: true, detail: 'Mise à jour validée.' });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `_health/${testId}`);
  }

  // 4. DELETE
  try {
    await deleteDoc(ref);
    results.push({ step: 'DELETE', ok: true, detail: 'Suppression effectuée.' });
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `_health/${testId}`);
  }

  // 5. CONFIRM GONE
  try {
    const verifySnap = await getDoc(ref);
    if (verifySnap.exists()) {
      results.push({
        step: 'CONFIRM_GONE',
        ok: false,
        detail: 'Le document existe encore après suppression.',
      });
    } else {
      results.push({
        step: 'CONFIRM_GONE',
        ok: true,
        detail: 'Absence définitive confirmée.',
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `_health/${testId}`);
  }

  return results;
}
