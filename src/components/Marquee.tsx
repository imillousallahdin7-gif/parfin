import React from 'react';

const MARQUEE_ITEMS = [
  'Oud Assam 1984',
  'Livraison dans tout le Maroc',
  'Rose de Mai de Grasse',
  'Ambre Gris Marin',
  'Musc Impérial',
  "Vétiver d'Haïti",
  'Safran Rouge de Perse',
  'Santal de Mysore',
  "Encens Royal d'Oman",
  'Iris Pallida de Florence',
  "Fleur d'Oranger Sauvage",
];

export const Marquee: React.FC = () => {
  return (
    <div
      className="marquee-wrapper w-full bg-[#0A0A0A] border-y border-[#C5A059]/30 overflow-hidden py-3.5 select-none"
      aria-label="Notes olfactives et services"
    >
      <div className="animate-marquee flex items-center">
        {[0, 1].map((dup) => (
          <div key={dup} className="flex items-center shrink-0">
            {MARQUEE_ITEMS.map((item) => (
              <div key={`${dup}-${item}`} className="flex items-center shrink-0">
                <span className="font-display text-sm sm:text-base uppercase tracking-[0.18em] text-[#DFC48B]/90 px-5 whitespace-nowrap">
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
