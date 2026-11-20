import React from 'react';
import { Lock, MessageCircle } from 'lucide-react';
import { AppRoute, STORE_IDENTITY } from '../types/catalog';
import { buildWhatsAppDirectUrl } from '../utils/format';
import { useLanguage } from '../contexts/LanguageContext';
import { BrandLogo } from './BrandLogo';
import { LatinNumber, LatinPrice } from './LatinDigits';

interface FooterProps {
  whatsappNumber: string;
  deliveryFeeLocal?: number;
  deliveryFeeNational?: number;
  onNavigate: (route: AppRoute, sectionId?: string) => void;
}

export const Footer: React.FC<FooterProps> = ({
  whatsappNumber,
  deliveryFeeLocal = 20,
  deliveryFeeNational = 35,
  onNavigate,
}) => {
  const { lang, isAr } = useLanguage();
  const currentYear = new Date().getFullYear();

  return (
    <footer
      id="contact"
      className="bg-[#0A0A0A] text-[#FAF8F5] border-t border-[#C5A059]/30 pt-16 pb-10"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Centered Brand Showcase */}
        <div className="flex flex-col items-center text-center pb-12 border-b border-[#C5A059]/20">
          <BrandLogo sizeClass="w-[140px] h-[140px] mb-5 border border-[#C5A059]/35" glow />

          <h2 translate="no" className="notranslate font-brand text-xl sm:text-2xl text-gold-gradient">
            {STORE_IDENTITY.brand}
          </h2>
          <p
            className={`text-xs text-[#A8A29A] mt-1.5 ${
              isAr ? '' : 'uppercase tracking-[0.18em]'
            }`}
          >
            {isAr ? 'عطور ومستحضرات تجميل فاخرة' : STORE_IDENTITY.taglineFr}
          </p>

          <p
            className={`mt-5 text-xs text-[#DFC48B] ${
              isAr ? '' : 'uppercase tracking-[0.14em]'
            }`}
          >
            {isAr ? (
              <>
                خدمة الزبناء: طيلة أيام الأسبوع (<LatinNumber value="7/7" />) من{' '}
                <LatinNumber value="9" /> صباحاً إلى <LatinNumber value="22" /> ليلاً
              </>
            ) : (
              STORE_IDENTITY.conciergeHoursFr
            )}
          </p>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <a
              href={buildWhatsAppDirectUrl(whatsappNumber, undefined, lang)}
              target="_blank"
              rel="noopener noreferrer"
              className={`btn-whatsapp-luminous inline-flex items-center gap-2 px-6 py-3 text-xs font-semibold min-h-[44px] whitespace-nowrap ${
                isAr ? '' : 'uppercase tracking-[0.14em]'
              }`}
            >
              <MessageCircle className="w-4 h-4" />
              <span>{isAr ? 'خدمة العملاء عبر واتساب' : 'Conciergerie WhatsApp'}</span>
            </a>

            <a
              href={STORE_IDENTITY.instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              className="btn-outline-luminous inline-flex items-center gap-2 px-4 py-3 text-xs uppercase tracking-[0.12em] min-h-[44px] whitespace-nowrap"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                <rect x="2" y="2" width="20" height="20" rx="5" />
                <circle cx="12" cy="12" r="4.5" />
                <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
              </svg>
              <span>Instagram</span>
            </a>

            <a
              href={STORE_IDENTITY.tiktokUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="TikTok"
              className="btn-outline-luminous inline-flex items-center gap-2 px-4 py-3 text-xs uppercase tracking-[0.12em] min-h-[44px] whitespace-nowrap"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.76a4.85 4.85 0 0 1-1.01-.07Z" />
              </svg>
              <span>TikTok</span>
            </a>
          </div>
        </div>

        {/* 3 Columns */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 py-12 border-b border-[#C5A059]/20 text-sm">
          <div>
            <h3
              className={`text-xs text-[#C5A059] mb-4 ${
                isAr ? 'font-semibold' : 'uppercase tracking-[0.16em]'
              }`}
            >
              {isAr ? 'عن الدار' : 'La Maison'}
            </h3>
            <p className="text-[#FAF8F5]/75 leading-relaxed mb-3">
              {isAr
                ? 'دار متخصصة في العطور ومستحضرات التجميل بطنجة: عطور عربية وفرنسية أصلية 100% ومنتجات عناية فاخرة للوجه والجسم، مع توصيل حصري لجميع أنحاء المغرب.'
                : 'Maison de parfumerie et cosmétiques à Tanger : parfums arabes et français 100 % authentiques et soins de luxe pour le visage et le corps, livrés exclusivement partout au Maroc.'}
            </p>
            {isAr ? (
              <>
                <p className="text-xs text-[#A8A29A]">
                  <LatinNumber value="2" /> شارع فلورنسيا، طنجة <LatinNumber value="90060" />، المغرب
                </p>
                <p className="text-xs text-[#A8A29A] mt-1">
                  الإثنين – السبت: <LatinNumber value="10:00" /> - <LatinNumber value="21:00" />
                </p>
              </>
            ) : (
              <>
                <p translate="no" className="notranslate text-xs text-[#A8A29A]">
                  {STORE_IDENTITY.addressFr}
                </p>
                <p translate="no" className="notranslate text-xs text-[#A8A29A] mt-1">
                  {STORE_IDENTITY.openingHoursFr}
                </p>
              </>
            )}
          </div>

          <div>
            <h3
              className={`text-xs text-[#C5A059] mb-4 ${
                isAr ? 'font-semibold' : 'uppercase tracking-[0.16em]'
              }`}
            >
              {isAr ? 'تصفح الموقع' : 'Navigation'}
            </h3>
            <ul className="space-y-2.5 text-[#FAF8F5]/80">
              <li>
                <a
                  href="/shop"
                  onClick={(e) => {
                    if (!e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
                      e.preventDefault();
                      onNavigate('shop');
                    }
                  }}
                  className="hover:text-[#DFC48B] transition-colors"
                >
                  {isAr ? 'المتجر الكامل' : 'Boutique complète'}
                </a>
              </li>
              <li>
                <a
                  href="/packs-women"
                  onClick={(e) => {
                    if (!e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
                      e.preventDefault();
                      onNavigate('packs-women');
                    }
                  }}
                  className="hover:text-[#DFC48B] transition-colors"
                >
                  {isAr ? 'باقات النساء' : 'Packs Femme'}
                </a>
              </li>
              <li>
                <a
                  href="/packs-men"
                  onClick={(e) => {
                    if (!e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
                      e.preventDefault();
                      onNavigate('packs-men');
                    }
                  }}
                  className="hover:text-[#DFC48B] transition-colors"
                >
                  {isAr ? 'باقات الرجال' : 'Packs Homme'}
                </a>
              </li>
              <li>
                <a
                  href="/#story"
                  onClick={(e) => {
                    if (!e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
                      e.preventDefault();
                      onNavigate('home', 'story');
                    }
                  }}
                  className="hover:text-[#DFC48B] transition-colors"
                >
                  {isAr ? 'قصتنا' : 'Notre histoire'}
                </a>
              </li>
              <li>
                <a
                  href="/#location"
                  onClick={(e) => {
                    if (!e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
                      e.preventDefault();
                      onNavigate('home', 'location');
                    }
                  }}
                  className="hover:text-[#DFC48B] transition-colors"
                >
                  {isAr ? 'متجرنا' : 'Notre Magasin'}
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3
              className={`text-xs text-[#C5A059] mb-4 ${
                isAr ? 'font-semibold' : 'uppercase tracking-[0.16em]'
              }`}
            >
              {isAr ? 'الطلبات وخدمة العملاء' : 'Commandes & Service Client'}
            </h3>
            <ul className="space-y-2.5 text-[#FAF8F5]/80">
              <li>
                <a
                  href={STORE_IDENTITY.telHref}
                  className="hover:text-[#DFC48B] transition-colors tabular-nums"
                >
                  {isAr ? 'الهاتف:' : 'Tél :'}{' '}
                  <LatinNumber value={STORE_IDENTITY.phoneDisplay} />
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${STORE_IDENTITY.email}`}
                  className="hover:text-[#DFC48B] transition-colors"
                >
                  {STORE_IDENTITY.email}
                </a>
              </li>
              <li className="text-xs text-[#A8A29A]">
                {isAr ? (
                  <>
                    التوصيل داخل المغرب فقط — طنجة: <LatinPrice amount={deliveryFeeLocal} /> · باقي
                    المدن: <LatinPrice amount={deliveryFeeNational} />
                  </>
                ) : (
                  <>
                    Livraison au Maroc uniquement — Tanger :{' '}
                    <LatinPrice amount={deliveryFeeLocal} /> · Partout au Maroc :{' '}
                    <LatinPrice amount={deliveryFeeNational} />
                  </>
                )}
              </li>
              <li className="pt-2">
                <button
                  type="button"
                  onClick={() => onNavigate('admin')}
                  className={`inline-flex items-center gap-1.5 text-xs text-[#A8A29A] hover:text-[#DFC48B] transition-colors ${
                    isAr ? '' : 'uppercase tracking-[0.12em]'
                  }`}
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>{isAr ? 'لوحة الإدارة' : 'Accès Curateur'}</span>
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#A8A29A]">
          <p>
            © <LatinNumber value={currentYear} /> {STORE_IDENTITY.brand}.{' '}
            {isAr ? 'جميع الحقوق محفوظة.' : 'Tous droits réservés.'}
          </p>
          <p translate="no" className="notranslate">
            {STORE_IDENTITY.handle}
          </p>
        </div>
      </div>
    </footer>
  );
};
