import React from 'react';
import { ArrowRight } from 'lucide-react';
import { AppRoute, Pack } from '../types/catalog';
import { useLanguage } from '../contexts/LanguageContext';
import { LatinNumber } from './LatinDigits';

interface PacksTopBannersProps {
  packs: Pack[];
  onNavigate: (route: AppRoute) => void;
}

export const PacksTopBanners: React.FC<PacksTopBannersProps> = ({ packs, onNavigate }) => {
  const { isAr } = useLanguage();
  const womenCount = packs.filter((p) => p.active && p.category === 'women').length;
  const menCount = packs.filter((p) => p.active && p.category === 'men').length;

  const banners = [
    {
      route: 'packs-women' as AppRoute,
      num: '1',
      title: isAr ? 'تشكيلة النساء' : 'Sélection Femme',
      count: womenCount,
      cta: isAr ? 'تصفح باقات النساء' : 'Voir les packs femme',
      image: '/assets/packs/pack-women.webp',
      alt: isAr
        ? 'باقات العطور ومستحضرات التجميل للنساء — بارفومري الخليفي'
        : 'Sélection Packs Parfums & Cosmétiques Femme PARFUMERIE EL KHALIFI',
    },
    {
      route: 'packs-men' as AppRoute,
      num: '2',
      title: isAr ? 'تشكيلة الرجال' : 'Sélection Homme',
      count: menCount,
      cta: isAr ? 'تصفح باقات الرجال' : 'Voir les packs homme',
      image: '/assets/packs/pack-men.webp',
      alt: isAr
        ? 'باقات العطور والعناية للرجال — بارفومري الخليفي'
        : 'Sélection Packs Parfums & Soins Homme PARFUMERIE EL KHALIFI',
    },
  ];

  return (
    <section
      aria-label={isAr ? 'تشكيلات الباقات' : 'Sélections de Packs'}
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 sm:pt-16 pb-4"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
        {banners.map((banner) => (
          <button
            key={banner.route}
            type="button"
            onClick={() => onNavigate(banner.route)}
            className="group relative h-60 sm:h-72 rounded-2xl bg-[#0A0A0A] text-start overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_42px_-12px_rgba(197,160,89,0.45)] active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-[#C5A059]"
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
              <p
                className={`text-[11px] text-[#DFC48B] mb-1.5 tabular-nums ${
                  isAr ? 'font-medium' : 'uppercase tracking-[0.18em]'
                }`}
              >
                {banner.count === 0 ? (
                  isAr ? (
                    'تشكيلة حصرية'
                  ) : (
                    'Sélection exclusive'
                  )
                ) : banner.count === 1 ? (
                  isAr ? (
                    <>
                      <LatinNumber value={1} /> باقة متوفرة
                    </>
                  ) : (
                    <>
                      <LatinNumber value={1} /> pack disponible
                    </>
                  )
                ) : isAr ? (
                  <>
                    <LatinNumber value={banner.count} /> باقات متوفرة
                  </>
                ) : (
                  <>
                    <LatinNumber value={banner.count} /> packs disponibles
                  </>
                )}
              </p>
              <h2 className="font-display text-2xl sm:text-3xl font-semibold tracking-[0.04em] text-[#FAF8F5] mb-3">
                <LatinNumber value={banner.num} />. {banner.title}
              </h2>
              <span
                className={`inline-flex items-center gap-2 text-xs text-[#DFC48B] group-hover:text-[#FAF8F5] transition-colors ${
                  isAr ? 'font-medium' : 'uppercase tracking-[0.14em]'
                }`}
              >
                <span>{banner.cta}</span>
                <ArrowRight className="w-4 h-4 rtl:rotate-180 transition-transform duration-200 group-hover:translate-x-1 rtl:group-hover:-translate-x-1" />
              </span>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
};
