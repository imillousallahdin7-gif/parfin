import React from 'react';
import { STORE_IDENTITY } from '../types/catalog';
import { useLanguage } from '../contexts/LanguageContext';
import { LatinNumber } from './LatinDigits';

export const StorySection: React.FC = () => {
  const { isAr } = useLanguage();

  return (
    <section
      id="story"
      aria-label={isAr ? 'قصتنا' : 'Notre histoire'}
      className="bg-[#0A0A0A] text-[#FAF8F5] py-16 sm:py-24 border-y border-[#C5A059]/25"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          <div className="lg:col-span-5">
            <p
              className={`text-[11px] text-[#DFC48B] mb-3 ${
                isAr ? 'font-medium' : 'uppercase tracking-[0.2em]'
              }`}
            >
              {isAr ? 'دارنا · طنجة' : 'Notre Maison · Tanger'}
            </p>
            <h2 className="font-display text-3xl sm:text-4xl lg:text-[42px] font-semibold leading-[1.18] text-[#FAF8F5] [text-wrap:balance]">
              {isAr
                ? 'عالمان استثنائيان: العطور الفاخرة ومستحضرات التجميل الراقية'
                : "Deux univers d'exception : haute parfumerie et cosmétique de prestige"}
            </h2>
            <div className="mt-6 h-px w-24 bg-gold-gradient" aria-hidden="true" />
          </div>

          <div className="lg:col-span-7 space-y-5 text-sm sm:text-base text-[#FAF8F5]/75 leading-relaxed">
            {isAr ? (
              <>
                <p>
                  في قلب مدينة طنجة بالعنوان{' '}
                  <span className="text-[#DFC48B]">
                    <LatinNumber value="2" /> شارع فلورنسيا، طنجة <LatinNumber value="90060" />، المغرب
                  </span>
                  ، تجمع <strong className="text-[#FAF8F5] font-medium">{STORE_IDENTITY.brand}</strong>{' '}
                  في مكان واحد عطور عربية وفرنسية أصلية <LatinNumber value="100%" /> ومنتجات عناية
                  فاخرة للوجه والجسم، إلى جانب تشكيلة راقية من المكياج والسيرومات المختارة بعناية.
                </p>
                <p>
                  نعمل داخل دولة المغرب فقط، حيث يرافقكم فريقنا بالاستشارة الشخصية عبر واتساب وفي
                  المتجر لاختيار العطر المميّز أو روتين العناية المناسب لكم، مع توصيل سريع خلال{' '}
                  <LatinNumber value="24" /> إلى <LatinNumber value="48" /> ساعة إلى جميع أنحاء
                  المغرب.
                </p>
              </>
            ) : (
              <>
                <p>
                  Installée au cœur de Tanger au{' '}
                  <span translate="no" className="notranslate text-[#DFC48B]">
                    {STORE_IDENTITY.addressFr}
                  </span>
                  , <strong className="text-[#FAF8F5] font-medium">{STORE_IDENTITY.brand}</strong> réunit
                  dans un même écrin des parfums arabes et français 100 % authentiques et des soins de
                  luxe pour le visage et le corps, complétés par une sélection pointue de maquillage.
                </p>
                <p>
                  Nous opérons exclusivement au Maroc : notre équipe conseille chaque client sur
                  WhatsApp et en boutique pour choisir son parfum ou bâtir son rituel beauté, avec
                  livraison rapide sous <LatinNumber value="24" /> à <LatinNumber value="48" />h
                  partout au Maroc.
                </p>
              </>
            )}

            <div className="pt-5 grid grid-cols-3 gap-6 border-t border-[#C5A059]/20 text-start">
              <div>
                <p className="font-display text-2xl sm:text-3xl text-[#DFC48B] tabular-nums">
                  <LatinNumber value="100%" />
                </p>
                <p
                  className={`text-[11px] text-[#A8A29A] mt-1 ${
                    isAr ? '' : 'uppercase tracking-[0.12em]'
                  }`}
                >
                  {isAr ? 'منتجات أصلية' : 'Produits Authentiques'}
                </p>
              </div>
              <div>
                <p className="font-display text-2xl sm:text-3xl text-[#DFC48B] tabular-nums">
                  <LatinNumber value="2" /> {isAr ? 'عوالم' : 'Univers'}
                </p>
                <p
                  className={`text-[11px] text-[#A8A29A] mt-1 ${
                    isAr ? '' : 'uppercase tracking-[0.12em]'
                  }`}
                >
                  {isAr ? 'عطور ومستحضرات تجميل' : 'Parfums & Cosmétiques'}
                </p>
              </div>
              <div>
                <p className="font-display text-2xl sm:text-3xl text-[#DFC48B] tabular-nums">
                  {isAr ? 'المغرب فقط' : 'Maroc'}
                </p>
                <p
                  className={`text-[11px] text-[#A8A29A] mt-1 ${
                    isAr ? '' : 'uppercase tracking-[0.12em]'
                  }`}
                >
                  {isAr ? 'توصيل لجميع أنحاء المغرب' : 'Livraison Maroc Uniquement'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
