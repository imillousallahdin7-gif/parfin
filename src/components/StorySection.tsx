import React from 'react';
import { STORE_IDENTITY } from '../types/catalog';

export const StorySection: React.FC = () => {
  return (
    <section
      id="story"
      aria-label="Notre histoire"
      className="bg-[#0A0A0A] text-[#FAF8F5] py-16 sm:py-24 border-y border-[#C5A059]/25"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          <div className="lg:col-span-5">
            <p className="text-[11px] uppercase tracking-[0.2em] text-[#DFC48B] mb-3">
              Notre Maison · Tanger
            </p>
            <h2 className="font-display text-3xl sm:text-4xl lg:text-[42px] font-semibold leading-[1.15] text-[#FAF8F5] [text-wrap:balance]">
              Deux univers d&apos;exception : haute parfumerie et cosmétique de prestige
            </h2>
            <div className="mt-6 h-px w-24 bg-gold-gradient" aria-hidden="true" />
          </div>

          <div className="lg:col-span-7 space-y-5 text-sm sm:text-base text-[#FAF8F5]/75 leading-relaxed">
            <p>
              Installée au cœur de Tanger au <span className="text-[#DFC48B]">{STORE_IDENTITY.addressFr}</span>,{' '}
              <strong className="text-[#FAF8F5] font-medium">{STORE_IDENTITY.brand}</strong> réunit dans un
              même écrin des parfums authentiques (flacons scellés, fragrances orientales et de niche) et
              une sélection pointue de produits cosmétiques : sérums ciblés, soins du visage et du corps,
              et maquillage haut de gamme.
            </p>
            <p>
              Pour la parfumerie, nous préparons à la demande des décants en verre épais de 5 ml et 10 ml.
              Côté cosmétique, notre équipe conseille chaque client sur WhatsApp et en boutique pour bâtir
              un rituel beauté sur mesure, avec livraison rapide sous 24 à 48h partout au Maroc.
            </p>
            <div className="pt-5 grid grid-cols-3 gap-6 border-t border-[#C5A059]/20 text-left">
              <div>
                <p className="font-display text-2xl sm:text-3xl text-[#DFC48B] tabular-nums">100%</p>
                <p className="text-[11px] uppercase tracking-[0.12em] text-[#A8A29A] mt-1">
                  Produits Authentiques
                </p>
              </div>
              <div>
                <p className="font-display text-2xl sm:text-3xl text-[#DFC48B] tabular-nums">2 Univers</p>
                <p className="text-[11px] uppercase tracking-[0.12em] text-[#A8A29A] mt-1">
                  Parfums &amp; Cosmétiques
                </p>
              </div>
              <div>
                <p className="font-display text-2xl sm:text-3xl text-[#DFC48B] tabular-nums">Maroc</p>
                <p className="text-[11px] uppercase tracking-[0.12em] text-[#A8A29A] mt-1">
                  Livraison Rapide
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
