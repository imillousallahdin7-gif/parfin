import React from 'react';
import { ArrowRight } from 'lucide-react';
import { AppRoute, Pack } from '../types/catalog';

interface PacksTopBannersProps {
  packs: Pack[];
  onNavigate: (route: AppRoute) => void;
}

export const PacksTopBanners: React.FC<PacksTopBannersProps> = ({ packs, onNavigate }) => {
  const womenCount = packs.filter((p) => p.active && p.category === 'women').length;
  const menCount = packs.filter((p) => p.active && p.category === 'men').length;

  const banners = [
    {
      route: 'packs-women' as AppRoute,
      title: '1. Sélection Femme',
      count: womenCount,
      cta: 'Voir les packs femme',
      image: '/assets/packs/pack-women.webp',
      alt: 'Sélection Packs Parfums & Cosmétiques Femme PARFUMERIE EL KHALIFI',
    },
    {
      route: 'packs-men' as AppRoute,
      title: '2. Sélection Homme',
      count: menCount,
      cta: 'Voir les packs homme',
      image: '/assets/packs/pack-men.webp',
      alt: 'Sélection Packs Parfums & Soins Homme PARFUMERIE EL KHALIFI',
    },
  ];

  return (
    <section
      aria-label="Sélections de Packs"
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 sm:pt-16 pb-4"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
        {banners.map((banner) => (
          <button
            key={banner.route}
            type="button"
            onClick={() => onNavigate(banner.route)}
            className="group relative h-60 sm:h-72 rounded-2xl bg-[#0A0A0A] text-left overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_42px_-12px_rgba(197,160,89,0.45)] active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-[#C5A059]"
          >
            <img
              src={banner.image}
              alt={banner.alt}
              loading="lazy"
              className="absolute inset-0 w-full h-full object-cover opacity-75 transition-transform duration-700 ease-out group-hover:scale-105"
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A]/95 via-[#0A0A0A]/50 to-[#0A0A0A]/25"
            />
            <div
              aria-hidden="true"
              className="absolute inset-3 border border-[#C5A059]/35 pointer-events-none transition-colors duration-300 group-hover:border-[#DFC48B]/70"
            />

            <div className="relative z-10 h-full p-7 sm:p-9 flex flex-col justify-end">
              <p className="text-[11px] uppercase tracking-[0.18em] text-[#DFC48B] mb-1.5 tabular-nums">
                {banner.count === 0
                  ? 'Sélection exclusive'
                  : banner.count === 1
                  ? '1 pack disponible'
                  : `${banner.count} packs disponibles`}
              </p>
              <h2 className="font-display text-2xl sm:text-3xl font-semibold tracking-[0.04em] text-[#FAF8F5] mb-3">
                {banner.title}
              </h2>
              <span className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-[#DFC48B] group-hover:text-[#FAF8F5] transition-colors">
                <span>{banner.cta}</span>
                <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
              </span>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
};
