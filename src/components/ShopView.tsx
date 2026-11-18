import React, { useMemo, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Product } from '../types/catalog';
import { ProductGridSection } from './ProductGridSection';

type SortOption = 'newest' | 'price-asc' | 'price-desc' | 'name-asc';

interface ShopViewProps {
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
  onBackHome: () => void;
}

export const ShopView: React.FC<ShopViewProps> = ({
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
  onBackHome,
}) => {
  const [sortBy, setSortBy] = useState<SortOption>('newest');

  const sortedProducts = useMemo(() => {
    const copy = [...products];
    const getEffectivePrice = (p: Product) => {
      const avail = p.sizes?.find((s) => s.inStock) || p.sizes?.[0];
      return avail ? avail.price : p.price;
    };

    switch (sortBy) {
      case 'price-asc':
        copy.sort((a, b) => getEffectivePrice(a) - getEffectivePrice(b));
        break;
      case 'price-desc':
        copy.sort((a, b) => getEffectivePrice(b) - getEffectivePrice(a));
        break;
      case 'name-asc':
        copy.sort((a, b) => (a.name?.fr || '').localeCompare(b.name?.fr || '', 'fr'));
        break;
      case 'newest':
      default:
        copy.sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));
        break;
    }
    return copy;
  }, [products, sortBy]);

  return (
    <div className="min-h-[75vh] bg-[#FAF8F5] pt-6 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={onBackHome}
          className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-[#6B655E] hover:text-[#111111] py-2 min-h-[44px]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Retour à l&apos;accueil</span>
        </button>
      </div>

      <ProductGridSection
        id="shop-catalog"
        title="Boutique Complète"
        subtitle="Explorez nos parfums français, orientaux, de niche et décants 5 ml / 10 ml"
        products={sortedProducts}
        customCategories={customCategories}
        selectedCategory={selectedCategory}
        onSelectCategory={onSelectCategory}
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
        loading={loading}
        error={error}
        onRetry={onRetry}
        onOpenDetail={onOpenDetail}
        onOrderNow={onOrderNow}
        initialLimit={12}
        sortControl={
          <div className="shrink-0">
            <label htmlFor="shop-sort" className="sr-only">
              Trier les parfums
            </label>
            <select
              id="shop-sort"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="w-full sm:w-auto min-h-[44px] px-3.5 bg-white border border-[#E5DFD5] text-xs uppercase tracking-[0.08em] text-[#111111] focus:border-[#C5A059] focus:outline-none"
            >
              <option value="newest">Nouveautés d&apos;abord</option>
              <option value="price-asc">Prix : Croissant</option>
              <option value="price-desc">Prix : Décroissant</option>
              <option value="name-asc">Nom (A à Z)</option>
            </select>
          </div>
        }
      />
    </div>
  );
};
