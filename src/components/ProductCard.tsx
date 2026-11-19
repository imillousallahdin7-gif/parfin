import React from 'react';
import { Product } from '../types/catalog';
import { useLanguage } from '../contexts/LanguageContext';
import { getProductDescription, getProductTitle } from '../utils/i18n';
import { CatalogImage } from './CatalogImage';
import { LatinPrice } from './LatinDigits';

interface ProductCardProps {
  product: Product;
  eager?: boolean;
  onOpenDetail: (product: Product) => void;
  onOrderNow: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  eager = false,
  onOpenDetail,
  onOrderNow,
}) => {
  const { lang, isAr } = useLanguage();
  const firstAvailableSize =
    product.sizes?.find((s) => s.inStock) || product.sizes?.[0];
  const displayPrice = firstAvailableSize ? firstAvailableSize.price : product.price;
  const displaySize =
    firstAvailableSize?.label ||
    product.sizeLabel ||
    (isAr ? 'الحجم القياسي' : 'Format standard');
  const isOutOfStock =
    !product.inStock ||
    (product.sizes && product.sizes.length > 0 && product.sizes.every((s) => !s.inStock));

  const title = getProductTitle(product, lang);
  const description = getProductDescription(product, lang);
  const imageSrc =
    (product.imageUrl?.startsWith('/') ? product.imageUrl : undefined) ||
    product.imageData ||
    product.imageUrl ||
    product.images?.[0];

  return (
    <article
      onClick={() => onOpenDetail(product)}
      className="group relative flex flex-col h-full bg-white rounded-2xl border border-[#E5DFD5] overflow-hidden cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:border-[#C5A059]/70 hover:shadow-[0_14px_34px_-14px_rgba(197,160,89,0.4)]"
    >
      <div className="relative">
        <CatalogImage
          src={imageSrc}
          fallbackSrc={product.imageData}
          alt={title}
          title={title}
          eager={eager}
          aspectClass="aspect-[4/5]"
        />
        {isOutOfStock && (
          <span className="absolute top-3 start-3 rounded-full bg-[#0A0A0A] text-[#DFC48B] px-3 py-1 text-[10px] uppercase tracking-[0.14em] font-medium">
            {isAr ? 'نفد المخزون' : 'Épuisé'}
          </span>
        )}
      </div>

      <div className="flex flex-col flex-1 p-3.5 sm:p-5">
        <h3 className="font-display text-base sm:text-lg font-semibold leading-snug text-[#111111] line-clamp-2 min-h-[2.75rem]">
          {title}
        </h3>

        <p className="mt-1.5 text-xs sm:text-[13px] text-[#6B655E] leading-relaxed line-clamp-2 min-h-[2.5rem]">
          {description}
        </p>

        <div className="mt-3 mb-4 flex items-center justify-between gap-2 pt-2.5 border-t border-[#E5DFD5]/80">
          <span className="text-sm sm:text-[15px] font-semibold text-[#111111]">
            <LatinPrice amount={displayPrice} />
          </span>
          <span
            translate="no"
            className="notranslate text-[11px] uppercase tracking-[0.08em] text-[#8A6D3B] font-medium whitespace-nowrap truncate max-w-[115px]"
          >
            {displaySize}
          </span>
        </div>

        <button
          type="button"
          disabled={isOutOfStock}
          onClick={(e) => {
            e.stopPropagation();
            if (!isOutOfStock) onOrderNow(product);
          }}
          className={`mt-auto w-full min-h-[44px] text-xs font-semibold ${
            isAr ? '' : 'uppercase tracking-[0.14em]'
          } ${
            isOutOfStock
              ? 'rounded-xl bg-[#F3EFE8] text-[#6B655E] cursor-not-allowed border border-[#E5DFD5]'
              : 'btn-noir-luminous'
          }`}
        >
          {isOutOfStock
            ? isAr
              ? 'نفد المخزون'
              : 'Épuisé'
            : isAr
            ? 'اطلب الآن'
            : 'Commander'}
        </button>
      </div>
    </article>
  );
};
