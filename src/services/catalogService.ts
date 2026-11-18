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

const LEGACY_ANNOUNCEMENT_FR = 'PARFUMERIE EL KHALIFI — FLACONS ET DÉCANTS VIA WHATSAPP';

function upgradeLegacyAnnouncementFr(raw: unknown, fallback: string): string {
  if (typeof raw !== 'string' || !raw.trim()) return fallback;
  if (raw.trim() === LEGACY_ANNOUNCEMENT_FR) {
    return DEFAULT_STORE_SETTINGS.announcementFr;
  }
  return raw;
}

let inFlightFetch: Promise<CatalogSnapshot> | null = null;

export function toTimestampMs(val: unknown): number | undefined {
  if (typeof val === 'number' && Number.isFinite(val)) return val;
  if (typeof val === 'string' && val.trim()) {
    const asNum = Number(val);
    if (Number.isFinite(asNum)) return asNum;
    const parsed = Date.parse(val);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  if (
    val &&
    typeof val === 'object' &&
    'toMillis' in val &&
    typeof (val as { toMillis?: unknown }).toMillis === 'function'
  ) {
    return (val as { toMillis: () => number }).toMillis();
  }
  return undefined;
}

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
        announcementFr: upgradeLegacyAnnouncementFr(
          data.settings?.announcementFr,
          DEFAULT_STORE_SETTINGS.announcementFr
        ),
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
      settings: {
        ...DEFAULT_STORE_SETTINGS,
        ...cached.settings,
        announcementFr: upgradeLegacyAnnouncementFr(
          cached.settings?.announcementFr,
          DEFAULT_STORE_SETTINGS.announcementFr
        ),
      },
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

export async function subscribePublicCatalog(
  callbacks: {
    onProducts: (products: Product[]) => void;
    onPacks: (packs: Pack[]) => void;
    onSettings: (settings: StoreSettings) => void;
    onError?: (err: Error) => void;
  }
): Promise<() => void> {
  const [{ db }, { collection, doc, onSnapshot, orderBy, query }] = await Promise.all([
    import('./firebase'),
    import('firebase/firestore'),
  ]);

  let latestSettings: StoreSettings = { ...DEFAULT_STORE_SETTINGS };
  let currentProducts: Product[] = [];
  let currentPacks: Pack[] = [];
  let gotProducts = false;
  let gotPacks = false;

  const syncCache = () => {
    if (!gotProducts || !gotPacks) return;
    if (currentProducts.length === 0 && currentPacks.length === 0) {
      clearCatalogCache();
      return;
    }
    writeCache({
      version: `live-${Date.now()}`,
      generatedAt: new Date().toISOString(),
      products: currentProducts,
      packs: currentPacks,
      settings: latestSettings,
    });
  };

  const unsubProducts = onSnapshot(
    query(collection(db, 'products'), orderBy('createdAt', 'desc')),
    (snapshot) => {
      currentProducts = snapshot.docs.map((d) => {
        const data = d.data() as Record<string, unknown>;
        return {
          id: d.id,
          name: (data.name as Product['name']) || { fr: '', ar: '' },
          description: (data.description as Product['description']) || { fr: '', ar: '' },
          category: String(data.category || 'Niche'),
          price: Number(data.price || 0),
          sizeLabel: typeof data.sizeLabel === 'string' ? data.sizeLabel : undefined,
          sizes: Array.isArray(data.sizes) ? (data.sizes as Product['sizes']) : [],
          inStock: typeof data.inStock === 'boolean' ? data.inStock : true,
          imageData: typeof data.imageData === 'string' && data.imageData ? data.imageData : undefined,
          imageUrl: typeof data.imageUrl === 'string' && data.imageUrl ? data.imageUrl : undefined,
          images: Array.isArray(data.images) ? (data.images as string[]) : undefined,
          createdAt: toTimestampMs(data.createdAt),
          updatedAt: toTimestampMs(data.updatedAt),
        };
      });
      gotProducts = true;
      callbacks.onProducts(currentProducts);
      syncCache();
    },
    (error) => {
      if (callbacks.onError) {
        callbacks.onError(error instanceof Error ? error : new Error(String(error)));
      }
    }
  );

  const unsubPacks = onSnapshot(
    query(collection(db, 'packs'), orderBy('createdAt', 'desc')),
    (snapshot) => {
      currentPacks = snapshot.docs.map((d) => {
        const data = d.data() as Record<string, unknown>;
        return {
          id: d.id,
          category: data.category === 'men' ? 'men' : 'women',
          name: (data.name as Pack['name']) || { fr: '', ar: '' },
          description: (data.description as Pack['description']) || { fr: '', ar: '' },
          price: Number(data.price || 0),
          active: typeof data.active === 'boolean' ? data.active : true,
          imageData: typeof data.imageData === 'string' && data.imageData ? data.imageData : undefined,
          imageUrl: typeof data.imageUrl === 'string' && data.imageUrl ? data.imageUrl : undefined,
          createdAt: toTimestampMs(data.createdAt),
          updatedAt: toTimestampMs(data.updatedAt),
        };
      });
      gotPacks = true;
      callbacks.onPacks(currentPacks);
      syncCache();
    },
    (error) => {
      if (callbacks.onError) {
        callbacks.onError(error instanceof Error ? error : new Error(String(error)));
      }
    }
  );

  const unsubWa = onSnapshot(
    doc(db, 'settings', 'whatsapp'),
    (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        latestSettings = {
          ...latestSettings,
          whatsappNumber:
            typeof data.number === 'string' && data.number ? data.number : latestSettings.whatsappNumber,
        };
        callbacks.onSettings(latestSettings);
        syncCache();
      }
    },
    () => {
      // Keep default/cached settings if transient read fails
    }
  );

  const unsubGeneral = onSnapshot(
    doc(db, 'settings', 'general'),
    (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        latestSettings = {
          ...latestSettings,
          storeName:
            typeof data.storeName === 'string' && data.storeName
              ? data.storeName
              : latestSettings.storeName,
          announcementFr: upgradeLegacyAnnouncementFr(
            data.announcementFr,
            latestSettings.announcementFr
          ),
          announcementAr:
            typeof data.announcementAr === 'string'
              ? data.announcementAr
              : latestSettings.announcementAr,
          customCategories: Array.isArray(data.customCategories)
            ? data.customCategories.filter((c): c is string => typeof c === 'string')
            : latestSettings.customCategories,
          deliveryFeeLocal:
            typeof data.deliveryFeeLocal === 'number'
              ? data.deliveryFeeLocal
              : latestSettings.deliveryFeeLocal,
          deliveryFeeNational:
            typeof data.deliveryFeeNational === 'number'
              ? data.deliveryFeeNational
              : latestSettings.deliveryFeeNational,
        };
        callbacks.onSettings(latestSettings);
        syncCache();
      }
    },
    () => {
      // Keep default/cached settings if transient read fails
    }
  );

  return () => {
    unsubProducts();
    unsubPacks();
    unsubWa();
    unsubGeneral();
  };
}

// ============================================================================
// ADMIN-ONLY FIRESTORE METHODS (Dynamically imports ./firebase)
// ============================================================================

async function decodeImageForCanvas(
  file: File,
  maxDim: number
): Promise<{ width: number; height: number; draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void; release: () => void }> {
  if (typeof createImageBitmap === 'function') {
    try {
      const probe = await createImageBitmap(file);
      const naturalMax = Math.max(probe.width, probe.height);
      if (naturalMax > maxDim) {
        const scale = maxDim / naturalMax;
        const targetW = Math.max(1, Math.round(probe.width * scale));
        const targetH = Math.max(1, Math.round(probe.height * scale));
        probe.close();
        try {
          const resized = await createImageBitmap(file, {
            resizeWidth: targetW,
            resizeHeight: targetH,
            resizeQuality: 'medium',
          });
          return {
            width: resized.width,
            height: resized.height,
            draw: (ctx, w, h) => ctx.drawImage(resized, 0, 0, w, h),
            release: () => resized.close(),
          };
        } catch {
          // Fallback to full-size bitmap if resize options unsupported
        }
      } else {
        return {
          width: probe.width,
          height: probe.height,
          draw: (ctx, w, h) => ctx.drawImage(probe, 0, 0, w, h),
          release: () => probe.close(),
        };
      }
    } catch {
      // Fallback to HTMLImageElement for formats where createImageBitmap fails
    }
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Impossible de lire ce fichier image."));
      el.src = objectUrl;
    });
    return {
      width: img.naturalWidth || img.width,
      height: img.naturalHeight || img.height,
      draw: (ctx, w, h) => ctx.drawImage(img, 0, 0, w, h),
      release: () => URL.revokeObjectURL(objectUrl),
    };
  } catch (err) {
    URL.revokeObjectURL(objectUrl);
    throw err;
  }
}

export async function compressImageFile(file: File, maxDim = 600, maxBytes = 80000): Promise<string> {
  const source = await decodeImageForCanvas(file, maxDim);
  const renderScaled = (targetDim: number, quality: number): string => {
    const scale = Math.min(1, targetDim / Math.max(source.width, source.height));
    const width = Math.max(1, Math.round(source.width * scale));
    const height = Math.max(1, Math.round(source.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas non disponible.');
    source.draw(ctx, width, height);
    let out = canvas.toDataURL('image/webp', quality);
    if (!out.startsWith('data:image/webp')) {
      out = canvas.toDataURL('image/jpeg', quality);
    }
    return out;
  };

  try {
    let dataUrl = renderScaled(maxDim, 0.72);
    if (dataUrl.length > maxBytes) {
      dataUrl = renderScaled(500, 0.6);
    }
    if (dataUrl.length > maxBytes) {
      dataUrl = renderScaled(400, 0.52);
    }
    if (dataUrl.length > 590000) {
      throw new Error('Image trop volumineuse après compression (max 600 Ko).');
    }
    return dataUrl;
  } finally {
    source.release();
  }
}

const STORAGE_UNAVAILABLE_KEY = 'parfumerie_storage_unavailable';
let storageUnavailable = (() => {
  try {
    return window.sessionStorage.getItem(STORAGE_UNAVAILABLE_KEY) === '1';
  } catch {
    return false;
  }
})();

export async function uploadAdminImage(
  file: File,
  folder: 'products' | 'packs',
  docId: string
): Promise<{ imageUrl?: string; imageData: string }> {
  const compressedDataUrl = await compressImageFile(file);

  // Instant compressed WebP storage in Firestore unless Firebase Storage is explicitly enabled
  if (import.meta.env.VITE_ENABLE_FIREBASE_STORAGE !== 'true' || storageUnavailable) {
    return { imageData: compressedDataUrl };
  }

  try {
    const [{ getFirebaseStorage }, { ref, uploadString, getDownloadURL }] = await Promise.all([
      import('./firebase'),
      import('firebase/storage'),
    ]);
    const storage = await getFirebaseStorage();
    storage.maxUploadRetryTime = 1200;
    storage.maxOperationRetryTime = 1200;

    const storageRef = ref(storage, `${folder}/${docId}-${Date.now()}.webp`);
    const uploadPromise = (async () => {
      await uploadString(storageRef, compressedDataUrl, 'data_url');
      return getDownloadURL(storageRef);
    })();

    const timeoutPromise = new Promise<never>((_, reject) => {
      window.setTimeout(() => reject(new Error('Storage upload timeout')), 1200);
    });

    const downloadUrl = await Promise.race([uploadPromise, timeoutPromise]);
    return { imageUrl: downloadUrl, imageData: compressedDataUrl };
  } catch {
    storageUnavailable = true;
    try {
      window.sessionStorage.setItem(STORAGE_UNAVAILABLE_KEY, '1');
    } catch {
      // ignore
    }
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
          createdAt: toTimestampMs(data.createdAt),
          updatedAt: toTimestampMs(data.updatedAt),
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
  const [
    { db, handleFirestoreError, OperationType },
    { deleteField, doc, serverTimestamp, setDoc, updateDoc },
  ] = await Promise.all([import('./firebase'), import('firebase/firestore')]);

  const rawId = product.id?.trim().replace(/[^a-zA-Z0-9_-]/g, '_') || `prod_${Date.now()}`;
  const id = rawId.slice(0, 128);
  const ref = doc(db, 'products', id);

  const sanitizedSizes = (product.sizes || []).slice(0, 20).map((s, idx) => ({
    id: (s.id || `size_${idx + 1}`).trim().replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64) || `size_${idx + 1}`,
    label: s.label.trim().slice(0, 40) || '10 ml',
    price: Math.min(1000000, Math.max(0, Number(s.price) || 0)),
    inStock: Boolean(s.inStock),
  }));

  const safeSizes =
    sanitizedSizes.length > 0
      ? sanitizedSizes
      : [{ id: 'default', label: 'Format standard', price: Math.min(1000000, Math.max(0, Number(product.price) || 0)), inStock: Boolean(product.inStock) }];

  const payload: Record<string, unknown> = {
    name: {
      fr: product.name.fr.trim().slice(0, 160) || 'Création',
      ar: (product.name.ar || '').trim().slice(0, 160),
    },
    description: {
      fr: product.description.fr.trim().slice(0, 2000),
      ar: (product.description.ar || '').trim().slice(0, 2000),
    },
    category: product.category.trim().slice(0, 64) || 'Niche',
    price: Math.min(1000000, Math.max(0, Number(product.price) || (safeSizes[0]?.price ?? 0))),
    sizeLabel: (product.sizeLabel || safeSizes[0]?.label || 'Format standard').trim().slice(0, 40),
    sizes: safeSizes,
    inStock: Boolean(product.inStock),
    updatedAt: serverTimestamp(),
  };

  if (product.imageData !== undefined && product.imageData !== '') {
    payload.imageData = product.imageData.slice(0, 600000);
  }
  if (product.imageUrl !== undefined && product.imageUrl !== '') {
    payload.imageUrl = product.imageUrl.slice(0, 2048);
  }
  if (product.images !== undefined) payload.images = product.images.slice(0, 5);

  try {
    const isExistingEdit = Boolean(product.id?.trim());
    if (isExistingEdit) {
      const updatePayload: Record<string, unknown> = { ...payload };
      if (product.imageUrl === '') {
        updatePayload.imageUrl = deleteField();
      }
      if (product.imageData === '') {
        updatePayload.imageData = deleteField();
      }
      try {
        await updateDoc(ref, updatePayload);
      } catch (err) {
        const code = (err as { code?: string })?.code;
        const msg = err instanceof Error ? err.message : String(err);
        if (code === 'not-found' || msg.includes('No document to update')) {
          await setDoc(ref, {
            ...payload,
            createdAt: serverTimestamp(),
          });
        } else {
          throw err;
        }
      }
    } else {
      await setDoc(ref, {
        ...payload,
        createdAt: serverTimestamp(),
      });
    }
    clearCatalogCache();
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
    clearCatalogCache();
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
          announcementFr: upgradeLegacyAnnouncementFr(data.announcementFr, latest.announcementFr),
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

  const cleanedNumber = settings.whatsappNumber.replace(/[^\d+\s]/g, '').trim().slice(0, 32);
  const safeNumber = cleanedNumber.length >= 8 ? cleanedNumber : '212610640666';

  const parsedLocal = Number(settings.deliveryFeeLocal);
  const safeLocalFee = Number.isFinite(parsedLocal) ? Math.min(1000, Math.max(0, parsedLocal)) : 20;

  const parsedNational = Number(settings.deliveryFeeNational);
  const safeNationalFee = Number.isFinite(parsedNational)
    ? Math.min(1000, Math.max(0, parsedNational))
    : 35;

  try {
    await Promise.all([
      setDoc(
        doc(db, 'settings', 'whatsapp'),
        {
          number: safeNumber,
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
          deliveryFeeLocal: safeLocalFee,
          deliveryFeeNational: safeNationalFee,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      ),
    ]);
    clearCatalogCache();
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
    results.push({ step: 'CREATE', ok: true, detail: `تم إنشاء سجل الفحص _health/${testId}.` });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `_health/${testId}`);
  }

  // 2. READ
  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) throw new Error('لم يتم العثور على المستند بعد الإنشاء.');
    results.push({ step: 'READ', ok: true, detail: 'تم تأكيد القراءة من الخادم.' });
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
    results.push({ step: 'UPDATE', ok: true, detail: 'تمت المصادقة على التحديث.' });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `_health/${testId}`);
  }

  // 4. DELETE
  try {
    await deleteDoc(ref);
    results.push({ step: 'DELETE', ok: true, detail: 'تم الحذف بنجاح.' });
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
        detail: 'المستند لا يزال موجوداً بعد الحذف.',
      });
    } else {
      results.push({
        step: 'CONFIRM_GONE',
        ok: true,
        detail: 'تم تأكيد الحذف النهائي.',
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `_health/${testId}`);
  }

  return results;
}
