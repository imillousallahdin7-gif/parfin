import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  Edit2,
  Lock,
  LogOut,
  Package,
  Plus,
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

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 60;

interface ProductFormState {
  id?: string;
  nameFr: string;
  category: string;
  descFr: string;
  inStock: boolean;
  sizes: ProductSize[];
  imageUrl?: string;
  imageData?: string;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onBackHome }) => {
  // Auth state
  const [authReady, setAuthReady] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [loginPassword, setLoginPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authHelpUrl, setAuthHelpUrl] = useState<string | null>(null);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutSecondsLeft, setLockoutSecondsLeft] = useState(0);

  // Admin navigation & live Firestore data
  const [activeTab, setActiveTab] = useState<'products' | 'packs' | 'settings'>('products');
  const [products, setProducts] = useState<Product[]>([]);
  const [packs, setPacks] = useState<Pack[]>([]);
  const [settings, setSettings] = useState<StoreSettings>(DEFAULT_STORE_SETTINGS);
  const [listenerError, setListenerError] = useState<string | null>(null);

  // Feedback toast state
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
    category: 'Niche',
    descFr: '',
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
          setListenerError(
            err instanceof Error ? err.message : 'حدث خطأ أثناء الاتصال بقاعدة البيانات.'
          );
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

  const markMutated = useCallback(
    (message: string) => {
      showToast(message);
    },
    [showToast]
  );

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    };
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockoutSecondsLeft > 0) return;

    setAuthError(null);
    setAuthHelpUrl(null);
    setAuthLoading(true);
    try {
      const [{ auth, firebaseProjectId }, { signInWithEmailAndPassword }] = await Promise.all([
        import('../services/firebase'),
        import('firebase/auth'),
      ]);
      try {
        await signInWithEmailAndPassword(auth, STORE_IDENTITY.adminEmail, loginPassword);
        setFailedAttempts(0);
        setLoginPassword('');
      } catch (err: unknown) {
        const code =
          typeof err === 'object' && err !== null && 'code' in err
            ? String((err as { code?: unknown }).code || '')
            : '';

        if (code === 'auth/operation-not-allowed') {
          setAuthHelpUrl(
            `https://console.firebase.google.com/project/${firebaseProjectId}/authentication/providers`
          );
          setAuthError(
            'تسجيل الدخول بالبريد وكلمة المرور غير مفعّل بعد في Firebase (Authentication → Sign-in method). فعّله وأنشئ الحساب، أو استخدم «الدخول السريع عبر Google» بالأسفل.'
          );
          return;
        }

        if (code === 'auth/too-many-requests') {
          setLockoutSecondsLeft(LOCKOUT_SECONDS);
          setAuthError(
            `محاولات كثيرة جداً لدى Firebase. يرجى الانتظار ${LOCKOUT_SECONDS} ثانية.`
          );
          return;
        }

        const nextFails = failedAttempts + 1;
        setFailedAttempts(nextFails);
        if (nextFails >= MAX_FAILED_ATTEMPTS) {
          setLockoutSecondsLeft(LOCKOUT_SECONDS);
          setAuthError(
            `عدد المحاولات الخاطئة تجاوز الحد. تم قفل الدخول لمدة ${LOCKOUT_SECONDS} ثانية.`
          );
        } else {
          setAuthHelpUrl(
            `https://console.firebase.google.com/project/${firebaseProjectId}/authentication/users`
          );
          setAuthError(
            `كلمة المرور غير صحيحة أو الحساب غير مضاف في Firebase Auth (${nextFails}/${MAX_FAILED_ATTEMPTS} محاولات).`
          );
        }
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (lockoutSecondsLeft > 0) return;
    setAuthError(null);
    setAuthHelpUrl(null);
    setAuthLoading(true);
    try {
      const [{ auth }, { GoogleAuthProvider, signInWithPopup }] = await Promise.all([
        import('../services/firebase'),
        import('firebase/auth'),
      ]);
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      setFailedAttempts(0);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'حدث خطأ أثناء تسجيل الدخول عبر Google.';
      setAuthError(msg);
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
      return normalizeText(
        `${p.name?.fr || ''} ${p.description?.fr || ''} ${p.category}`
      ).includes(q);
    });
  }, [products, prodSearch, prodCategoryFilter]);

  const openCreateProduct = () => {
    setProductFormError(null);
    setProductForm({
      nameFr: '',
      category: allCategories[0] || 'Niche',
      descFr: '',
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
      category: p.category || 'Niche',
      descFr: p.description?.fr || '',
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
    e.target.value = '';
    if (!file) return;
    setProductFormError(null);
    setUploadingImage(true);
    try {
      const res = await uploadAdminImage(file, 'products', productForm.id || `prod_${Date.now()}`);
      setProductForm((prev) => ({
        ...prev,
        imageUrl: res.imageUrl ?? '',
        imageData: res.imageData,
      }));
    } catch (err) {
      setProductFormError(
        err instanceof Error ? err.message : 'حدث خطأ أثناء معالجة الصورة.'
      );
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setProductFormError(null);

    if (!productForm.nameFr.trim()) {
      setProductFormError('يرجى إدخال اسم المنتج باللغة الفرنسية.');
      return;
    }
    if (productForm.sizes.length === 0) {
      setProductFormError('يرجى إضافة حجم أو سعة واحدة على الأقل.');
      return;
    }

    setSavingProduct(true);
    try {
      const basePrice = productForm.sizes[0]?.price ?? 0;
      await saveAdminProduct({
        id: productForm.id,
        name: { fr: productForm.nameFr.trim(), ar: '' },
        description: { fr: productForm.descFr.trim(), ar: '' },
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
          ? `تم حفظ وتحديث المنتج "${productForm.nameFr}" مباشرة في المتجر.`
          : `تم حفظ المنتج "${productForm.nameFr}" ونشره مباشرة في المتجر.`
      );
    } catch (err) {
      setProductFormError(
        err instanceof Error ? err.message : 'حدث خطأ أثناء حفظ المنتج.'
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
      const deletedName = deleteTarget.name?.fr || 'المنتج';
      setDeleteTarget(null);
      markMutated(`تم حذف المنتج "${deletedName}".`);
    } catch (err) {
      setListenerError(err instanceof Error ? err.message : 'حدث خطأ أثناء الحذف.');
    } finally {
      setSavingProduct(false);
    }
  };

  const handleSaveSettingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      await saveAdminSettings(settingsForm);
      markMutated('تم حفظ الإعدادات بنجاح في قاعدة البيانات.');
    } catch (err) {
      setListenerError(err instanceof Error ? err.message : 'حدث خطأ أثناء حفظ الإعدادات.');
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
      setSelfTestError(err instanceof Error ? err.message : 'فشل اختبار قاعدة البيانات.');
    } finally {
      setSelfTestRunning(false);
    }
  };

  // Loading auth
  if (!authReady) {
    return (
      <div
        dir="rtl"
        className="min-h-screen bg-[#0B0A08] text-[#F6F1E7] flex items-center justify-center p-6"
      >
        <div className="text-center">
          <BrandLogo sizeClass="w-20 h-20 mb-4" glow />
          <p className="text-xs text-[#E8D08C]">جاري تهيئة لوحة التحكم...</p>
        </div>
      </div>
    );
  }

  // Login Gate
  if (!userEmail) {
    return (
      <div
        dir="rtl"
        className="min-h-screen bg-[#0A0A0A] text-[#FAF8F5] flex flex-col justify-between p-6"
      >
        <div>
          <button
            type="button"
            onClick={onBackHome}
            className="inline-flex items-center gap-2 px-3 rounded-xl text-xs text-[#DFC48B] hover:text-white hover:bg-white/5 active:scale-95 transition-all min-h-[44px]"
          >
            <ArrowRight className="w-4 h-4" />
            <span>العودة إلى المتجر</span>
          </button>
        </div>

        <div className="max-w-md w-full mx-auto bg-[#141311] border border-[#C5A059]/35 rounded-2xl p-8">
          <div className="flex flex-col items-center text-center mb-8">
            <BrandLogo sizeClass="w-20 h-20 mb-4 border border-[#C5A059]/40" glow />
            <p className="text-xs text-[#C5A059]">دخول الإدارة</p>
            <h1 className="font-brand text-xl text-[#FAF8F5] mt-1" dir="ltr">
              {STORE_IDENTITY.brand}
            </h1>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="admin-password" className="block text-xs text-[#DFC48B] mb-1.5">
                كلمة المرور
              </label>
              <input
                id="admin-password"
                type="password"
                dir="ltr"
                required
                autoFocus
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                disabled={lockoutSecondsLeft > 0}
                placeholder="••••••••••••"
                className="w-full min-h-[44px] px-3.5 bg-[#0A0A0A] border border-[#C5A059]/35 text-sm text-[#FAF8F5] focus:border-[#C5A059] focus:outline-none"
              />
            </div>

            {authError && (
              <div className="p-3 bg-red-950/60 border border-red-500/40 text-xs text-red-200 space-y-2 leading-relaxed">
                <p>{authError}</p>
                {authHelpUrl && (
                  <a
                    href={authHelpUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block underline text-[#E8D08C] hover:text-white"
                  >
                    فتح إعدادات Firebase Authentication ←
                  </a>
                )}
              </div>
            )}

            {lockoutSecondsLeft > 0 && (
              <div className="p-3 bg-[#C5A059]/15 border border-[#C5A059]/40 text-xs text-[#DFC48B] text-center tabular-nums">
                حظر أمني مؤقت: متبقي {lockoutSecondsLeft} ثانية
              </div>
            )}

            <button
              type="submit"
              disabled={authLoading || lockoutSecondsLeft > 0}
              className="btn-gold-luminous w-full min-h-[48px] text-xs font-semibold disabled:opacity-50 inline-flex items-center justify-center gap-2"
            >
              <Lock className="w-4 h-4" />
              <span>
                {lockoutSecondsLeft > 0
                  ? `محظور (${lockoutSecondsLeft} ث)`
                  : authLoading
                  ? 'جاري التحقق...'
                  : 'تسجيل الدخول'}
              </span>
            </button>
          </form>

          <div className="my-5 flex items-center gap-3 text-xs text-[#A8A29A]">
            <span className="h-px flex-1 bg-[#C5A059]/25" />
            <span>أو</span>
            <span className="h-px flex-1 bg-[#C5A059]/25" />
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={authLoading || lockoutSecondsLeft > 0}
            className="btn-outline-luminous w-full min-h-[46px] text-xs font-medium disabled:opacity-50"
          >
            الدخول السريع عبر Google
          </button>
        </div>

        <p className="text-center text-xs text-[#A8A29A]">
          حماية ومصادقة آمنة عبر Firebase
        </p>
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen bg-[#F6F1E7] text-[#0B0A08]">
      {/* Top Admin Header */}
      <header className="bg-[#0B0A08] text-[#F6F1E7] border-b border-[#C9A24D]/35 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <BrandLogo sizeClass="w-10 h-10" />
            <div>
              <p className="font-brand text-xs sm:text-sm text-[#E8D08C]">
                <span dir="ltr">{STORE_IDENTITY.brand}</span> · لوحة الإدارة
              </p>
              <p className="text-[11px] text-[#8C857B]" dir="ltr">
                {userEmail}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 border border-[#25D366]/40 bg-[#25D366]/10 text-[#25D366] text-xs">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>مباشر · متزامن</span>
            </span>

            <button
              type="button"
              onClick={onBackHome}
              className="btn-outline-luminous px-4 py-2 text-xs min-h-[42px] inline-flex items-center justify-center"
            >
              عرض المتجر
            </button>

            <button
              type="button"
              onClick={handleLogout}
              aria-label="تسجيل الخروج"
              title="تسجيل الخروج"
              className="btn-outline-luminous w-10 h-10 flex items-center justify-center"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-5 left-5 z-40 bg-[#0B0A08] text-[#E8D08C] border border-[#C9A24D] px-4 py-3 text-xs shadow-xl">
          {toastMessage}
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {listenerError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-xs text-red-800">
            خطأ في قاعدة البيانات: {listenerError}
          </div>
        )}

        {/* 3 Main Admin Tabs */}
        <div className="flex flex-wrap items-center gap-2.5 border-b border-[#DDD3BE] pb-4 mb-8">
          <button
            type="button"
            onClick={() => setActiveTab('products')}
            className={`px-5 py-2.5 rounded-xl text-xs font-medium inline-flex items-center gap-2 border min-h-[44px] transition-all duration-200 active:scale-95 ${
              activeTab === 'products'
                ? 'bg-gradient-to-br from-[#1E1B16] to-[#0B0A08] text-[#E8D08C] border-[#C5A059] shadow-[0_8px_20px_-6px_rgba(197,160,89,0.5)]'
                : 'bg-[#FDFCFA] text-[#0B0A08] border-[#DDD3BE] hover:border-[#C9A24D] hover:shadow-sm'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>المنتجات ({products.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('packs')}
            className={`px-5 py-2.5 rounded-xl text-xs font-medium inline-flex items-center gap-2 border min-h-[44px] transition-all duration-200 active:scale-95 ${
              activeTab === 'packs'
                ? 'bg-gradient-to-br from-[#1E1B16] to-[#0B0A08] text-[#E8D08C] border-[#C5A059] shadow-[0_8px_20px_-6px_rgba(197,160,89,0.5)]'
                : 'bg-[#FDFCFA] text-[#0B0A08] border-[#DDD3BE] hover:border-[#C9A24D] hover:shadow-sm'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>الباقات ({packs.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`px-5 py-2.5 rounded-xl text-xs font-medium inline-flex items-center gap-2 border min-h-[44px] transition-all duration-200 active:scale-95 ${
              activeTab === 'settings'
                ? 'bg-gradient-to-br from-[#1E1B16] to-[#0B0A08] text-[#E8D08C] border-[#C5A059] shadow-[0_8px_20px_-6px_rgba(197,160,89,0.5)]'
                : 'bg-[#FDFCFA] text-[#0B0A08] border-[#DDD3BE] hover:border-[#C9A24D] hover:shadow-sm'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>الإعدادات والفحص</span>
          </button>
        </div>

        {/* TAB 1: المنتجات */}
        {activeTab === 'products' && (
          <div>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div className="flex flex-col sm:flex-row gap-3 flex-1">
                <div className="relative flex-1 max-w-sm">
                  <Search className="w-4 h-4 text-[#8C857B] absolute right-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="search"
                    value={prodSearch}
                    onChange={(e) => setProdSearch(e.target.value)}
                    placeholder="ابحث بالاسم..."
                    className="w-full min-h-[44px] pr-9 pl-3 bg-[#FDFCFA] border border-[#DDD3BE] text-sm"
                  />
                </div>
                <select
                  value={prodCategoryFilter}
                  onChange={(e) => setProdCategoryFilter(e.target.value)}
                  className="min-h-[44px] px-3 bg-[#FDFCFA] border border-[#DDD3BE] text-xs"
                >
                  <option value="Tout">جميع التصنيفات</option>
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
                className="btn-primary-wipe px-5 py-2.5 text-xs font-medium inline-flex items-center justify-center gap-2 min-h-[44px]"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة منتج جديد</span>
              </button>
            </div>

            {filteredProducts.length === 0 ? (
              <div className="bg-[#FDFCFA] border border-[#DDD3BE] p-12 text-center">
                <p className="font-display text-2xl text-[#0B0A08] mb-2">
                  لا توجد منتجات مسجلة بعد
                </p>
                <p className="text-sm text-[#8C857B] mb-6">
                  أضف أول عطر أو تقسيم لعرضه في المتجر مباشرة.
                </p>
                <button
                  type="button"
                  onClick={openCreateProduct}
                  className="btn-secondary-invert px-6 py-2.5 text-xs font-medium"
                >
                  إضافة منتج
                </button>
              </div>
            ) : (
              <div className="bg-[#FDFCFA] border border-[#DDD3BE] overflow-x-auto">
                <table className="w-full text-right border-collapse">
                  <thead>
                    <tr className="border-b border-[#DDD3BE] bg-[#F6F1E7] text-xs text-[#8F6E2E]">
                      <th className="py-3.5 px-4">المنتج</th>
                      <th className="py-3.5 px-4">التصنيف</th>
                      <th className="py-3.5 px-4">الأحجام</th>
                      <th className="py-3.5 px-4">السعر ابتداءً من</th>
                      <th className="py-3.5 px-4">الحالة</th>
                      <th className="py-3.5 px-4 text-left">الإجراءات</th>
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
                                <p className="font-medium text-[#0B0A08]" dir="ltr">
                                  {product.name?.fr}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-xs text-[#8C857B]" dir="ltr">
                            {product.category}
                          </td>
                          <td className="py-3 px-4 text-xs text-[#0B0A08]/80" dir="ltr">
                            {product.sizes?.map((s) => s.label).join(' · ') || product.sizeLabel}
                          </td>
                          <td className="py-3 px-4 font-semibold tabular-nums" dir="ltr">
                            {formatMAD(minPrice)}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                                product.inStock
                                  ? 'bg-[#EAE4DC] text-[#0B0A08]'
                                  : 'bg-[#0B0A08] text-[#C9A24D]'
                              }`}
                            >
                              {product.inStock ? 'متوفر' : 'نفد المخزون'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-left">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => openEditProduct(product)}
                                aria-label={`تعديل ${product.name?.fr}`}
                                title="تعديل"
                                className="w-9 h-9 rounded-xl border border-[#DDD3BE] bg-white hover:border-[#C9A24D] hover:bg-[#FAF8F5] hover:shadow-sm active:scale-95 transition-all inline-flex items-center justify-center"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteTarget(product)}
                                aria-label={`حذف ${product.name?.fr}`}
                                title="حذف"
                                className="w-9 h-9 rounded-xl border border-[#DDD3BE] bg-white hover:border-red-600 hover:bg-red-50 hover:shadow-sm text-red-700 active:scale-95 transition-all inline-flex items-center justify-center"
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

        {/* TAB 2: الباقات */}
        {activeTab === 'packs' && <PacksAdminSection packs={packs} onMutated={markMutated} />}

        {/* TAB 3: الإعدادات والفحص */}
        {activeTab === 'settings' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <form
              onSubmit={handleSaveSettingsSubmit}
              className="lg:col-span-7 bg-[#FDFCFA] border border-[#DDD3BE] p-6 sm:p-8 space-y-5"
            >
              <h2 className="font-display text-2xl font-semibold text-[#0B0A08] pb-3 border-b border-[#DDD3BE]">
                إعدادات المتجر
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium mb-1.5">رقم الواتساب</label>
                  <input
                    type="text"
                    dir="ltr"
                    value={settingsForm.whatsappNumber}
                    onChange={(e) =>
                      setSettingsForm((s) => ({ ...s, whatsappNumber: e.target.value }))
                    }
                    placeholder="212610640666"
                    className="w-full min-h-[44px] px-3.5 bg-[#FDFCFA] border border-[#DDD3BE] text-sm tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5">اسم المتجر</label>
                  <input
                    type="text"
                    dir="ltr"
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
                  شريط الإعلان في أعلى المتجر (بالفرنسية)
                </label>
                <input
                  type="text"
                  dir="ltr"
                  value={settingsForm.announcementFr}
                  onChange={(e) =>
                    setSettingsForm((s) => ({ ...s, announcementFr: e.target.value }))
                  }
                  className="w-full min-h-[44px] px-3.5 bg-[#FDFCFA] border border-[#DDD3BE] text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium mb-1.5">
                    رسوم التوصيل داخل طنجة (DH)
                  </label>
                  <input
                    type="number"
                    dir="ltr"
                    min="0"
                    max="1000"
                    value={settingsForm.deliveryFeeLocal}
                    onChange={(e) =>
                      setSettingsForm((s) => ({
                        ...s,
                        deliveryFeeLocal: Number(e.target.value) || 0,
                      }))
                    }
                    className="w-full min-h-[44px] px-3.5 bg-[#FDFCFA] border border-[#DDD3BE] text-sm tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5">
                    رسوم التوصيل لباقي المدن (DH)
                  </label>
                  <input
                    type="number"
                    dir="ltr"
                    min="0"
                    max="1000"
                    value={settingsForm.deliveryFeeNational}
                    onChange={(e) =>
                      setSettingsForm((s) => ({
                        ...s,
                        deliveryFeeNational: Number(e.target.value) || 0,
                      }))
                    }
                    className="w-full min-h-[44px] px-3.5 bg-[#FDFCFA] border border-[#DDD3BE] text-sm tabular-nums"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5">تصنيفات مخصصة (بالفرنسية)</label>
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    dir="ltr"
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
                    className="btn-secondary-invert px-4 min-h-[44px] text-xs font-medium"
                  >
                    إضافة
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {settingsForm.customCategories.map((cat) => (
                    <span
                      key={cat}
                      className="inline-flex items-center gap-2 px-3 py-1 bg-[#F6F1E7] border border-[#DDD3BE] text-xs"
                    >
                      <span dir="ltr">{cat}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setSettingsForm((s) => ({
                            ...s,
                            customCategories: s.customCategories.filter((c) => c !== cat),
                          }))
                        }
                        aria-label={`حذف ${cat}`}
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
                className="btn-primary-wipe px-6 py-3 text-xs font-medium min-h-[44px]"
              >
                {savingSettings ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
              </button>
            </form>

            {/* Diagnostic Panel */}
            <div className="lg:col-span-5 bg-[#FDFCFA] border border-[#DDD3BE] p-6 sm:p-8 flex flex-col justify-between gap-6">
              <div>
                <h2 className="font-display text-2xl font-semibold text-[#0B0A08] pb-3 border-b border-[#DDD3BE] flex items-center gap-2">
                  <Activity className="w-5 h-5 text-[#8F6E2E]" />
                  <span>فحص قاعدة البيانات (Firestore)</span>
                </h2>

                <div className="mt-5 p-4 bg-[#F6F1E7] border border-[#DDD3BE]">
                  <p className="text-xs text-[#8F6E2E] mb-1">حالة الاتصال عند التشغيل</p>
                  {healthResult ? (
                    <p
                      className={`text-sm font-medium ${
                        healthResult.ok ? 'text-[#0B0A08]' : 'text-red-700'
                      }`}
                    >
                      {healthResult.message}
                    </p>
                  ) : (
                    <p className="text-sm text-[#8C857B]">جاري الفحص...</p>
                  )}
                </div>

                <div className="mt-6">
                  <p className="text-xs text-[#8C857B] mb-3">
                    اختبار تلقائي شامل (5 مراحل على مجموعة _health)
                  </p>
                  <button
                    type="button"
                    disabled={selfTestRunning}
                    onClick={handleRunSelfTest}
                    className="btn-secondary-invert w-full min-h-[44px] text-xs font-medium"
                  >
                    {selfTestRunning
                      ? 'جاري تنفيذ الاختبار...'
                      : 'تشغيل اختبار القراءة والكتابة والحذف'}
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
                          <span className="font-mono font-semibold" dir="ltr">
                            {step.step}
                          </span>
                          <span className={step.ok ? 'text-emerald-800' : 'text-red-700'}>
                            {step.ok ? 'نجاح' : 'فشل'} · {step.detail}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-[#DDD3BE] text-xs text-[#8C857B] leading-relaxed">
                مزامنة فورية: كل منتج أو تعديل تضيفه يُحفظ مباشرة في قاعدة البيانات ويظهر للزوار في
                نفس اللحظة.
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
                {productForm.id ? 'تعديل المنتج' : 'إضافة منتج جديد'}
              </h3>
              <button
                type="button"
                onClick={() => setProductModalOpen(false)}
                aria-label="إغلاق"
                className="w-9 h-9 rounded-full border border-[#DDD3BE] flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1">
                  اسم المنتج (بالفرنسية فقط) *
                </label>
                <input
                  type="text"
                  dir="ltr"
                  required
                  value={productForm.nameFr}
                  onChange={(e) => setProductForm((f) => ({ ...f, nameFr: e.target.value }))}
                  placeholder="Ex. Baccarat Rouge 540"
                  className="w-full min-h-[44px] px-3 bg-[#FDFCFA] border border-[#DDD3BE] text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                <div>
                  <label className="block text-xs font-medium mb-1">التصنيف *</label>
                  <select
                    dir="ltr"
                    value={productForm.category}
                    onChange={(e) => setProductForm((f) => ({ ...f, category: e.target.value }))}
                    className="w-full min-h-[44px] px-3 bg-[#FDFCFA] border border-[#DDD3BE] text-sm"
                  >
                    {allCategories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                    {productForm.category &&
                      !allCategories.some(
                        (c) => normalizeText(c) === normalizeText(productForm.category)
                      ) && (
                        <option value={productForm.category}>{productForm.category}</option>
                      )}
                  </select>
                </div>

                <label className="flex items-center gap-2.5 min-h-[44px] px-3 border border-[#DDD3BE] bg-[#F6F1E7] cursor-pointer text-xs font-medium">
                  <input
                    type="checkbox"
                    checked={productForm.inStock}
                    onChange={(e) => setProductForm((f) => ({ ...f, inStock: e.target.checked }))}
                    className="accent-[#0B0A08] w-4 h-4"
                  />
                  <span>المنتج متوفر في المخزون</span>
                </label>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">
                  وصف المنتج (بالفرنسية فقط)
                </label>
                <textarea
                  rows={3}
                  dir="ltr"
                  value={productForm.descFr}
                  onChange={(e) => setProductForm((f) => ({ ...f, descFr: e.target.value }))}
                  placeholder="Description olfactive en français..."
                  className="w-full p-3 bg-[#FDFCFA] border border-[#DDD3BE] text-sm"
                />
              </div>

              {/* Dynamic Multi-Size / Decant Rows */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium">الأحجام والأسعار (بالدرهم) *</label>
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
                    className="text-xs font-medium text-[#8F6E2E] hover:text-[#0B0A08]"
                  >
                    + إضافة حجم جديد
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
                        dir="ltr"
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
                        dir="ltr"
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
                        placeholder="السعر DH"
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
                        <span>متوفر</span>
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
                        aria-label="حذف هذا الحجم"
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
                <label className="block text-xs font-medium mb-1.5">صورة المنتج</label>
                <div className="flex flex-wrap items-center gap-4">
                  <label className="btn-secondary-invert inline-flex items-center gap-2 px-4 py-2.5 text-xs font-medium cursor-pointer">
                    <Upload className="w-4 h-4" />
                    <span>{uploadingImage ? 'جاري معالجة الصورة...' : 'اختيار صورة'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleProductImageChange}
                      disabled={uploadingImage}
                      className="hidden"
                    />
                  </label>
                  {(productForm.imageUrl || productForm.imageData) && (
                    <div className="flex items-center gap-3">
                      <img
                        src={productForm.imageUrl || productForm.imageData}
                        alt="معاينة الصورة"
                        className="w-14 h-16 object-cover border border-[#DDD3BE]"
                      />
                      <div className="space-y-1">
                        <p className="text-[11px] font-medium text-emerald-800">الصورة جاهزة</p>
                        <button
                          type="button"
                          onClick={() =>
                            setProductForm((prev) => ({ ...prev, imageUrl: '', imageData: '' }))
                          }
                          className="text-[11px] text-red-700 hover:underline"
                        >
                          إزالة
                        </button>
                      </div>
                    </div>
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
                  className="px-5 py-2.5 rounded-xl border border-[#DDD3BE] hover:border-[#C9A24D] bg-white text-xs font-medium transition-all active:scale-95"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={savingProduct || uploadingImage}
                  className="btn-primary-wipe px-6 py-2.5 text-xs font-medium disabled:opacity-50"
                >
                  {savingProduct ? 'جاري الحفظ...' : 'حفظ المنتج'}
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
            <h3 className="font-display text-xl font-semibold mb-2">هل تريد حذف هذا المنتج؟</h3>
            <p className="text-sm text-[#8C857B] mb-6">
              هل تؤكد الحذف النهائي للمنتج « <span dir="ltr">{deleteTarget.name?.fr}</span> »؟
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-xl border border-[#DDD3BE] hover:border-[#C9A24D] bg-white text-xs font-medium transition-all active:scale-95"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={savingProduct}
                onClick={handleConfirmDeleteProduct}
                className="px-5 py-2 rounded-xl bg-gradient-to-br from-red-600 to-red-800 text-white text-xs font-medium shadow-[0_6px_18px_-4px_rgba(185,28,28,0.5)] hover:brightness-110 active:scale-95 transition-all"
              >
                {savingProduct ? 'جاري الحذف...' : 'تأكيد الحذف'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
