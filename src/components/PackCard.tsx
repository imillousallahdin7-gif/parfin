import React from 'react';
import { Pack } from '../types/catalog';
import { useLanguage } from '../contexts/LanguageContext';
import { getPackDescription, getPackTitle } from '../utils/i18n';
import { CatalogImage } from './CatalogImage';
import { LatinPrice } from './LatinDigits';

interface PackCardProps {
  pack: Pack;
  eager?: boolean;
  onOrderPack: (pack: Pack) => void;
}

export const PackCard: React.FC<PackCardProps> = ({
  pack,
  eager = false,
  onOrderPack,
}) => {
  const { lang, isAr } = useLanguage();
  const title = getPackTitle(pack, lang);
  const description = getPackDescription(pack, lang);
  const imageSrc =
    (pack.imageUrl?.startsWith('/') ? pack.imageUrl : undefined) ||
    pack.imageData ||
    pack.imageUrl;

  return (
    <article className="group relative flex flex-col h-full bg-white rounded-2xl border border-[#E5DFD5] overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:border-[#C5A059]/70 hover:shadow-[0_14px_34px_-14px_rgba(197,160,89,0.4)]">
      <div className="relative">
        <CatalogImage
          src={imageSrc}
          fallbackSrc={pack.imageData}
          alt={title}
          title={title}
          eager={eager}
          aspectClass="aspect-[4/5]"
        />
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
            <LatinPrice amount={pack.price} />
          </span>
          <span
            className={`text-[11px] text-[#8A6D3B] font-medium whitespace-nowrap ${
              isAr ? '' : 'uppercase tracking-[0.08em]'
            }`}
          >
            {isAr ? 'باقة' : 'Pack'}
          </span>
        </div>

        <button
          type="button"
          onClick={() => onOrderPack(pack)}
          className={`mt-auto w-full min-h-[44px] btn-noir-luminous text-xs font-semibold ${
            isAr ? '' : 'uppercase tracking-[0.14em]'
          }`}
        >
          {isAr ? 'اطلب الباقة' : 'Commander'}
        </button>
      </div>
    </article>
  );
};
