import React, { Suspense, lazy, useCallback, useEffect, useState } from 'react';
import {
  AppRoute,
  CartItem,
  DEFAULT_STORE_SETTINGS,
  Pack,
  Product,
  ProductSize,
  StoreSettings,
} from './types/catalog';
import { getPublicCatalog, subscribePublicCatalog } from './services/catalogService';
import { loadCart, saveCart } from './services/cartService';
import { Header } from './components/Header';
import { NavigationOverlay } from './components/NavigationOverlay';
import { Hero } from './components/Hero';
import { Marquee } from './components/Marquee';
import { PacksTopBanners } from './components/PacksTopBanners';
import { ProductGridSection } from './components/ProductGridSection';
import { ShopView } from './components/ShopView';
import { PacksPage } from './components/PacksPage';
import { StorySection } from './components/StorySection';
import { Testimonials } from './components/Testimonials';
import { StoreLocation } from './components/StoreLocation';
import { Footer } from './components/Footer';
import { ProductDetailModal } from './components/ProductDetailModal';
import { CustomerOrderModal } from './components/CustomerOrderModal';
import { CartDrawer } from './components/CartDrawer';
import { FloatingWhatsApp } from './components/FloatingWhatsApp';

const AdminPanel = lazy(() => import('./components/AdminPanel'));

function parseRouteFromLocation(): AppRoute {
  const hash = window.location.hash.replace(/^#\/?/, '').toLowerCase();
  const pathname = window.location.pathname.replace(/^\/+/, '').toLowerCase();

  if (hash === 'admin' || pathname === 'admin') return 'admin';
  if (hash === 'shop' || pathname === 'shop') return 'shop';
  if (hash === 'packs-women' || pathname === 'packs-women') return 'packs-women';
  if (hash === 'packs-men' || pathname === 'packs-men') return 'packs-men';
  return 'home';
}

function getCategoryFromUrl(): string {
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get('category') || 'Tout';
  } catch {
    return 'Tout';
  }
}

export default function App() {
  const [route, setRoute] = useState<AppRoute>(() => parseRouteFromLocation());
  const [selectedCategory, setSelectedCategory] = useState<string>(() => getCategoryFromUrl());
  const [searchQuery, setSearchQuery] = useState('');

  const [products, setProducts] = useState<Product[]>([]);
  const [packs, setPacks] = useState<Pack[]>([]);
  const [settings, setSettings] = useState<StoreSettings>(DEFAULT_STORE_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  const [menuOpen, setMenuOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [cartItems, setCartItems] = useState<CartItem[]>(() => loadCart());
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);
  const [directOrderItem, setDirectOrderItem] = useState<CartItem | null>(null);

  const liveReceivedRef = React.useRef({
    products: false,
    packs: false,
    settings: false,
  });

  const loadCatalog = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    setCatalogError(null);
    try {
      const snapshot = await getPublicCatalog({
        forceRefresh,
        onBackgroundUpdate: (fresh) => {
          if (!liveReceivedRef.current.products && fresh.products.length > 0) {
            setProducts(fresh.products);
          }
          if (!liveReceivedRef.current.packs && fresh.packs.length > 0) {
            setPacks(fresh.packs);
          }
          if (!liveReceivedRef.current.settings) setSettings(fresh.settings);
        },
      });
      if (!liveReceivedRef.current.products && snapshot.products.length > 0) {
        setProducts(snapshot.products);
        setLoading(false);
      }
      if (!liveReceivedRef.current.packs && snapshot.packs.length > 0) {
        setPacks(snapshot.packs);
      }
      if (!liveReceivedRef.current.settings) setSettings(snapshot.settings);
    } catch (err) {
      if (!liveReceivedRef.current.products) {
        setCatalogError(
          err instanceof Error ? err.message : 'Impossible de charger le catalogue.'
        );
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    loadCatalog(false);
  }, [loadCatalog]);

  const isPublicView = route !== 'admin';

  // Real-time synchronous Firestore sync for visitors whenever viewing the public storefront
  useEffect(() => {
    if (!isPublicView) return;
    let active = true;
    let unsubscribe: (() => void) | undefined;

    const safetyTimer = window.setTimeout(() => {
      if (active) setLoading(false);
    }, 6000);

    subscribePublicCatalog({
      onProducts: (liveProducts) => {
        if (!active) return;
        window.clearTimeout(safetyTimer);
        liveReceivedRef.current.products = true;
        setProducts(liveProducts);
        setCatalogError(null);
        setLoading(false);
      },
      onPacks: (livePacks) => {
        if (!active) return;
        liveReceivedRef.current.packs = true;
        setPacks(livePacks);
      },
      onSettings: (liveSettings) => {
        if (!active) return;
        liveReceivedRef.current.settings = true;
        setSettings(liveSettings);
      },
      onError: () => {
        if (active) {
          window.clearTimeout(safetyTimer);
          setLoading(false);
        }
      },
    })
      .then((unsub) => {
        if (active) {
          unsubscribe = unsub;
        } else {
          unsub();
        }
      })
      .catch(() => {
        if (active) {
          window.clearTimeout(safetyTimer);
          setLoading(false);
        }
      });

    return () => {
      active = false;
      window.clearTimeout(safetyTimer);
      if (unsubscribe) unsubscribe();
    };
  }, [isPublicView]);

  useEffect(() => {
    const onHashOrPop = () => {
      setRoute(parseRouteFromLocation());
      setSelectedCategory(getCategoryFromUrl());
    };
    window.addEventListener('hashchange', onHashOrPop);
    window.addEventListener('popstate', onHashOrPop);
    return () => {
      window.removeEventListener('hashchange', onHashOrPop);
      window.removeEventListener('popstate', onHashOrPop);
    };
  }, []);

  useEffect(() => {
    saveCart(cartItems);
  }, [cartItems]);

  const handleSelectCategory = useCallback((cat: string) => {
    setSelectedCategory(cat);
    try {
      const url = new URL(window.location.href);
      if (cat === 'Tout') {
        url.searchParams.delete('category');
      } else {
        url.searchParams.set('category', cat);
      }
      window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
    } catch {
      // ignore URL update issues in restricted environments
    }
  }, []);

  const handleNavigate = useCallback((nextRoute: AppRoute, sectionId?: string) => {
    setRoute(nextRoute);
    const nextHash = nextRoute === 'home' ? (sectionId ? `#${sectionId}` : '') : `#${nextRoute}`;
    if (window.location.hash !== nextHash) {
      window.location.hash = nextHash;
    }

    if (nextRoute === 'home' && sectionId) {
      window.requestAnimationFrame(() => {
        const el = document.getElementById(sectionId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' });
        }
      });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  const handleAddToCart = useCallback((product: Product, size: ProductSize) => {
    const key = `product:${product.id}:${size.id}`;
    const imageUrl = product.imageUrl || product.imageData || product.images?.[0];
    setCartItems((prev) => {
      const existing = prev.find((i) => i.key === key);
      if (existing) {
        return prev.map((i) => (i.key === key ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [
        ...prev,
        {
          key,
          kind: 'product',
          id: product.id,
          title: product.name?.fr || 'Création',
          sizeLabel: size.label,
          sizeId: size.id,
          unitPrice: size.price,
          quantity: 1,
          imageUrl,
        },
      ];
    });
  }, []);

  const handleOrderProductDirect = useCallback((product: Product, size?: ProductSize) => {
    const chosenSize =
      size ||
      product.sizes?.find((s) => s.inStock) ||
      product.sizes?.[0] || {
        id: 'default',
        label: product.sizeLabel || 'Flacon complet',
        price: product.price,
        inStock: product.inStock,
      };
    setDetailProduct(null);
    setDirectOrderItem({
      key: `product:${product.id}:${chosenSize.id}`,
      kind: 'product',
      id: product.id,
      title: product.name?.fr || 'Création',
      sizeLabel: chosenSize.label,
      sizeId: chosenSize.id,
      unitPrice: chosenSize.price,
      quantity: 1,
      imageUrl: product.imageUrl || product.imageData,
    });
  }, []);

  const handleOrderPack = useCallback((pack: Pack) => {
    setDirectOrderItem({
      key: `pack:${pack.id}:pack`,
      kind: 'pack',
      id: pack.id,
      title: pack.name?.fr || 'Pack',
      sizeLabel: 'Pack',
      sizeId: 'pack',
      unitPrice: pack.price,
      quantity: 1,
      imageUrl: pack.imageUrl || pack.imageData,
    });
  }, []);

  const handleUpdateCartQuantity = useCallback((key: string, delta: number) => {
    setCartItems((prev) =>
      prev
        .map((item) => (item.key === key ? { ...item, quantity: item.quantity + delta } : item))
        .filter((item) => item.quantity > 0)
    );
  }, []);

  const handleRemoveCartItem = useCallback((key: string) => {
    setCartItems((prev) => prev.filter((item) => item.key !== key));
  }, []);

  const totalCartCount = cartItems.reduce((sum, i) => sum + i.quantity, 0);

  if (route === 'admin') {
    return (
      <Suspense
        fallback={
          <div className="min-h-screen bg-[#0B0A08] text-[#E8D08C] flex items-center justify-center text-xs uppercase tracking-[0.18em]">
            Chargement de l&apos;espace Curateur...
          </div>
        }
      >
        <AdminPanel onBackHome={() => handleNavigate('home')} />
      </Suspense>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#111111] flex flex-col">
      <Header
        announcementText={settings.announcementFr}
        cartCount={totalCartCount}
        menuOpen={menuOpen}
        onToggleMenu={() => setMenuOpen((o) => !o)}
        onOpenCart={() => setCartOpen(true)}
        onNavigate={handleNavigate}
      />

      <NavigationOverlay
        open={menuOpen}
        whatsappNumber={settings.whatsappNumber}
        onClose={() => setMenuOpen(false)}
        onNavigate={handleNavigate}
      />

      <main className="flex-1">
        {route === 'home' && (
          <>
            <Hero
              onExplore={() => {
                const el = document.getElementById('collection');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              onNavigate={(r) => handleNavigate(r)}
            />

            <Marquee />

            <PacksTopBanners packs={packs} onNavigate={(r) => handleNavigate(r)} />

            <ProductGridSection
              id="collection"
              products={products}
              customCategories={settings.customCategories}
              selectedCategory={selectedCategory}
              onSelectCategory={handleSelectCategory}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              loading={loading}
              error={catalogError}
              onRetry={() => loadCatalog(true)}
              onOpenDetail={(p) => setDetailProduct(p)}
              onOrderNow={(p) => handleOrderProductDirect(p)}
              initialLimit={12}
            />

            <StorySection />

            <Testimonials />

            <StoreLocation whatsappNumber={settings.whatsappNumber} />
          </>
        )}

        {route === 'shop' && (
          <ShopView
            products={products}
            customCategories={settings.customCategories}
            selectedCategory={selectedCategory}
            onSelectCategory={handleSelectCategory}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            loading={loading}
            error={catalogError}
            onRetry={() => loadCatalog(true)}
            onOpenDetail={(p) => setDetailProduct(p)}
            onOrderNow={(p) => handleOrderProductDirect(p)}
            onBackHome={() => handleNavigate('home')}
          />
        )}

        {(route === 'packs-women' || route === 'packs-men') && (
          <PacksPage
            category={route === 'packs-women' ? 'women' : 'men'}
            packs={packs}
            loading={loading}
            onOrderPack={handleOrderPack}
            onNavigate={(r) => handleNavigate(r)}
          />
        )}
      </main>

      <Footer whatsappNumber={settings.whatsappNumber} onNavigate={handleNavigate} />

      <FloatingWhatsApp
        whatsappNumber={settings.whatsappNumber}
        elevateMobile={Boolean(detailProduct)}
      />

      <ProductDetailModal
        product={detailProduct}
        onClose={() => setDetailProduct(null)}
        onAddToCart={handleAddToCart}
        onOrderDirect={(p, size) => handleOrderProductDirect(p, size)}
      />

      <CustomerOrderModal
        item={directOrderItem}
        whatsappNumber={settings.whatsappNumber}
        deliveryFeeLocal={settings.deliveryFeeLocal}
        deliveryFeeNational={settings.deliveryFeeNational}
        onClose={() => setDirectOrderItem(null)}
      />

      <CartDrawer
        open={cartOpen}
        items={cartItems}
        whatsappNumber={settings.whatsappNumber}
        deliveryFeeLocal={settings.deliveryFeeLocal}
        deliveryFeeNational={settings.deliveryFeeNational}
        onClose={() => setCartOpen(false)}
        onUpdateQuantity={handleUpdateCartQuantity}
        onRemoveItem={handleRemoveCartItem}
        onClearCart={() => setCartItems([])}
      />
    </div>
  );
}
