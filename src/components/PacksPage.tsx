import React from 'react';
import { X } from 'lucide-react';
import { AppRoute, Pack } from '../types/catalog';
import { PackCard } from './PackCard';

interface PacksPageProps {
  category: 'women' | 'men';
  packs: Pack[];
  loading: boolean;
  onOrderPack: (pack: Pack) => void;
  onNavigate: (route: AppRoute) => void;
}

export const PacksPage: React.FC<PacksPageProps> = ({
  category,
  packs,
  loading,
  onOrderPack,
  onNavigate,
}) => {
  const activePacks = packs.filter((p) => p.active && p.category === category);
  const isWomen = category === 'women';

  return (
    <section className="min-h-[75vh] bg-[#FAF8F5] py-10 sm:py-14">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Title bar with corner X returning home */}
        <div className="flex items-start justify-between gap-4 pb-6 mb-8 border-b border-[#E5DFD5]">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-[#8A6D3B] mb-2">
              {isWomen ? '1. Sélection Femme' : '2. Sélection Homme'}
            </p>
            <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-[0.04em] text-[#111111]">
              {isWomen ? 'Nos Packs Femme' : 'Nos Packs Homme'}
            </h1>
            <p className="mt-1.5 text-sm text-[#6B655E]">
              {isWomen
                ? 'Assortiments élégants de créations féminines et décants précieux.'
                : 'Compositions boisées, ambrées et sélections signature pour homme.'}
            </p>
          </div>

          <button
            type="button"
            onClick={() => onNavigate('home')}
            aria-label="Fermer et retourner à l'accueil"
            className="w-11 h-11 flex items-center justify-center border border-[#E5DFD5] bg-white text-[#111111] hover:border-[#111111] hover:bg-[#111111] hover:text-[#FAF8F5] transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Switcher between Women / Men packs */}
        <div className="flex items-center gap-3 mb-8">
          <button
            type="button"
            onClick={() => onNavigate('packs-women')}
            className={`px-5 py-2.5 text-xs uppercase tracking-[0.12em] border min-h-[44px] transition-colors ${
              isWomen
                ? 'bg-[#111111] text-[#DFC48B] border-[#111111]'
                : 'bg-white text-[#111111] border-[#E5DFD5] hover:border-[#C5A059]'
            }`}
          >
            Packs Femme
          </button>
          <button
            type="button"
            onClick={() => onNavigate('packs-men')}
            className={`px-5 py-2.5 text-xs uppercase tracking-[0.12em] border min-h-[44px] transition-colors ${
              !isWomen
                ? 'bg-[#111111] text-[#DFC48B] border-[#111111]'
                : 'bg-white text-[#111111] border-[#E5DFD5] hover:border-[#C5A059]'
            }`}
          >
            Packs Homme
          </button>
        </div>

        {loading && activePacks.length === 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-2xl bg-white border border-[#E5DFD5] overflow-hidden">
                <div className="aspect-[4/5] bg-[#F3EFE8] animate-pulse" />
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-[#F3EFE8] animate-pulse w-2/3" />
                  <div className="h-10 bg-[#F3EFE8] animate-pulse rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        ) : activePacks.length === 0 ? (
          <div className="bg-white border border-[#E5DFD5] p-12 sm:p-16 text-center max-w-2xl mx-auto">
            <span className="text-[#8A6D3B] text-base block mb-3" aria-hidden="true">
              ◆
            </span>
            <h2 className="font-display text-2xl sm:text-3xl text-[#111111] mb-3">
              Nouvelle sélection bientôt disponible
            </h2>
            <p className="text-sm text-[#6B655E] mb-6">
              Aucun pack actif dans cette sélection pour le moment. Découvrez nos flacons et décants
              à l&apos;unité dans la boutique.
            </p>
            <button
              type="button"
              onClick={() => onNavigate('shop')}
              className="btn-primary-wipe px-7 py-3 text-xs uppercase tracking-[0.14em] min-h-[44px]"
            >
              Découvrir la Boutique
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {activePacks.map((pack, idx) => (
              <PackCard
                key={pack.id}
                pack={pack}
                eager={idx < 4}
                onOrderPack={onOrderPack}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
