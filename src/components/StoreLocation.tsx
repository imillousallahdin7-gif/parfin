import React, { useEffect, useRef, useState } from 'react';
import { Clock, MapPin, MessageCircle, Navigation, Phone } from 'lucide-react';
import { STORE_IDENTITY } from '../types/catalog';
import { buildWhatsAppDirectUrl } from '../utils/format';
import { useLanguage } from '../contexts/LanguageContext';
import { LatinNumber } from './LatinDigits';

interface StoreLocationProps {
  whatsappNumber: string;
}

export const StoreLocation: React.FC<StoreLocationProps> = ({ whatsappNumber }) => {
  const { lang, isAr } = useLanguage();
  const [mapReady, setMapReady] = useState(false);
  const mapWrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (mapReady) return;
    const node = mapWrapperRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') {
      setMapReady(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setMapReady(true);
          observer.disconnect();
        }
      },
      { rootMargin: '400px 0px' }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [mapReady]);

  return (
    <section
      id="location"
      aria-label={isAr ? 'متجرنا في طنجة' : 'Notre magasin à Tanger'}
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 sm:pb-24"
    >
      <div className="mb-10">
        <p
          className={`text-[11px] text-[#8A6D3B] mb-2 ${
            isAr ? 'font-medium' : 'uppercase tracking-[0.18em]'
          }`}
        >
          {isAr ? 'متجرنا' : 'Notre Magasin'}
        </p>
        <h2 className="font-display text-3xl sm:text-4xl font-semibold tracking-[0.04em] text-[#111111]">
          {isAr ? 'زوروا متجرنا في طنجة' : 'Visitez la Boutique à Tanger'}
        </h2>
        <p className="mt-1.5 text-sm text-[#6B655E]">
          {isAr
            ? 'عطور أصلية، مستحضرات عناية وتجميل وطقوس جمال متكاملة في قلب طنجة.'
            : 'Parfums originaux, soins cosmétiques et rituels beauté réunis au cœur de Tanger.'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left White Card */}
        <div className="lg:col-span-5 bg-white border border-[#E5DFD5] p-6 sm:p-8 flex flex-col justify-between">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3 pb-5 border-b border-[#E5DFD5]">
              <h3 translate="no" className="notranslate font-brand text-lg sm:text-xl text-[#111111]">
                {STORE_IDENTITY.brand}
              </h3>
              <span
                className={`text-[11px] font-medium text-[#8A6D3B] ${
                  isAr ? '' : 'uppercase tracking-[0.14em]'
                }`}
              >
                {isAr ? 'المتجر مفتوح' : 'Boutique Ouverte'}
              </span>
            </div>

            {/* Address in clean framed surface */}
            <div className="mt-6 p-4 rounded-xl bg-[#FAF8F5] border border-[#E5DFD5]">
              <p
                className={`text-[11px] text-[#8A6D3B] mb-1 ${
                  isAr ? 'font-medium' : 'uppercase tracking-[0.14em]'
                }`}
              >
                {isAr ? 'العنوان' : 'Adresse'}
              </p>
              <p className="text-sm sm:text-base font-medium text-[#111111] flex items-start gap-2">
                <MapPin className="w-4 h-4 text-[#8A6D3B] mt-1 shrink-0" aria-hidden="true" />
                {isAr ? (
                  <span>
                    <LatinNumber value="2" /> شارع فلورنسيا، طنجة <LatinNumber value="90060" />، المغرب
                  </span>
                ) : (
                  <span translate="no" className="notranslate">
                    {STORE_IDENTITY.addressFr}
                  </span>
                )}
              </p>
            </div>

            {/* Phone + Hours */}
            <div className="mt-6 space-y-3 text-sm text-[#111111]/85">
              <div className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-[#8A6D3B] shrink-0" aria-hidden="true" />
                <a
                  href={STORE_IDENTITY.telHref}
                  className="font-medium hover:text-[#8A6D3B] transition-colors tabular-nums"
                >
                  <LatinNumber value={STORE_IDENTITY.phoneDisplay} />
                </a>
              </div>

              <div className="flex items-center gap-2.5">
                <Clock className="w-4 h-4 text-[#8A6D3B] shrink-0" aria-hidden="true" />
                {isAr ? (
                  <span>
                    الإثنين – السبت: <LatinNumber value="10:00" /> - <LatinNumber value="21:00" />
                  </span>
                ) : (
                  <span translate="no" className="notranslate">
                    {STORE_IDENTITY.openingHoursFr}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <a
              href={STORE_IDENTITY.mapsLink}
              target="_blank"
              rel="noopener noreferrer"
              className={`btn-noir-luminous min-h-[46px] px-4 text-xs font-semibold inline-flex items-center justify-center gap-2 whitespace-nowrap ${
                isAr ? '' : 'uppercase tracking-[0.12em]'
              }`}
            >
              <Navigation className="w-4 h-4" />
              <span>{isAr ? 'الموقع على الخريطة' : 'Itinéraire Maps'}</span>
            </a>

            <a
              href={buildWhatsAppDirectUrl(whatsappNumber, undefined, lang)}
              target="_blank"
              rel="noopener noreferrer"
              className={`btn-whatsapp-luminous min-h-[46px] px-4 text-xs font-semibold inline-flex items-center justify-center gap-2 whitespace-nowrap ${
                isAr ? '' : 'uppercase tracking-[0.12em]'
              }`}
            >
              <MessageCircle className="w-4 h-4" />
              <span>{isAr ? 'واتساب' : 'WhatsApp'}</span>
            </a>
          </div>
        </div>

        {/* Right Free Google Maps Iframe Embed (lazy-mounted on scroll) */}
        <div
          ref={mapWrapperRef}
          className="lg:col-span-7 relative min-h-[340px] sm:min-h-[420px] bg-[#F3EFE8] border border-[#E5DFD5] overflow-hidden"
        >
          {mapReady ? (
            <iframe
              title={
                isAr
                  ? 'موقع متجر بارفومري الخليفي بطنجة'
                  : 'Localisation PARFUMERIE EL KHALIFI à Tanger'
              }
              src={STORE_IDENTITY.mapsEmbedUrl}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="w-full h-full min-h-[340px] sm:min-h-[420px] border-0"
              allowFullScreen
            />
          ) : (
            <div className="w-full h-full min-h-[340px] sm:min-h-[420px] flex flex-col items-center justify-center gap-3 p-6 text-center">
              <MapPin className="w-7 h-7 text-[#8A6D3B]" aria-hidden="true" />
              <p className="text-xs uppercase tracking-[0.14em] text-[#6B655E]">
                {isAr ? STORE_IDENTITY.addressAr : STORE_IDENTITY.addressFr}
              </p>
              <button
                type="button"
                onClick={() => setMapReady(true)}
                className="btn-secondary-invert px-4 py-2 text-xs uppercase tracking-[0.12em] font-medium"
              >
                {isAr ? 'عرض الخريطة' : 'Afficher la carte'}
              </button>
            </div>
          )}
          <div className="absolute top-4 start-4 bg-[#0A0A0A]/95 text-[#FAF8F5] border border-[#C5A059]/45 px-4 py-2.5 pointer-events-none">
            <p translate="no" className="notranslate font-brand text-xs text-[#DFC48B]">
              {STORE_IDENTITY.brand}
            </p>
            <p className="text-[11px] text-[#FAF8F5]/80 mt-0.5">
              {isAr ? (
                <>
                  <LatinNumber value="2" /> شارع فلورنسيا، طنجة <LatinNumber value="90060" />، المغرب
                </>
              ) : (
                <span translate="no" className="notranslate">
                  {STORE_IDENTITY.addressFr}
                </span>
              )}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
