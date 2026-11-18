import React, { useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import { BASE_CATEGORIES, Product } from '../types/catalog';
import { normalizeText } from '../utils/format';
import { ProductCard } from './ProductCard';

interface ProductGridSectionProps {
  id?: string;
  title?: string;
  subtitle?: string;
  products: Product[];
  customCategories: string[];
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onOpenDetail: (product: Product) => void;
  onOrderNow: (product: Product) => void;
  sortControl?: React.ReactNode;
  initialLimit?: number;
}

export const ProductGridSection: React.FC<ProductGridSectionProps> = ({
  id = 'collection',
  title = 'La Collection',
  subtitle = 'Flacons originaux et décants préparés à la commande',
  products,
  customCategories,
  selectedCategory,
  onSelectCategory,
  searchQuery,
  onSearchChange,
  loading,
  error,
  onRetry,
  onOpenDetail,
  onOrderNow,
  sortControl,
  initialLimit = 12,
}) => {
  const [visibleCount, setVisibleCount] = useState(initialLimit);

  const categories = useMemo(() => {
    const merged: string[] = [...BASE_CATEGORIES];
    for (const c of customCategories) {
      const trimmed = c.trim();
      if (trimmed && !merged.some((m) => normalizeText(m) === normalizeText(trimmed))) {
        merged.push(trimmed);
      }
    }
    return merged;
  }, [customCategories]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { Tout: products.length };
    for (const cat of categories) {
      if (cat === 'Tout') continue;
      const normCat = normalizeText(cat);
      counts[cat] = products.filter((p) => normalizeText(p.category) === normCat).length;
    }
    return counts;
  }, [products, categories]);

  const filteredProducts = useMemo(() => {
    const normQuery = normalizeText(searchQuery);
    const normCat = normalizeText(selectedCategory);

    return products.filter((product) => {
      if (selectedCategory !== 'Tout' && normalizeText(product.category) !== normCat) {
        return false;
      }
      if (!normQuery) return true;
      const haystack = normalizeText(
        `${product.name?.fr || ''} ${product.name?.ar || ''} ${product.description?.fr || ''} ${
          product.description?.ar || ''
        } ${product.category || ''}`
      );
      return haystack.includes(normQuery);
    });
  }, [products, selectedCategory, searchQuery]);

  const displayedProducts = filteredProducts.slice(0, visibleCount);
  const remainingCount = Math.max(0, filteredProducts.length - displayedProducts.length);

  return (
    <section
      id={id}
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16"
    >
      {/* Editorial Section Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 pb-6 border-b border-[#E5DFD5]">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-[#8A6D3B] mb-2">
            Haute Parfumerie &amp; Décants
          </p>
          <h2 className="font-display text-3xl sm:text-4xl font-semibold tracking-[0.04em] text-[#111111]">
            {title}
          </h2>
          <p className="mt-1.5 text-sm text-[#6B655E]">{subtitle}</p>
        </div>

        {/* Search + Optional Sort */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 sm:w-72">
            <Search
              className="w-4 h-4 text-[#6B655E] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => {
                onSearchChange(e.target.value);
                setVisibleCount(initialLimit);
              }}
              placeholder="Rechercher un parfum, une note..."
              aria-label="Rechercher un parfum"
              className="w-full min-h-[44px] pl-10 pr-10 rounded-xl bg-white border border-[#E5DFD5] text-sm text-[#111111] placeholder:text-[#6B655E] focus:border-[#C5A059] focus:outline-none transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                aria-label="Effacer la recherche"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg flex items-center justify-center text-[#6B655E] hover:text-[#111111] hover:bg-[#F3EFE8] active:scale-95 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          {sortControl}
        </div>
      </div>

      {/* Horizontal Scrollable CategoryBar */}
      <nav
        aria-label="Filtrer par catégorie"
        className="flex items-center overflow-x-auto no-scrollbar pb-3 mb-8 border-b border-[#E5DFD5]/70"
      >
        {categories.map((cat, index) => {
          const isActive = normalizeText(selectedCategory) === normalizeText(cat);
          const count = categoryCounts[cat] ?? 0;
          return (
            <React.Fragment key={cat}>
              {index > 0 && (
                <span className="text-[#6B655E]/50 px-2 select-none shrink-0" aria-hidden="true">
                  ·
                </span>
              )}
              <button
                type="button"
                onClick={() => {
                  onSelectCategory(cat);
                  setVisibleCount(initialLimit);
                }}
                className={`relative py-2.5 px-2.5 text-xs uppercase tracking-[0.12em] whitespace-nowrap shrink-0 transition-all duration-150 active:scale-95 min-h-[44px] flex items-center gap-1.5 ${
                  isActive
                    ? 'text-[#111111] font-semibold'
                    : 'text-[#6B655E] hover:text-[#111111]'
                }`}
              >
                <span>{cat}</span>
                <span className="text-[11px] tabular-nums text-[#8A6D3B]">({count})</span>
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute left-2 right-2 bottom-0 h-[2px] bg-[#C5A059] shadow-[0_0_12px_rgba(197,160,89,0.85)]"
                  />
                )}
              </button>
            </React.Fragment>
          );
        })}
      </nav>

      {/* States: Loading / Error / Empty / Grid */}
      {loading && products.length === 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {Array.from({ length: 8 }).map((_, idx) => (
            <div
              key={idx}
              className="rounded-2xl bg-white border border-[#E5DFD5] overflow-hidden"
            >
              <div className="aspect-[4/5] bg-[#F3EFE8] animate-pulse" />
              <div className="p-4 space-y-3">
                <div className="h-4 bg-[#F3EFE8] animate-pulse w-3/4" />
                <div className="h-3 bg-[#F3EFE8] animate-pulse w-full" />
                <div className="h-10 bg-[#F3EFE8] animate-pulse rounded-xl mt-4" />
              </div>
            </div>
          ))}
        </div>
      ) : error && products.length === 0 ? (
        <div className="bg-white border border-[#E5DFD5] p-10 sm:p-14 text-center max-w-xl mx-auto">
          <span className="text-[#8A6D3B] text-sm block mb-3" aria-hidden="true">
            ◆
          </span>
          <p className="font-display text-2xl text-[#111111] mb-3">
            Catalogue momentanément indisponible, veuillez réessayer
          </p>
          <p className="text-sm text-[#6B655E] mb-6">{error}</p>
          <button
            type="button"
            onClick={onRetry}
            className="btn-primary-wipe px-7 py-3 text-xs uppercase tracking-[0.14em] min-h-[44px]"
          >
            Réessayer
          </button>
        </div>
      ) : products.length === 0 ? (
        <div className="bg-white border border-[#E5DFD5] p-12 sm:p-16 text-center max-w-2xl mx-auto">
          <span className="text-[#8A6D3B] text-base block mb-3" aria-hidden="true">
            ◆
          </span>
          <h3 className="font-display text-2xl sm:text-3xl text-[#111111] mb-3">
            Nouvelle collection bientôt disponible
          </h3>
          <p className="text-sm text-[#6B655E] max-w-md mx-auto leading-relaxed">
            Notre sélection de flacons et décants est en cours de préparation. Contactez notre
            conciergerie sur WhatsApp pour toute demande particulière.
          </p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="bg-white border border-[#E5DFD5] p-10 sm:p-14 text-center max-w-xl mx-auto">
          <p className="font-display text-2xl text-[#111111] mb-2">
            Aucune création correspondante
          </p>
          <p className="text-sm text-[#6B655E] mb-6">
            Essayez un autre mot-clé ou réinitialisez les filtres de catégorie.
          </p>
          <button
            type="button"
            onClick={() => {
              onSearchChange('');
              onSelectCategory('Tout');
            }}
            className="btn-secondary-invert px-6 py-3 text-xs uppercase tracking-[0.14em] min-h-[44px]"
          >
            Afficher toute la collection
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {displayedProducts.map((product, index) => (
              <ProductCard
                key={product.id}
                product={product}
                eager={index < 8}
                onOpenDetail={onOpenDetail}
                onOrderNow={onOrderNow}
              />
            ))}
          </div>

          {remainingCount > 0 && (
            <div className="mt-10 text-center">
              <button
                type="button"
                onClick={() => setVisibleCount((prev) => prev + 12)}
                className="btn-secondary-invert px-8 py-3.5 text-xs uppercase tracking-[0.14em] font-medium min-h-[44px]"
              >
                Voir plus de créations ({remainingCount} restants)
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
};
