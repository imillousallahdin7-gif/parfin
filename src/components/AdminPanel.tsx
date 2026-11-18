import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Edit2,
  KeyRound,
  Lock,
  LogOut,
  Package,
  Plus,
  Rocket,
  Search,
  Settings,
  Sparkles,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {
  BASE_CATEGORIES,
  DEFAULT_STORE_SETTINGS,
  Pack,
  Product,
  ProductSize,
  STORE_IDENTITY,
  StoreSettings,
} from '../types/catalog';
import { formatMAD, normalizeText } from '../utils/format';
import {
  DiagnosticStepResult,
  deleteAdminProduct,
  runFiveStepSelfTest,
  runFirestoreHealthCheck,
  saveAdminProduct,
  saveAdminSettings,
  subscribeAdminProducts,
  subscribeAdminSettings,
  uploadAdminImage,
} from '../services/catalogService';
import { subscribeAdminPacks } from '../services/packService';
import { BrandLogo } from './BrandLogo';
import { PacksAdminSection } from './PacksAdminSection';

interface AdminPanelProps {
  onBackHome: () => void;
}

const PUBLISH_KEY_SESSION_STORAGE = 'parfumerie_elkhalifi_publish_key';
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 60;

interface ProductFormState {
  id?: string;
  nameFr: string;
  nameAr: string;
  category: string;
  descFr: string;
  descAr: string;
  inStock: boolean;
  sizes: ProductSize[];
  imageUrl?: string;
  imageData?: string;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onBackHome }) => {
  // Auth state
  const [authReady, setAuthReady] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [loginEmail, setLoginEmail] = useState<string>(STORE_IDENTITY.adminEmail);
  const [loginPassword, setLoginPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutSecondsLeft, setLockoutSecondsLeft] = useState(0);

  // Admin navigation & live Firestore data
  const [activeTab, setActiveTab] = useState<'products' | 'packs' | 'settings'>('products');
  const [products, setProducts] = useState<Product[]>([]);
  const [packs, setPacks] = useState<Pack[]>([]);
  const [settings, setSettings] = useState<StoreSettings>(DEFAULT_STORE_SETTINGS);
  const [listenerError, setListenerError] = useState<string | null>(null);

  // Publishing state
  const [unpublishedChanges, setUnpublishedChanges] = useState(false);
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [publishKeyInput, setPublishKeyInput] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [publishStatus, setPublishStatus] = useState<string | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [publishCooldown, setPublishCooldown] = useState(0);
  const [autoPublishSeconds, setAutoPublishSeconds] = useState<number | null>(null);
  const autoPublishTimerRef = useRef<number | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Products tab state
  const [prodSearch, setProdSearch] = useState('');
  const [prodCategoryFilter, setProdCategoryFilter] = useState('Tout');
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [savingProduct, setSavingProduct] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [productFormError, setProductFormError] = useState<string | null>(null);
  const [productForm, setProductForm] = useState<ProductFormState>({
    nameFr: '',
    nameAr: '',
    category: 'Niche',
    descFr: '',
    descAr: '',
    inStock: true,
    sizes: [{ id: 's1', label: '10 ml', price: 150, inStock: true }],
  });

  // Settings & Diagnostic tab state
  const [settingsForm, setSettingsForm] = useState<StoreSettings>(DEFAULT_STORE_SETTINGS);
  const [newCustomCategory, setNewCustomCategory] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);
  const [healthResult, setHealthResult] = useState<{
    ok: boolean;
    latencyMs: number;
    message: string;
  } | null>(null);
  const [selfTestRunning, setSelfTestRunning] = useState(false);
  const [selfTestResults, setSelfTestResults] = useState<DiagnosticStepResult[] | null>(null);
  const [selfTestError, setSelfTestError] = useState<string | null>(null);

  // Lockout countdown timer
  useEffect(() => {
    if (lockoutSecondsLeft <= 0) return;
    const t = window.setInterval(() => {
      setLockoutSecondsLeft((s) => {
        if (s <= 1) {
          setFailedAttempts(0);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => window.clearInterval(t);
  }, [lockoutSecondsLeft]);

  // Publish cooldown countdown
  useEffect(() => {
    if (publishCooldown <= 0) return;
    const t = window.setInterval(() => {
      setPublishCooldown((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => window.clearInterval(t);
  }, [publishCooldown]);

  // Auto-publish 2-minute countdown ticker
  useEffect(() => {
    if (autoPublishSeconds === null || autoPublishSeconds <= 0) return;
    const t = window.setInterval(() => {
      setAutoPublishSeconds((s) => (s !== null && s > 1 ? s - 1 : 0));
    }, 1000);
    return () => window.clearInterval(t);
  }, [autoPublishSeconds]);

  // Subscribe to Firebase Auth state dynamically
  useEffect(() => {
    let unsub: (() => void) | undefined;
    let mounted = true;

    (async () => {
      const [{ auth }, { onAuthStateChanged }] = await Promise.all([
        import('../services/firebase'),
        import('firebase/auth'),
      ]);
      if (!mounted) return;
      unsub = onAuthStateChanged(auth, (user) => {
        setUserEmail(user?.email ?? null);
        setAuthReady(true);
      });
    })();

    return () => {
      mounted = false;
      if (unsub) unsub();
    };
  }, []);

  // Subscribe to live Firestore collections ONLY while authenticated on #admin
  useEffect(() => {
    if (!userEmail) return;
    let unsubProducts: (() => void) | undefined;
    let unsubPacks: (() => void) | undefined;
    let unsubSettings: (() => void) | undefined;
    let active = true;

    (async () => {
      try {
        runFirestoreHealthCheck()
          .then((res) => {
            if (active) setHealthResult(res);
          })
          .catch(() => {});

        const [u1, u2, u3] = await Promise.all([
          subscribeAdminProducts(
            (items) => {
              if (active) setProducts(items);
            },
            (err) => {
              if (active) setListenerError(err.message);
            }
          ),
          subscribeAdminPacks(
            (items) => {
              if (active) setPacks(items);
            },
            (err) => {
              if (active) setListenerError(err.message);
            }
          ),
          subscribeAdminSettings(
            (st) => {
              if (active) {
                setSettings(st);
                setSettingsForm(st);
              }
            },
            (err) => {
              if (active) setListenerError(err.message);
            }
          ),
        ]);
        if (active) {
          unsubProducts = u1;
          unsubPacks = u2;
          unsubSettings = u3;
        } else {
          u1();
          u2();
          u3();
        }
      } catch (err) {
        if (active) {
          setListenerError(err instanceof Error ? err.message : 'Erreur Firestore.');
        }
      }
    })();

    return () => {
      active = false;
      if (unsubProducts) unsubProducts();
      if (unsubPacks) unsubPacks();
      if (unsubSettings) unsubSettings();
    };
  }, [userEmail]);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToastMessage(null), 3500);
  }, []);

  const triggerPublishRequest = useCallback(async (key: string) => {
    setPublishing(true);
    setPublishError(null);
    setPublishStatus(null);
    if (autoPublishTimerRef.current) {
      window.clearTimeout(autoPublishTimerRef.current);
      autoPublishTimerRef.current = null;
    }
    setAutoPublishSeconds(null);

    try {
      const res = await fetch('/api/publish', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-publish-key': key,
        },
      });
      const body = (await res.json().catch(() => ({}))) as {
        message?: string;
        error?: string;
        retryAfterSeconds?: number;
      };

      if (res.status === 429) {
        const waitSec = body.retryAfterSeconds || 120;
        setPublishCooldown(waitSec);
        setPublishError(body.error || `Patientez ${waitSec}s avant de republier.`);
        return;
      }

      if (res.status === 401) {
        try {
          window.sessionStorage.removeItem(PUBLISH_KEY_SESSION_STORAGE);
        } catch {}
        setPublishError(body.error || 'Clé de publication invalide.');
        setPublishModalOpen(true);
        return;
      }

      if (!res.ok) {
        setPublishError(body.error || `Erreur serveur (${res.status}).`);
        return;
      }

      setUnpublishedChanges(false);
      setPublishCooldown(120);
      setPublishStatus(body.message || 'Publication lancée. Visible sur le site dans 1 à 2 minutes.');
      setPublishModalOpen(false);
    } catch (err) {
      setPublishError(err instanceof Error ? err.message : 'Erreur réseau lors de la publication.');
    } finally {
      setPublishing(false);
    }
  }, []);

  const markMutated = useCallback(
    (message: string) => {
      setUnpublishedChanges(true);
      showToast(message);

      let storedKey = '';
      try {
        storedKey = window.sessionStorage.getItem(PUBLISH_KEY_SESSION_STORAGE) || '';
      } catch {}

      if (storedKey) {
        if (autoPublishTimerRef.current) window.clearTimeout(autoPublishTimerRef.current);
        setAutoPublishSeconds(120);
        autoPublishTimerRef.current = window.setTimeout(() => {
          triggerPublishRequest(storedKey);
        }, 120000);
      }
    },
    [showToast, triggerPublishRequest]
  );

  useEffect(() => {
    return () => {
      if (autoPublishTimerRef.current) window.clearTimeout(autoPublishTimerRef.current);
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    };
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockoutSecondsLeft > 0) return;

    setAuthError(null);
    setAuthLoading(true);
    try {
      const [{ auth }, { signInWithEmailAndPassword }] = await Promise.all([
        import('../services/firebase'),
        import('firebase/auth'),
      ]);
      await signInWithEmailAndPassword(auth, loginEmail.trim(), loginPassword);
      setFailedAttempts(0);
      setLoginPassword('');
    } catch {
      const nextFails = failedAttempts + 1;
      setFailedAttempts(nextFails);
      if (nextFails >= MAX_FAILED_ATTEMPTS) {
        setLockoutSecondsLeft(LOCKOUT_SECONDS);
        setAuthError(
          `Trop de tentatives échouées. Compte verrouillé pendant ${LOCKOUT_SECONDS} secondes.`
        );
      } else {
        setAuthError(
          `Identifiants invalides (${nextFails}/${MAX_FAILED_ATTEMPTS} tentatives).`
        );
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    const [{ auth }, { signOut }] = await Promise.all([
      import('../services/firebase'),
      import('firebase/auth'),
    ]);
    await signOut(auth);
  };

  const handlePublishClick = () => {
    let storedKey = '';
    try {
      storedKey = window.sessionStorage.getItem(PUBLISH_KEY_SESSION_STORAGE) || '';
    } catch {}
    if (storedKey) {
      triggerPublishRequest(storedKey);
    } else {
      setPublishKeyInput('');
      setPublishError(null);
      setPublishModalOpen(true);
    }
  };

  const handlePublishModalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const key = publishKeyInput.trim();
    if (!key) return;
    try {
      window.sessionStorage.setItem(PUBLISH_KEY_SESSION_STORAGE, key);
    } catch {}
    triggerPublishRequest(key);
  };

  // Product helpers
  const allCategories = useMemo(() => {
    const list: string[] = BASE_CATEGORIES.filter((c) => c !== 'Tout');
    for (const c of settings.customCategories || []) {
      if (c && !list.some((existing) => normalizeText(existing) === normalizeText(c))) {
        list.push(c);
      }
    }
    return list;
  }, [settings.customCategories]);

  const filteredProducts = useMemo(() => {
    const q = normalizeText(prodSearch);
    const cat = normalizeText(prodCategoryFilter);
    return products.filter((p) => {
      if (prodCategoryFilter !== 'Tout' && normalizeText(p.category) !== cat) return false;
      if (!q) return true;
      return normalizeText(`${p.name?.fr || ''} ${p.name?.ar || ''} ${p.category}`).includes(q);
    });
  }, [products, prodSearch, prodCategoryFilter]);

  const openCreateProduct = () => {
    setProductFormError(null);
    setProductForm({
      nameFr: '',
      nameAr: '',
      category: allCategories[0] || 'Niche',
      descFr: '',
      descAr: '',
      inStock: true,
      sizes: [
        { id: 's_5ml', label: '5 ml', price: 90, inStock: true },
        { id: 's_10ml', label: '10 ml', price: 160, inStock: true },
      ],
    });
    setProductModalOpen(true);
  };

  const openEditProduct = (p: Product) => {
    setProductFormError(null);
    setProductForm({
      id: p.id,
      nameFr: p.name?.fr || '',
      nameAr: p.name?.ar || '',
      category: p.category || 'Niche',
      descFr: p.description?.fr || '',
      descAr: p.description?.ar || '',
      inStock: p.inStock,
      sizes:
        p.sizes && p.sizes.length > 0
          ? p.sizes
          : [{ id: 'default', label: p.sizeLabel || 'Flacon complet', price: p.price, inStock: p.inStock }],
      imageUrl: p.imageUrl,
      imageData: p.imageData,
    });
    setProductModalOpen(true);
  };

  const handleProductImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProductFormError(null);
    setUploadingImage(true);
    try {
      const res = await uploadAdminImage(file, 'products', productForm.id || `prod_${Date.now()}`);
      setProductForm((prev) => ({
        ...prev,
        imageUrl: res.imageUrl,
        imageData: res.imageData,
      }));
    } catch (err) {
      setProductFormError(
        err instanceof Error ? err.message : "Erreur lors de la compression de l'image."
      );
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setProductFormError(null);

    if (!productForm.nameFr.trim()) {
      setProductFormError('Le nom en français est requis.');
      return;
    }
    if (productForm.sizes.length === 0) {
      setProductFormError('Ajoutez au moins un format ou décant.');
      return;
    }

    setSavingProduct(true);
    try {
      const basePrice = productForm.sizes[0]?.price ?? 0;
      await saveAdminProduct({
        id: productForm.id,
        name: { fr: productForm.nameFr.trim(), ar: productForm.nameAr.trim() },
        description: { fr: productForm.descFr.trim(), ar: productForm.descAr.trim() },
        category: productForm.category,
        price: basePrice,
        sizeLabel: productForm.sizes[0]?.label || 'Flacon complet',
        sizes: productForm.sizes,
        inStock: productForm.inStock,
        imageUrl: productForm.imageUrl,
        imageData: productForm.imageData,
      });
      setProductModalOpen(false);
      markMutated(
        productForm.id
          ? `Produit "${productForm.nameFr}" mis à jour.`
          : `Produit "${productForm.nameFr}" créé.`
      );
    } catch (err) {
      setProductFormError(
        err instanceof Error ? err.message : 'Erreur lors de la sauvegarde du produit.'
      );
    } finally {
      setSavingProduct(false);
    }
  };

  const handleConfirmDeleteProduct = async () => {
    if (!deleteTarget) return;
    setSavingProduct(true);
    try {
      await deleteAdminProduct(deleteTarget.id);
      const deletedName = deleteTarget.name?.fr || 'Produit';
      setDeleteTarget(null);
      markMutated(`Produit "${deletedName}" supprimé.`);
    } catch (err) {
      setListenerError(err instanceof Error ? err.message : 'Erreur lors de la suppression.');
    } finally {
      setSavingProduct(false);
    }
  };

  const handleSaveSettingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      await saveAdminSettings(settingsForm);
      markMutated('Paramètres enregistrés dans Firestore.');
    } catch (err) {
      setListenerError(err instanceof Error ? err.message : 'Erreur de sauvegarde paramètres.');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleRunSelfTest = async () => {
    if (!userEmail) return;
    setSelfTestRunning(true);
    setSelfTestError(null);
    setSelfTestResults(null);
    try {
      const results = await runFiveStepSelfTest(userEmail);
      setSelfTestResults(results);
    } catch (err) {
      setSelfTestError(err instanceof Error ? err.message : 'Échec du test Firestore.');
    } finally {
      setSelfTestRunning(false);
    }
  };

  // Loading auth
  if (!authReady) {
    return (
      <div className="min-h-screen bg-[#0B0A08] text-[#F6F1E7] flex items-center justify-center p-6">
        <div className="text-center">
          <BrandLogo sizeClass="w-20 h-20 mb-4" glow />
          <p className="text-xs uppercase tracking-[0.18em] text-[#E8D08C]">
            Initialisation Curateur...
          </p>
        </div>
      </div>
    );
  }

  // Login Gate
  if (!userEmail) {
    return (
      <div className="min-h-screen bg-[#0B0A08] text-[#F6F1E7] flex flex-col justify-between p-6">
        <div>
          <button
            type="button"
            onClick={onBackHome}
            className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-[#E8D08C] hover:text-white min-h-[44px]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Retour à la boutique</span>
          </button>
        </div>

        <div className="max-w-md w-full mx-auto bg-[#14120E] border border-[#C9A24D]/35 rounded-2xl p-8">
          <div className="flex flex-col items-center text-center mb-8">
            <BrandLogo sizeClass="w-20 h-20 mb-4 border border-[#C9A24D]/40" glow />
            <p className="text-[11px] uppercase tracking-[0.2em] text-[#C9A24D]">
              Accès Curateur
            </p>
            <h1 className="font-brand text-xl text-[#F6F1E7] mt-1">{STORE_IDENTITY.brand}</h1>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="admin-email" className="block text-xs uppercase tracking-[0.12em] text-[#E8D08C] mb-1.5">
                Email Administrateur
              </label>
              <input
                id="admin-email"
                type="email"
                required
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                disabled={lockoutSecondsLeft > 0}
                className="w-full min-h-[44px] px-3.5 bg-[#0B0A08] border border-[#C9A24D]/35 text-sm text-[#F6F1E7] focus:border-[#C9A24D] focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="admin-password" className="block text-xs uppercase tracking-[0.12em] text-[#E8D08C] mb-1.5">
                Mot de passe
              </label>
              <input
                id="admin-password"
                type="password"
                required
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                disabled={lockoutSecondsLeft > 0}
                placeholder="••••••••••••"
                className="w-full min-h-[44px] px-3.5 bg-[#0B0A08] border border-[#C9A24D]/35 text-sm text-[#F6F1E7] focus:border-[#C9A24D] focus:outline-none"
              />
            </div>

            {authError && (
              <div className="p-3 bg-red-950/60 border border-red-500/40 text-xs text-red-200">
                {authError}
              </div>
            )}

            {lockoutSecondsLeft > 0 && (
              <div className="p-3 bg-[#C9A24D]/15 border border-[#C9A24D]/40 text-xs text-[#E8D08C] text-center tabular-nums">
                Verrouillage de sécurité : {lockoutSecondsLeft}s restantes
              </div>
            )}

            <button
              type="submit"
              disabled={authLoading || lockoutSecondsLeft > 0}
              className="w-full min-h-[48px] bg-[#C9A24D] hover:bg-[#E8D08C] text-[#0B0A08] text-xs uppercase tracking-[0.16em] font-semibold transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2"
            >
              <Lock className="w-4 h-4" />
              <span>
                {lockoutSecondsLeft > 0
                  ? `Bloqué (${lockoutSecondsLeft}s)`
                  : authLoading
                  ? 'Vérification...'
                  : 'Se connecter'}
              </span>
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-[#8C857B]">
          Authentification sécurisée Firebase · {STORE_IDENTITY.adminEmail}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F1E7] text-[#0B0A08]">
      {/* Top Admin Header */}
      <header className="bg-[#0B0A08] text-[#F6F1E7] border-b border-[#C9A24D]/35 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <BrandLogo sizeClass="w-10 h-10" />
            <div>
              <p className="font-brand text-xs sm:text-sm text-[#E8D08C]">
                {STORE_IDENTITY.brand} · Curateur
              </p>
              <p className="text-[11px] text-[#8C857B]">{userEmail}</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handlePublishClick}
              disabled={publishing || publishCooldown > 0}
              className="px-4 py-2.5 bg-[#C9A24D] hover:bg-[#E8D08C] text-[#0B0A08] text-xs uppercase tracking-[0.12em] font-semibold inline-flex items-center gap-2 min-h-[42px] disabled:opacity-60 transition-colors"
            >
              <Rocket className="w-4 h-4" />
              <span>
                {publishing
                  ? 'Publication...'
                  : publishCooldown > 0
                  ? `Publier (${publishCooldown}s)`
                  : 'Publier les modifications'}
              </span>
            </button>

            <button
              type="button"
              onClick={onBackHome}
              className="px-3.5 py-2.5 border border-[#C9A24D]/40 text-xs uppercase tracking-[0.12em] text-[#E8D08C] hover:bg-[#C9A24D]/15 min-h-[42px]"
            >
              Boutique
            </button>

            <button
              type="button"
              onClick={handleLogout}
              aria-label="Se déconnecter"
              className="w-10 h-10 border border-[#C9A24D]/40 flex items-center justify-center text-[#F6F1E7] hover:text-[#C9A24D]"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Unpublished Changes / Publish Feedback Banner */}
        {(unpublishedChanges || publishStatus || publishError || autoPublishSeconds !== null) && (
          <div className="border-t border-[#C9A24D]/25 bg-[#15120D] px-4 py-2.5">
            <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2 text-xs">
              {unpublishedChanges && (
                <span className="inline-flex items-center gap-2 text-[#E8D08C]">
                  <AlertTriangle className="w-4 h-4 text-[#C9A24D]" />
                  <span>
                    Modifications non publiées
                    {autoPublishSeconds !== null && autoPublishSeconds > 0
                      ? ` · Publication automatique dans ${autoPublishSeconds}s`
                      : ''}
                  </span>
                </span>
              )}
              {publishStatus && (
                <span className="inline-flex items-center gap-2 text-[#25D366]">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{publishStatus}</span>
                </span>
              )}
              {publishError && (
                <span className="inline-flex items-center gap-2 text-red-400">
                  <AlertTriangle className="w-4 h-4" />
                  <span>{publishError}</span>
                </span>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-40 bg-[#0B0A08] text-[#E8D08C] border border-[#C9A24D] px-4 py-3 text-xs shadow-xl">
          {toastMessage}
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {listenerError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-xs text-red-800">
            Erreur Firestore : {listenerError}
          </div>
        )}

        {/* 3 Main Admin Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-[#DDD3BE] pb-4 mb-8">
          <button
            type="button"
            onClick={() => setActiveTab('products')}
            className={`px-5 py-2.5 text-xs uppercase tracking-[0.14em] inline-flex items-center gap-2 border min-h-[44px] transition-colors ${
              activeTab === 'products'
                ? 'bg-[#0B0A08] text-[#E8D08C] border-[#0B0A08]'
                : 'bg-[#FDFCFA] text-[#0B0A08] border-[#DDD3BE] hover:border-[#C9A24D]'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Produits ({products.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('packs')}
            className={`px-5 py-2.5 text-xs uppercase tracking-[0.14em] inline-flex items-center gap-2 border min-h-[44px] transition-colors ${
              activeTab === 'packs'
                ? 'bg-[#0B0A08] text-[#E8D08C] border-[#0B0A08]'
                : 'bg-[#FDFCFA] text-[#0B0A08] border-[#DDD3BE] hover:border-[#C9A24D]'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Packs ({packs.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`px-5 py-2.5 text-xs uppercase tracking-[0.14em] inline-flex items-center gap-2 border min-h-[44px] transition-colors ${
              activeTab === 'settings'
                ? 'bg-[#0B0A08] text-[#E8D08C] border-[#0B0A08]'
                : 'bg-[#FDFCFA] text-[#0B0A08] border-[#DDD3BE] hover:border-[#C9A24D]'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Paramètres &amp; Diagnostic</span>
          </button>
        </div>

        {/* TAB 1: PRODUITS */}
        {activeTab === 'products' && (
          <div>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div className="flex flex-col sm:flex-row gap-3 flex-1">
                <div className="relative flex-1 max-w-sm">
                  <Search className="w-4 h-4 text-[#8C857B] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="search"
                    value={prodSearch}
                    onChange={(e) => setProdSearch(e.target.value)}
                    placeholder="Filtrer par nom..."
                    className="w-full min-h-[44px] pl-9 pr-3 bg-[#FDFCFA] border border-[#DDD3BE] text-sm"
                  />
                </div>
                <select
                  value={prodCategoryFilter}
                  onChange={(e) => setProdCategoryFilter(e.target.value)}
                  className="min-h-[44px] px-3 bg-[#FDFCFA] border border-[#DDD3BE] text-xs uppercase tracking-[0.1em]"
                >
                  <option value="Tout">Toutes catégories</option>
                  {allCategories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={openCreateProduct}
                className="btn-primary-wipe px-5 py-2.5 text-xs uppercase tracking-[0.12em] inline-flex items-center justify-center gap-2 min-h-[44px]"
              >
                <Plus className="w-4 h-4" />
                <span>Nouveau Produit</span>
              </button>
            </div>

            {filteredProducts.length === 0 ? (
              <div className="bg-[#FDFCFA] border border-[#DDD3BE] p-12 text-center">
                <p className="font-display text-2xl text-[#0B0A08] mb-2">
                  Aucun produit enregistré
                </p>
                <p className="text-sm text-[#8C857B] mb-6">
                  Ajoutez votre premier parfum ou décant pour alimenter le catalogue.
                </p>
                <button
                  type="button"
                  onClick={openCreateProduct}
                  className="btn-secondary-invert px-6 py-2.5 text-xs uppercase tracking-[0.12em]"
                >
                  Ajouter un produit
                </button>
              </div>
            ) : (
              <div className="bg-[#FDFCFA] border border-[#DDD3BE] overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#DDD3BE] bg-[#F6F1E7] text-[11px] uppercase tracking-[0.14em] text-[#8F6E2E]">
                      <th className="py-3.5 px-4">Produit</th>
                      <th className="py-3.5 px-4">Catégorie</th>
                      <th className="py-3.5 px-4">Formats</th>
                      <th className="py-3.5 px-4">Prix dès</th>
                      <th className="py-3.5 px-4">Statut</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#DDD3BE] text-sm">
                    {filteredProducts.map((product) => {
                      const img = product.imageUrl || product.imageData;
                      const minPrice =
                        product.sizes && product.sizes.length > 0
                          ? Math.min(...product.sizes.map((s) => s.price))
                          : product.price;
                      return (
                        <tr key={product.id} className="hover:bg-[#F6F1E7]/50">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              {img ? (
                                <img
                                  src={img}
                                  alt={product.name?.fr}
                                  className="w-11 h-12 object-cover border border-[#DDD3BE] shrink-0"
                                />
                              ) : (
                                <div className="w-11 h-12 bg-[#EAE4DC] border border-[#DDD3BE] flex items-center justify-center text-xs text-[#8F6E2E] shrink-0">
                                  ◆
                                </div>
                              )}
                              <div>
                                <p className="font-medium text-[#0B0A08]">{product.name?.fr}</p>
                                {product.name?.ar && (
                                  <p className="text-xs text-[#8C857B]" dir="rtl">
                                    {product.name.ar}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-xs uppercase tracking-[0.08em] text-[#8C857B]">
                            {product.category}
                          </td>
                          <td className="py-3 px-4 text-xs text-[#0B0A08]/80">
                            {product.sizes?.map((s) => s.label).join(' · ') || product.sizeLabel}
                          </td>
                          <td className="py-3 px-4 font-semibold tabular-nums">
                            {formatMAD(minPrice)}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] uppercase tracking-[0.12em] font-semibold ${
                                product.inStock
                                  ? 'bg-[#EAE4DC] text-[#0B0A08]'
                                  : 'bg-[#0B0A08] text-[#C9A24D]'
                              }`}
                            >
                              {product.inStock ? 'En stock' : 'Épuisé'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => openEditProduct(product)}
                                aria-label={`Modifier ${product.name?.fr}`}
                                className="w-9 h-9 border border-[#DDD3BE] hover:border-[#C9A24D] inline-flex items-center justify-center"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteTarget(product)}
                                aria-label={`Supprimer ${product.name?.fr}`}
                                className="w-9 h-9 border border-[#DDD3BE] hover:border-red-600 text-red-700 inline-flex items-center justify-center"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: PACKS */}
        {activeTab === 'packs' && <PacksAdminSection packs={packs} onMutated={markMutated} />}

        {/* TAB 3: PARAMÈTRES & DIAGNOSTIC */}
        {activeTab === 'settings' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <form
              onSubmit={handleSaveSettingsSubmit}
              className="lg:col-span-7 bg-[#FDFCFA] border border-[#DDD3BE] p-6 sm:p-8 space-y-5"
            >
              <h2 className="font-display text-2xl font-semibold text-[#0B0A08] pb-3 border-b border-[#DDD3BE]">
                Paramètres de la Boutique
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium mb-1.5">Numéro WhatsApp</label>
                  <input
                    type="text"
                    value={settingsForm.whatsappNumber}
                    onChange={(e) =>
                      setSettingsForm((s) => ({ ...s, whatsappNumber: e.target.value }))
                    }
                    placeholder="212610640666"
                    className="w-full min-h-[44px] px-3.5 bg-[#FDFCFA] border border-[#DDD3BE] text-sm tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5">Nom de la boutique</label>
                  <input
                    type="text"
                    value={settingsForm.storeName}
                    onChange={(e) =>
                      setSettingsForm((s) => ({ ...s, storeName: e.target.value }))
                    }
                    className="w-full min-h-[44px] px-3.5 bg-[#FDFCFA] border border-[#DDD3BE] text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5">
                  Bandeau d&apos;annonce (FR)
                </label>
                <input
                  type="text"
                  value={settingsForm.announcementFr}
                  onChange={(e) =>
                    setSettingsForm((s) => ({ ...s, announcementFr: e.target.value }))
                  }
                  className="w-full min-h-[44px] px-3.5 bg-[#FDFCFA] border border-[#DDD3BE] text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5">Catégories personnalisées</label>
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={newCustomCategory}
                    onChange={(e) => setNewCustomCategory(e.target.value)}
                    placeholder="Ex. Oud Rare, Extrait..."
                    className="flex-1 min-h-[44px] px-3.5 bg-[#FDFCFA] border border-[#DDD3BE] text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const val = newCustomCategory.trim();
                      if (!val) return;
                      if (!settingsForm.customCategories.includes(val)) {
                        setSettingsForm((s) => ({
                          ...s,
                          customCategories: [...s.customCategories, val],
                        }));
                      }
                      setNewCustomCategory('');
                    }}
                    className="px-4 min-h-[44px] border border-[#0B0A08] text-xs uppercase tracking-[0.12em] hover:bg-[#0B0A08] hover:text-[#F6F1E7]"
                  >
                    Ajouter
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {settingsForm.customCategories.map((cat) => (
                    <span
                      key={cat}
                      className="inline-flex items-center gap-2 px-3 py-1 bg-[#F6F1E7] border border-[#DDD3BE] text-xs"
                    >
                      <span>{cat}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setSettingsForm((s) => ({
                            ...s,
                            customCategories: s.customCategories.filter((c) => c !== cat),
                          }))
                        }
                        aria-label={`Retirer ${cat}`}
                        className="text-[#8C857B] hover:text-red-700"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={savingSettings}
                className="btn-primary-wipe px-6 py-3 text-xs uppercase tracking-[0.14em] min-h-[44px]"
              >
                {savingSettings ? 'Enregistrement...' : 'Enregistrer les paramètres'}
              </button>
            </form>

            {/* Diagnostic Panel */}
            <div className="lg:col-span-5 bg-[#FDFCFA] border border-[#DDD3BE] p-6 sm:p-8 flex flex-col justify-between gap-6">
              <div>
                <h2 className="font-display text-2xl font-semibold text-[#0B0A08] pb-3 border-b border-[#DDD3BE] flex items-center gap-2">
                  <Activity className="w-5 h-5 text-[#8F6E2E]" />
                  <span>Diagnostic Firestore</span>
                </h2>

                <div className="mt-5 p-4 bg-[#F6F1E7] border border-[#DDD3BE]">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-[#8F6E2E] mb-1">
                    État de connexion au démarrage
                  </p>
                  {healthResult ? (
                    <p
                      className={`text-sm font-medium ${
                        healthResult.ok ? 'text-[#0B0A08]' : 'text-red-700'
                      }`}
                    >
                      {healthResult.message}
                    </p>
                  ) : (
                    <p className="text-sm text-[#8C857B]">Vérification en cours...</p>
                  )}
                </div>

                <div className="mt-6">
                  <p className="text-xs uppercase tracking-[0.12em] text-[#8C857B] mb-3">
                    Auto-test complet (5 étapes sur _health)
                  </p>
                  <button
                    type="button"
                    disabled={selfTestRunning}
                    onClick={handleRunSelfTest}
                    className="btn-secondary-invert w-full min-h-[44px] text-xs uppercase tracking-[0.14em]"
                  >
                    {selfTestRunning
                      ? 'Exécution du test...'
                      : 'Lancer le test CREATE → READ → UPDATE → DELETE → CONFIRM GONE'}
                  </button>

                  {selfTestError && (
                    <div className="mt-3 p-3 bg-red-50 border border-red-200 text-xs text-red-700">
                      {selfTestError}
                    </div>
                  )}

                  {selfTestResults && (
                    <ul className="mt-4 space-y-2">
                      {selfTestResults.map((step) => (
                        <li
                          key={step.step}
                          className="p-2.5 border border-[#DDD3BE] bg-[#F6F1E7] flex items-center justify-between text-xs"
                        >
                          <span className="font-mono font-semibold">{step.step}</span>
                          <span className={step.ok ? 'text-emerald-800' : 'text-red-700'}>
                            {step.ok ? 'OK' : 'ÉCHEC'} · {step.detail}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-[#DDD3BE]">
                <button
                  type="button"
                  onClick={() => setPublishModalOpen(true)}
                  className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.12em] text-[#8F6E2E] hover:text-[#0B0A08]"
                >
                  <KeyRound className="w-4 h-4" />
                  <span>Configurer la clé de publication (session)</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Product Create / Edit Modal */}
      {productModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-[#0B0A08]/80 flex items-center justify-center p-4"
        >
          <div className="bg-[#FDFCFA] border border-[#DDD3BE] rounded-2xl w-full max-w-2xl max-h-[92dvh] overflow-y-auto p-6">
            <div className="flex items-center justify-between pb-4 border-b border-[#DDD3BE]">
              <h3 className="font-display text-2xl font-semibold">
                {productForm.id ? 'Modifier le Produit' : 'Nouveau Produit'}
              </h3>
              <button
                type="button"
                onClick={() => setProductModalOpen(false)}
                className="w-9 h-9 rounded-full border border-[#DDD3BE] flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="mt-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">Nom (FR) *</label>
                  <input
                    type="text"
                    required
                    value={productForm.nameFr}
                    onChange={(e) => setProductForm((f) => ({ ...f, nameFr: e.target.value }))}
                    className="w-full min-h-[44px] px-3 bg-[#FDFCFA] border border-[#DDD3BE] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Nom (AR)</label>
                  <input
                    type="text"
                    dir="rtl"
                    value={productForm.nameAr}
                    onChange={(e) => setProductForm((f) => ({ ...f, nameAr: e.target.value }))}
                    className="w-full min-h-[44px] px-3 bg-[#FDFCFA] border border-[#DDD3BE] text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                <div>
                  <label className="block text-xs font-medium mb-1">Catégorie *</label>
                  <select
                    value={productForm.category}
                    onChange={(e) => setProductForm((f) => ({ ...f, category: e.target.value }))}
                    className="w-full min-h-[44px] px-3 bg-[#FDFCFA] border border-[#DDD3BE] text-sm"
                  >
                    {allCategories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <label className="flex items-center gap-2.5 min-h-[44px] px-3 border border-[#DDD3BE] bg-[#F6F1E7] cursor-pointer text-xs font-medium">
                  <input
                    type="checkbox"
                    checked={productForm.inStock}
                    onChange={(e) => setProductForm((f) => ({ ...f, inStock: e.target.checked }))}
                    className="accent-[#0B0A08] w-4 h-4"
                  />
                  <span>Produit disponible en stock</span>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">Description (FR)</label>
                  <textarea
                    rows={3}
                    value={productForm.descFr}
                    onChange={(e) => setProductForm((f) => ({ ...f, descFr: e.target.value }))}
                    className="w-full p-3 bg-[#FDFCFA] border border-[#DDD3BE] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Description (AR)</label>
                  <textarea
                    rows={3}
                    dir="rtl"
                    value={productForm.descAr}
                    onChange={(e) => setProductForm((f) => ({ ...f, descAr: e.target.value }))}
                    className="w-full p-3 bg-[#FDFCFA] border border-[#DDD3BE] text-sm"
                  />
                </div>
              </div>

              {/* Dynamic Multi-Size / Decant Rows */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium">Formats &amp; Décants *</label>
                  <button
                    type="button"
                    onClick={() =>
                      setProductForm((f) => ({
                        ...f,
                        sizes: [
                          ...f.sizes,
                          {
                            id: `s_${Date.now()}`,
                            label: 'Flacon complet',
                            price: 900,
                            inStock: true,
                          },
                        ],
                      }))
                    }
                    className="text-xs uppercase tracking-[0.1em] text-[#8F6E2E] hover:text-[#0B0A08]"
                  >
                    + Ajouter un format
                  </button>
                </div>

                <div className="space-y-2">
                  {productForm.sizes.map((size, idx) => (
                    <div
                      key={size.id}
                      className="grid grid-cols-12 gap-2 items-center bg-[#F6F1E7] p-2.5 border border-[#DDD3BE]"
                    >
                      <input
                        type="text"
                        required
                        value={size.label}
                        onChange={(e) => {
                          const val = e.target.value;
                          setProductForm((f) => ({
                            ...f,
                            sizes: f.sizes.map((s, i) => (i === idx ? { ...s, label: val } : s)),
                          }));
                        }}
                        placeholder="Ex. 10 ml"
                        className="col-span-5 min-h-[38px] px-2.5 bg-[#FDFCFA] border border-[#DDD3BE] text-xs"
                      />
                      <input
                        type="number"
                        min="0"
                        required
                        value={size.price}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setProductForm((f) => ({
                            ...f,
                            sizes: f.sizes.map((s, i) => (i === idx ? { ...s, price: val } : s)),
                          }));
                        }}
                        placeholder="Prix DH"
                        className="col-span-3 min-h-[38px] px-2.5 bg-[#FDFCFA] border border-[#DDD3BE] text-xs tabular-nums"
                      />
                      <label className="col-span-3 flex items-center gap-1.5 text-[11px] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={size.inStock}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setProductForm((f) => ({
                              ...f,
                              sizes: f.sizes.map((s, i) =>
                                i === idx ? { ...s, inStock: checked } : s
                              ),
                            }));
                          }}
                          className="accent-[#0B0A08]"
                        />
                        <span>Stock</span>
                      </label>
                      <button
                        type="button"
                        disabled={productForm.sizes.length <= 1}
                        onClick={() =>
                          setProductForm((f) => ({
                            ...f,
                            sizes: f.sizes.filter((_, i) => i !== idx),
                          }))
                        }
                        aria-label="Retirer ce format"
                        className="col-span-1 flex items-center justify-center text-[#8C857B] hover:text-red-700 disabled:opacity-30"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Image Upload */}
              <div>
                <label className="block text-xs font-medium mb-1.5">Photo du Produit</label>
                <div className="flex items-center gap-4">
                  <label className="inline-flex items-center gap-2 px-4 py-2.5 border border-[#0B0A08] text-xs uppercase tracking-[0.12em] cursor-pointer hover:bg-[#0B0A08] hover:text-[#F6F1E7] transition-colors">
                    <Upload className="w-4 h-4" />
                    <span>{uploadingImage ? 'Compression...' : 'Importer une photo'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleProductImageChange}
                      disabled={uploadingImage}
                      className="hidden"
                    />
                  </label>
                  {(productForm.imageUrl || productForm.imageData) && (
                    <img
                      src={productForm.imageUrl || productForm.imageData}
                      alt="Aperçu produit"
                      className="w-14 h-16 object-cover border border-[#DDD3BE]"
                    />
                  )}
                </div>
              </div>

              {productFormError && (
                <p className="text-xs text-red-700 bg-red-50 border border-red-200 p-3">
                  {productFormError}
                </p>
              )}

              <div className="pt-4 border-t border-[#DDD3BE] flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setProductModalOpen(false)}
                  className="px-5 py-2.5 border border-[#DDD3BE] text-xs uppercase tracking-[0.12em]"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={savingProduct || uploadingImage}
                  className="btn-primary-wipe px-6 py-2.5 text-xs uppercase tracking-[0.12em] disabled:opacity-50"
                >
                  {savingProduct ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Product Confirmation Modal */}
      {deleteTarget && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-[#0B0A08]/80 flex items-center justify-center p-4"
        >
          <div className="bg-[#FDFCFA] border border-[#DDD3BE] rounded-2xl w-full max-w-md p-6">
            <h3 className="font-display text-xl font-semibold mb-2">Supprimer ce produit ?</h3>
            <p className="text-sm text-[#8C857B] mb-6">
              Confirmez-vous la suppression définitive de « {deleteTarget.name?.fr} » ?
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 border border-[#DDD3BE] text-xs uppercase tracking-[0.12em]"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={savingProduct}
                onClick={handleConfirmDeleteProduct}
                className="px-5 py-2 bg-red-700 text-white text-xs uppercase tracking-[0.12em]"
              >
                {savingProduct ? 'Suppression...' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Publish Key Prompt Modal */}
      {publishModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-[#0B0A08]/80 flex items-center justify-center p-4"
        >
          <div className="bg-[#FDFCFA] border border-[#DDD3BE] rounded-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between pb-3 border-b border-[#DDD3BE]">
              <h3 className="font-display text-xl font-semibold">Clé de Publication</h3>
              <button
                type="button"
                onClick={() => setPublishModalOpen(false)}
                className="w-8 h-8 rounded-full border border-[#DDD3BE] flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handlePublishModalSubmit} className="mt-4 space-y-4">
              <p className="text-xs text-[#8C857B] leading-relaxed">
                Saisissez votre clé <code>PUBLISH_KEY</code> pour déclencher la reconstruction
                statique du catalogue. Elle sera mémorisée uniquement pour cette session.
              </p>
              <input
                type="password"
                required
                value={publishKeyInput}
                onChange={(e) => setPublishKeyInput(e.target.value)}
                placeholder="Clé de publication"
                className="w-full min-h-[44px] px-3.5 bg-[#FDFCFA] border border-[#DDD3BE] text-sm"
              />
              {publishError && (
                <p className="text-xs text-red-700 bg-red-50 border border-red-200 p-2.5">
                  {publishError}
                </p>
              )}
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setPublishModalOpen(false)}
                  className="px-4 py-2 border border-[#DDD3BE] text-xs uppercase tracking-[0.12em]"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={publishing}
                  className="btn-primary-wipe px-5 py-2 text-xs uppercase tracking-[0.12em]"
                >
                  {publishing ? 'Envoi...' : 'Publier maintenant'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
