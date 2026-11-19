import React, { useEffect } from 'react';
import { Languages, Lock, MessageCircle, X } from 'lucide-react';
import { AppRoute, STORE_IDENTITY } from '../types/catalog';
import { buildWhatsAppDirectUrl } from '../utils/format';
import { useLanguage } from '../contexts/LanguageContext';
import { BrandLogo } from './BrandLogo';
import { LatinNumber } from './LatinDigits';

interface NavigationOverlayProps {
  open: boolean;
  whatsappNumber: string;
  onClose: () => void;
  onNavigate: (route: AppRoute, sectionId?: string) => void;
}

export const NavigationOverlay: React.FC<NavigationOverlayProps> = ({
  open,
  whatsappNumber,
  onClose,
  onNavigate,
}) => {
  const { lang, isAr, toggleLang } = useLanguage();

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  const links: Array<{ num: string; label: string; action: () => void }> = isAr
    ? [
        { num: '01', label: 'المتجر', action: () => onNavigate('shop') },
        { num: '02', label: 'الباقات', action: () => onNavigate('packs-women') },
        { num: '03', label: 'قصتنا', action: () => onNavigate('home', 'story') },
        { num: '04', label: 'متجرنا', action: () => onNavigate('home', 'location') },
        { num: '05', label: 'تواصل معنا', action: () => onNavigate('home', 'contact') },
      ]
    : [
        { num: '01', label: 'Boutique', action: () => onNavigate('shop') },
        { num: '02', label: 'Nos Packs', action: () => onNavigate('packs-women') },
        { num: '03', label: 'Notre histoire', action: () => onNavigate('home', 'story') },
        { num: '04', label: 'Notre Magasin', action: () => onNavigate('home', 'location') },
        { num: '05', label: 'Contact', action: () => onNavigate('home', 'contact') },
      ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={isAr ? 'قائمة التنقل' : 'Menu de navigation'}
      className="fixed inset-0 z-50 bg-[#0A0A0A] text-[#FAF8F5] flex flex-col justify-between overflow-y-auto px-6 py-6 sm:px-10 sm:py-8"
    >
      <div className="flex items-center justify-between gap-3">
        <span translate="no" className="notranslate text-[11px] uppercase tracking-[0.18em] text-[#C5A059]">
          {STORE_IDENTITY.brand}
        </span>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleLang}
            aria-label={isAr ? 'Passer en français' : 'التبديل إلى اللغة العربية'}
            className="h-11 px-3.5 rounded-xl border border-[#C5A059]/35 hover:border-[#DFC48B] bg-[#C5A059]/10 hover:bg-[#C5A059]/20 flex items-center justify-center gap-2 text-[#DFC48B] text-xs font-semibold whitespace-nowrap transition-colors"
          >
            <Languages className="w-4 h-4 text-[#C5A059]" />
            <span translate="no" className="notranslate">
              {isAr ? 'Français' : 'العربية'}
            </span>
          </button>

          <button
            type="button"
            onClick={onClose}
            aria-label={isAr ? 'إغلاق القائمة' : 'Fermer le menu'}
            className="w-11 h-11 flex items-center justify-center text-[#FAF8F5] hover:text-[#DFC48B] border border-[#C5A059]/30 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="max-w-xl w-full mx-auto my-8 flex flex-col items-center text-center">
        <BrandLogo sizeClass="w-[130px] h-[130px] mb-8" glow />

        <nav className="w-full space-y-2" aria-label={isAr ? 'قائمة الهاتف الرئيسية' : 'Menu principal mobile'}>
          {links.map((item) => (
            <button
              key={item.num}
              type="button"
              onClick={() => {
                onClose();
                item.action();
              }}
              className="w-full py-3.5 px-4 flex items-center justify-center gap-4 border-b border-[#C5A059]/15 hover:border-[#C5A059] text-[#FAF8F5] hover:text-[#DFC48B] transition-colors"
            >
              <LatinNumber value={item.num} className="text-xs font-mono text-[#C5A059]" />
              <span className="text-[#A8A29A]">/</span>
              <span
                className={`font-display text-2xl sm:text-3xl ${
                  isAr ? '' : 'tracking-[0.06em] uppercase'
                }`}
              >
                {item.label}
              </span>
            </button>
          ))}
        </nav>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3.5">
          <a
            href={STORE_IDENTITY.instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-outline-luminous px-4 py-2.5 text-xs uppercase tracking-[0.12em] whitespace-nowrap"
          >
            Instagram
          </a>
          <a
            href={STORE_IDENTITY.tiktokUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-outline-luminous px-4 py-2.5 text-xs uppercase tracking-[0.12em] whitespace-nowrap"
          >
            TikTok
          </a>
          <a
            href={buildWhatsAppDirectUrl(whatsappNumber, undefined, lang)}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-whatsapp-luminous inline-flex items-center gap-2 px-5 py-2.5 text-xs uppercase tracking-[0.12em] font-semibold whitespace-nowrap"
          >
            <MessageCircle className="w-4 h-4" />
            <span>{isAr ? 'واتساب مباشر' : 'WhatsApp Direct'}</span>
          </a>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-[#C9A24D]/15 text-xs text-[#8C857B]">
        {isAr ? (
          <span>
            <LatinNumber value="2" /> شارع فلورنسيا، طنجة <LatinNumber value="90060" />، المغرب
          </span>
        ) : (
          <span translate="no" lang="fr" className="notranslate">
            {STORE_IDENTITY.addressFr}
          </span>
        )}
        <button
          type="button"
          onClick={() => {
            onClose();
            onNavigate('admin');
          }}
          className="inline-flex items-center gap-1.5 py-2 px-2 text-[#8C857B] hover:text-[#C9A24D] transition-colors"
        >
          <Lock className="w-3.5 h-3.5" />
          <span>{isAr ? 'لوحة الإدارة' : 'Accès Curateur'}</span>
        </button>
      </div>
    </div>
  );
};
