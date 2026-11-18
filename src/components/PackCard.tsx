import React from 'react';
import { Pack } from '../types/catalog';
import { formatMAD } from '../utils/format';
import { CatalogImage } from './CatalogImage';

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
  const title = pack.name?.fr || 'Pack';
  const description = pack.description?.fr || '';
  const imageSrc =
    (pack.imageUrl?.startsWith('/') ? pack.imageUrl : undefined) ||
    pack.imageData ||
    pack.imageUrl;

  return (
    <article className="group relative flex flex-col h-full bg-white rounded-2xl border border-[#E5DFD5] overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:border-[#C5A059]/60">
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
          {description || 'Sélection exclusive préparée avec soin par notre maison.'}
        </p>

        <div className="mt-3 mb-4 flex items-center justify-between gap-2 pt-2.5 border-t border-[#E5DFD5]/80">
          <span className="text-sm sm:text-[15px] font-semibold text-[#111111] tabular-nums whitespace-nowrap">
            {formatMAD(pack.price)}
          </span>
          <span className="rounded-full border border-[#E5DFD5] bg-[#FAF8F5] px-2.5 py-0.5 text-[10px] sm:text-[11px] uppercase tracking-[0.06em] text-[#8A6D3B] font-medium whitespace-nowrap">
            Pack
          </span>
        </div>

        <button
          type="button"
          onClick={() => onOrderPack(pack)}
          className="mt-auto w-full min-h-[44px] rounded-xl bg-[#111111] text-[#FAF8F5] hover:bg-[#25D366] hover:text-white text-xs uppercase tracking-[0.14em] font-medium transition-colors duration-200"
        >
          Commander
        </button>
      </div>
    </article>
  );
};
