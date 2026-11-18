import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { initializeApp } from 'firebase/app';
import { collection, doc, getDoc, getDocs, getFirestore } from 'firebase/firestore';
import sharp from 'sharp';

interface LocalizedText {
  fr: string;
  ar: string;
}

interface CatalogProduct {
  id: string;
  name: LocalizedText;
  description: LocalizedText;
  category: string;
  price: number;
  sizeLabel?: string;
  sizes: Array<{ id: string; label: string; price: number; inStock: boolean }>;
  inStock: boolean;
  imageUrl?: string;
  images?: string[];
  createdAt?: number | string;
  updatedAt?: number | string;
}

interface CatalogPack {
  id: string;
  category: 'women' | 'men';
  name: LocalizedText;
  description: LocalizedText;
  price: number;
  active: boolean;
  imageUrl?: string;
  createdAt?: number | string;
  updatedAt?: number | string;
}

interface StoreSettings {
  whatsappNumber: string;
  storeName: string;
  announcementFr: string;
  announcementAr: string;
  customCategories: string[];
  deliveryFeeLocal: number;
  deliveryFeeNational: number;
}

const ROOT = process.cwd();
const PUBLIC_DIR = path.join(ROOT, 'public');
const IMG_DIR = path.join(PUBLIC_DIR, 'img');
const CATALOG_PATH = path.join(PUBLIC_DIR, 'catalog.json');
const CONFIG_PATH = path.join(ROOT, 'firebase-applet-config.json');

const DEFAULT_SETTINGS: StoreSettings = {
  whatsappNumber: '212610640666',
  storeName: 'PARFUMERIE EL KHALIFI',
  announcementFr: 'PARFUMERIE EL KHALIFI — FLACONS ET DÉCANTS VIA WHATSAPP',
  announcementAr: 'بارفومري الخليفي — قنينات وتقسيمات عبر واتساب',
  customCategories: [],
  deliveryFeeLocal: 20,
  deliveryFeeNational: 35,
};

function sanitizeId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64) || 'item';
}

function toTimestampValue(val: unknown): number | string | undefined {
  if (!val) return undefined;
  if (typeof val === 'number' || typeof val === 'string') return val;
  if (typeof val === 'object' && val !== null && 'toMillis' in val && typeof (val as { toMillis: () => number }).toMillis === 'function') {
    return (val as { toMillis: () => number }).toMillis();
  }
  return undefined;
}

function normalizeLocalized(val: unknown, fallback = ''): LocalizedText {
  if (val && typeof val === 'object') {
    const record = val as Record<string, unknown>;
    return {
      fr: typeof record.fr === 'string' ? record.fr : fallback,
      ar: typeof record.ar === 'string' ? record.ar : '',
    };
  }
  if (typeof val === 'string') {
    return { fr: val, ar: '' };
  }
  return { fr: fallback, ar: '' };
}

function extractRawImageSource(data: Record<string, unknown>): string | null {
  const candidates: unknown[] = [
    data.imageData,
    data.image,
    data.imageUrl,
    Array.isArray(data.images) && data.images.length > 0 ? data.images[0] : null,
  ];
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim().length > 0) {
      return c.trim();
    }
  }
  return null;
}

async function resolveImageBuffer(source: string): Promise<Buffer | null> {
  if (source.startsWith('data:image/')) {
    const commaIdx = source.indexOf(',');
    if (commaIdx === -1) return null;
    const base64 = source.slice(commaIdx + 1);
    return Buffer.from(base64, 'base64');
  }
  if (/^[A-Za-z0-9+/=]{100,}$/.test(source)) {
    return Buffer.from(source, 'base64');
  }
  if (source.startsWith('http://') || source.startsWith('https://')) {
    try {
      const res = await fetch(source, { signal: AbortSignal.timeout(15000) });
      if (!res.ok) return null;
      const arr = await res.arrayBuffer();
      return Buffer.from(arr);
    } catch {
      return null;
    }
  }
  if (source.startsWith('/')) {
    const localPath = path.join(PUBLIC_DIR, source.slice(1));
    if (fs.existsSync(localPath)) {
      return fs.readFileSync(localPath);
    }
  }
  return null;
}

async function processImageToWebp(
  rawId: string,
  source: string | null,
  usedFiles: Set<string>
): Promise<string | undefined> {
  if (!source) return undefined;
  const buf = await resolveImageBuffer(source);
  if (!buf || buf.length === 0) {
    if (source.startsWith('/img/') || source.startsWith('http://') || source.startsWith('https://')) {
      return source;
    }
    return undefined;
  }

  try {
    const webpBuffer = await sharp(buf)
      .rotate()
      .resize(1000, 1000, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();

    const hash = crypto.createHash('md5').update(webpBuffer).digest('hex').slice(0, 8);
    const filename = `${sanitizeId(rawId)}-${hash}.webp`;
    const outPath = path.join(IMG_DIR, filename);

    if (!fs.existsSync(outPath)) {
      fs.writeFileSync(outPath, webpBuffer);
    }
    usedFiles.add(filename);
    return `/img/${filename}`;
  } catch (err) {
    console.warn(`[build-catalog] Sharp optimization skipped for ${rawId}:`, err);
    return undefined;
  }
}

function readPreviousCatalog(): { productsCount: number; exists: boolean } {
  try {
    if (!fs.existsSync(CATALOG_PATH)) return { productsCount: 0, exists: false };
    const raw = fs.readFileSync(CATALOG_PATH, 'utf-8');
    const parsed = JSON.parse(raw) as { products?: unknown[] };
    return {
      productsCount: Array.isArray(parsed.products) ? parsed.products.length : 0,
      exists: true,
    };
  } catch {
    return { productsCount: 0, exists: false };
  }
}

async function main() {
  fs.mkdirSync(PUBLIC_DIR, { recursive: true });
  fs.mkdirSync(IMG_DIR, { recursive: true });

  const prev = readPreviousCatalog();

  if (!fs.existsSync(CONFIG_PATH)) {
    console.warn('[build-catalog] firebase-applet-config.json missing.');
    if (!prev.exists) {
      const emptySnapshot = {
        version: 'v1-empty',
        generatedAt: new Date().toISOString(),
        products: [],
        packs: [],
        settings: DEFAULT_SETTINGS,
      };
      fs.writeFileSync(CATALOG_PATH, JSON.stringify(emptySnapshot, null, 2));
    }
    return;
  }

  const firebaseConfig = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));

  try {
    const app = initializeApp(firebaseConfig, 'build-catalog');
    const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

    const [productsSnap, packsSnap, whatsappSnap, generalSnap] = await Promise.all([
      getDocs(collection(db, 'products')),
      getDocs(collection(db, 'packs')),
      getDoc(doc(db, 'settings', 'whatsapp')),
      getDoc(doc(db, 'settings', 'general')),
    ]);

    const fetchedCount = productsSnap.size;
    if (prev.productsCount > 0 && fetchedCount < Math.floor(prev.productsCount * 0.7)) {
      console.warn(
        `[build-catalog] Safety guard triggered: fetched ${fetchedCount} products vs previous ${prev.productsCount} (<70%). Keeping existing catalog.json untouched.`
      );
      return;
    }

    const usedWebpFiles = new Set<string>();
    const products: CatalogProduct[] = [];

    for (const docSnap of productsSnap.docs) {
      const data = docSnap.data() as Record<string, unknown>;
      const rawImg = extractRawImageSource(data);
      const webpUrl = await processImageToWebp(`p_${docSnap.id}`, rawImg, usedWebpFiles);

      const galleryUrls: string[] = [];
      if (webpUrl) galleryUrls.push(webpUrl);
      if (Array.isArray(data.images)) {
        for (let i = 0; i < data.images.length && i < 5; i++) {
          const itemImg = data.images[i];
          if (typeof itemImg === 'string' && itemImg !== rawImg) {
            const extraUrl = await processImageToWebp(`p_${docSnap.id}_${i}`, itemImg, usedWebpFiles);
            if (extraUrl && !galleryUrls.includes(extraUrl)) {
              galleryUrls.push(extraUrl);
            }
          }
        }
      }

      const rawSizes = Array.isArray(data.sizes) ? data.sizes : [];
      const sizes = rawSizes
        .filter((s): s is Record<string, unknown> => Boolean(s && typeof s === 'object'))
        .map((s, idx) => ({
          id: typeof s.id === 'string' && s.id ? s.id : `s_${idx}`,
          label: typeof s.label === 'string' ? s.label : 'Standard',
          price: typeof s.price === 'number' ? s.price : Number(data.price || 0),
          inStock: typeof s.inStock === 'boolean' ? s.inStock : true,
        }));

      const fallbackPrice = sizes.length > 0 ? sizes[0].price : Number(data.price || 0);

      products.push({
        id: docSnap.id,
        name: normalizeLocalized(data.name, 'Création'),
        description: normalizeLocalized(data.description, ''),
        category: typeof data.category === 'string' && data.category ? data.category : 'Niche',
        price: typeof data.price === 'number' ? data.price : fallbackPrice,
        sizeLabel:
          typeof data.sizeLabel === 'string' && data.sizeLabel
            ? data.sizeLabel
            : sizes[0]?.label || 'Flacon complet',
        sizes:
          sizes.length > 0
            ? sizes
            : [
                {
                  id: 'default',
                  label: typeof data.sizeLabel === 'string' && data.sizeLabel ? data.sizeLabel : 'Flacon complet',
                  price: typeof data.price === 'number' ? data.price : 0,
                  inStock: typeof data.inStock === 'boolean' ? data.inStock : true,
                },
              ],
        inStock: typeof data.inStock === 'boolean' ? data.inStock : true,
        imageUrl: webpUrl,
        images: galleryUrls.length > 0 ? galleryUrls : undefined,
        createdAt: toTimestampValue(data.createdAt),
        updatedAt: toTimestampValue(data.updatedAt),
      });
    }

    const packs: CatalogPack[] = [];
    for (const docSnap of packsSnap.docs) {
      const data = docSnap.data() as Record<string, unknown>;
      const rawImg = extractRawImageSource(data);
      const webpUrl = await processImageToWebp(`pk_${docSnap.id}`, rawImg, usedWebpFiles);

      packs.push({
        id: docSnap.id,
        category: data.category === 'men' ? 'men' : 'women',
        name: normalizeLocalized(data.name, 'Pack'),
        description: normalizeLocalized(data.description, ''),
        price: typeof data.price === 'number' ? data.price : 0,
        active: typeof data.active === 'boolean' ? data.active : true,
        imageUrl: webpUrl,
        createdAt: toTimestampValue(data.createdAt),
        updatedAt: toTimestampValue(data.updatedAt),
      });
    }

    const whatsappData = whatsappSnap.exists() ? (whatsappSnap.data() as Record<string, unknown>) : {};
    const generalData = generalSnap.exists() ? (generalSnap.data() as Record<string, unknown>) : {};

    const settings: StoreSettings = {
      whatsappNumber:
        typeof whatsappData.number === 'string' && whatsappData.number.trim()
          ? whatsappData.number.trim()
          : DEFAULT_SETTINGS.whatsappNumber,
      storeName:
        typeof generalData.storeName === 'string' && generalData.storeName.trim()
          ? generalData.storeName.trim()
          : DEFAULT_SETTINGS.storeName,
      announcementFr:
        typeof generalData.announcementFr === 'string' && generalData.announcementFr.trim()
          ? generalData.announcementFr.trim()
          : DEFAULT_SETTINGS.announcementFr,
      announcementAr:
        typeof generalData.announcementAr === 'string'
          ? generalData.announcementAr
          : DEFAULT_SETTINGS.announcementAr,
      customCategories: Array.isArray(generalData.customCategories)
        ? generalData.customCategories.filter((c): c is string => typeof c === 'string' && c.trim().length > 0)
        : [],
      deliveryFeeLocal:
        typeof generalData.deliveryFeeLocal === 'number' ? generalData.deliveryFeeLocal : 20,
      deliveryFeeNational:
        typeof generalData.deliveryFeeNational === 'number' ? generalData.deliveryFeeNational : 35,
    };

    // Delete orphaned WebP files from public/img
    if (fs.existsSync(IMG_DIR)) {
      for (const file of fs.readdirSync(IMG_DIR)) {
        if (file.endsWith('.webp') && !usedWebpFiles.has(file)) {
          fs.unlinkSync(path.join(IMG_DIR, file));
        }
      }
    }

    // Sort newest first by default
    products.sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));
    packs.sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));

    const payload = {
      products,
      packs,
      settings,
    };
    const version = crypto.createHash('md5').update(JSON.stringify(payload)).digest('hex').slice(0, 12);

    const snapshot = {
      version,
      generatedAt: new Date().toISOString(),
      ...payload,
    };

    fs.writeFileSync(CATALOG_PATH, JSON.stringify(snapshot, null, 2));
    console.log(
      `[build-catalog] Generated public/catalog.json (${products.length} products, ${packs.length} packs, version ${version}).`
    );
  } catch (err) {
    console.error('[build-catalog] Failed to read Firestore:', err);
    if (!prev.exists) {
      const emptySnapshot = {
        version: 'v1-empty',
        generatedAt: new Date().toISOString(),
        products: [],
        packs: [],
        settings: DEFAULT_SETTINGS,
      };
      fs.writeFileSync(CATALOG_PATH, JSON.stringify(emptySnapshot, null, 2));
      console.log('[build-catalog] Created initial empty public/catalog.json for new store.');
    } else {
      console.warn('[build-catalog] Preserving existing public/catalog.json.');
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(0);
  });
