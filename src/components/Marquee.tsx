import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';

const MARQUEE_ITEMS_FR = [
  'Haute Parfumerie',
  'Cosmétiques & Soins',
  'Livraison au Maroc uniquement',
  'Sérums & Élixirs Visage',
  'Oud Assam & Ambre Gris',
  'Soins de Luxe Visage & Corps',
  'Parfums Arabes & Français 100 % Authentiques',
  'Maquillage de Luxe',
  'Rose de Mai & Santal',
  'Soins Corps & Cheveux',
  'Tanger · Maroc',
];

const MARQUEE_ITEMS_AR = [
  'عطور فاخرة',
  'مستحضرات تجميل وعناية',
  'توصيل لجميع أنحاء المغرب فقط',
  'سيروم وعناية بالوجه',
  'عود آسام وعنبر فاخر',
  'عناية فاخرة للوجه والجسم',
  'عطور عربية وفرنسية أصلية 100%',
  'مكياج راقٍ وأصلي',
  'ورد طائفي وخشب الصندل',
  'عناية بالجسم والشعر',
  'طنجة · المغرب',
];

export const Marquee: React.FC = () => {
  const { isAr } = useLanguage();
  const items = isAr ? MARQUEE_ITEMS_AR : MARQUEE_ITEMS_FR;

  return (
    <div
      dir="ltr"
      className="marquee-wrapper w-full bg-[#0A0A0A] border-y border-[#C5A059]/30 overflow-hidden py-3.5 select-none"
      aria-label={
        isAr
          ? 'عالم العطور ومستحضرات التجميل والخدمات'
          : 'Univers parfumerie, cosmétiques et services'
      }
    >
      <div className="animate-marquee flex items-center">
        {[0, 1].map((dup) => (
          <div key={dup} className="flex items-center shrink-0">
            {items.map((item) => (
              <div key={`${dup}-${item}`} className="flex items-center shrink-0">
                <span
                  className={`font-display text-sm sm:text-base text-[#DFC48B]/90 px-5 whitespace-nowrap ${
                    isAr ? 'font-medium' : 'uppercase tracking-[0.18em]'
                  }`}
                >
                  {item}
                </span>
                <span className="text-[#C5A059] text-[10px]" aria-hidden="true">
                  ◆
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};
