import React, { useEffect, useRef, useState } from 'react';
import { Languages, ShoppingBag } from 'lucide-react';
import { AppRoute, STORE_IDENTITY } from '../types/catalog';
import { useLanguage } from '../contexts/LanguageContext';
import { BrandLogo } from './BrandLogo';
import { LatinNumber } from './LatinDigits';

interface HeaderProps {
  announcementText: string;
  cartCount: number;
  menuOpen: boolean;
  onToggleMenu: () => void;
  onOpenCart: () => void;
  onNavigate: (route: AppRoute, sectionId?: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  announcementText,
  cartCount,
  menuOpen,
  onToggleMenu,
  onOpenCart,
  onNavigate,
}) => {
  const { isAr, toggleLang } = useLanguage();
  const [badgePop, setBadgePop] = useState(false);
  const prevCartCount = useRef(cartCount);

  useEffect(() => {
    if (cartCount > prevCartCount.current) {
      setBadgePop(true);
      const t = window.setTimeout(() => setBadgePop(false), 320);
      prevCartCount.current = cartCount;
      return () => window.clearTimeout(t);
    }
    prevCartCount.current = cartCount;
  }, [cartCount]);

  const navItems = isAr
    ? [
        { label: 'المتجر', href: '/shop', action: () => onNavigate('shop') },
        { label: 'الباقات', href: '/packs-women', action: () => onNavigate('packs-women') },
        { label: 'قصتنا', href: '/#story', action: () => onNavigate('home', 'story') },
        { label: 'متجرنا', href: '/#location', action: () => onNavigate('home', 'location') },
        { label: 'تواصل معنا', href: '/#contact', action: () => onNavigate('home', 'contact') },
      ]
    : [
        { label: 'Boutique', href: '/shop', action: () => onNavigate('shop') },
        { label: 'Nos Packs', href: '/packs-women', action: () => onNavigate('packs-women') },
        { label: 'Notre histoire', href: '/#story', action: () => onNavigate('home', 'story') },
        { label: 'Notre Magasin', href: '/#location', action: () => onNavigate('home', 'location') },
        { label: 'Contact', href: '/#contact', action: () => onNavigate('home', 'contact') },
      ];

  return (
    <>
      {/* Static slim announcement strip above sticky header so sticky bar never changes height or jumps */}
      <div className="w-full h-[30px] bg-[#0A0A0A] border-b border-[#C5A059]/20 px-4 flex items-center justify-center gap-3 text-[10px] sm:text-[11px] uppercase tracking-[0.14em] text-[#DFC48B] whitespace-nowrap overflow-hidden">
        <span className="truncate">{announcementText || STORE_IDENTITY.announcementFr}</span>
        <span className="text-[#C5A059] hidden sm:inline" aria-hidden="true">
          •
        </span>
        <span className="hidden sm:inline shrink-0">
          {isAr ? 'التوصيل لجميع مدن المغرب' : 'Livraison dans tout le Maroc'}
        </span>
        <span className="text-[#C5A059] hidden md:inline" aria-hidden="true">
          •
        </span>
        <span className="hidden md:inline shrink-0">
          {isAr ? 'طنجة، المغرب' : 'Tanger, Maroc'}
        </span>
      </div>

      {/* Fixed-height, zero-jitter sticky navigation bar */}
      <header className="sticky top-0 z-40 w-full bg-[#0A0A0A]/95 backdrop-blur-md text-[#FAF8F5] border-b border-[#C5A059]/25">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          {/* Mobile Header (<768px): fixed 64px */}
          <div className="md:hidden flex items-center justify-between gap-2 h-[64px]">
            <div className="flex items-center shrink-0">
              <button
                type="button"
                onClick={onToggleMenu}
                aria-label={
                  menuOpen
                    ? isAr
                      ? 'إغلاق القائمة'
                      : 'Fermer le menu'
                    : isAr
                    ? 'فتح القائمة'
                    : 'Ouvrir le menu'
                }
                aria-expanded={menuOpen}
                className="w-11 h-11 flex flex-col items-center justify-center gap-1.5 text-[#FAF8F5] hover:text-[#DFC48B] transition-colors"
              >
                <span
                  className={`block w-5 h-px bg-current transition-transform duration-200 ${
                    menuOpen ? 'translate-y-[3.5px] rotate-45' : ''
                  }`}
                />
                <span
                  className={`block w-5 h-px bg-current transition-transform duration-200 ${
                    menuOpen ? '-translate-y-[3.5px] -rotate-45' : ''
                  }`}
                />
              </button>
            </div>

            <button
              type="button"
              onClick={() => onNavigate('home')}
              className="flex items-center gap-2 min-w-0 justify-center"
            >
              <BrandLogo sizeClass="w-9 h-9 sm:w-10 sm:h-10 shrink-0" />
              <span
                translate="no"
                className="notranslate font-brand text-[10px] sm:text-xs text-[#DFC48B] whitespace-nowrap truncate max-w-[140px] sm:max-w-none"
              >
                {STORE_IDENTITY.brand}
              </span>
            </button>

            <div className="flex items-center justify-end gap-1 shrink-0">
              <button
                type="button"
                onClick={toggleLang}
                aria-label={isAr ? 'Passer en français' : 'التبديل إلى اللغة العربية'}
                title={isAr ? 'Français' : 'العربية'}
                className="min-w-[44px] h-10 px-2 rounded-xl border border-[#C5A059]/35 hover:border-[#DFC48B] bg-[#C5A059]/10 hover:bg-[#C5A059]/20 flex items-center justify-center gap-1 text-[#DFC48B] hover:text-[#FAF8F5] text-[11px] font-semibold whitespace-nowrap shrink-0 active:scale-95 transition-all"
              >
                <Languages className="w-3.5 h-3.5 text-[#C5A059] shrink-0" strokeWidth={1.7} />
                <span translate="no" className="notranslate">
                  {isAr ? 'FR' : 'عربي'}
                </span>
              </button>

              <button
                type="button"
                onClick={onOpenCart}
                aria-label={isAr ? 'فتح السلة' : 'Ouvrir le panier'}
                className="relative w-11 h-11 rounded-xl flex items-center justify-center text-[#FAF8F5] hover:text-[#DFC48B] hover:bg-[#C5A059]/10 active:scale-95 transition-all"
              >
                <ShoppingBag className="w-5 h-5" strokeWidth={1.5} />
                {cartCount > 0 && (
                  <span
                    className={`absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-gradient-to-br from-[#E8D29E] to-[#C5A059] text-[#0A0A0A] text-[10px] font-semibold flex items-center justify-center tabular-nums shadow-[0_0_10px_rgba(197,160,89,0.65)] transition-transform duration-200 ${
                      badgePop ? 'scale-125' : 'scale-100'
                    }`}
                  >
                    <LatinNumber value={cartCount} />
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Desktop Header (>=768px): fixed 72px, clean 3-zone lockup (Brand · Nav · Actions) */}
          <div className="hidden md:flex items-center justify-between gap-6 lg:gap-8 h-[72px]">
            {/* Zone 1: Brand Mark & Single-Line Wordmark */}
            <button
              type="button"
              onClick={() => onNavigate('home')}
              className="flex items-center gap-3 shrink-0"
            >
              <BrandLogo sizeClass="w-11 h-11 border border-[#C5A059]/30" />
              <span
                translate="no"
                className="notranslate font-brand text-sm lg:text-[15px] text-gold-gradient whitespace-nowrap"
              >
                {STORE_IDENTITY.brand}
              </span>
            </button>

            {/* Zone 2: Clean Single-Line Navigation Links */}
            <nav
              className="flex items-center gap-4 lg:gap-6"
              aria-label={isAr ? 'القائمة الرئيسية' : 'Navigation principale'}
            >
              {navItems.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={(e) => {
                    if (!e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
                      e.preventDefault();
                      item.action();
                    }
                  }}
                  className={`group relative py-2 text-xs ${
                    isAr ? 'tracking-normal font-medium' : 'uppercase tracking-[0.1em]'
                  } text-[#FAF8F5]/85 hover:text-[#DFC48B] transition-colors whitespace-nowrap shrink-0`}
                >
                  {item.label}
                  <span className="absolute left-0 bottom-1 w-full h-px bg-[#C5A059] scale-x-0 group-hover:scale-x-100 transition-transform duration-200 origin-left" />
                </a>
              ))}
            </nav>

            {/* Zone 3: Language Switcher + Socials + Bag */}
            <div className="flex items-center justify-end gap-1.5 shrink-0">
              <button
                type="button"
                onClick={toggleLang}
                aria-label={isAr ? 'Passer en français' : 'التبديل إلى اللغة العربية'}
                title={isAr ? 'Français' : 'العربية'}
                className="min-w-[44px] h-10 px-3 rounded-xl border border-[#C5A059]/35 hover:border-[#DFC48B] bg-[#C5A059]/10 hover:bg-[#C5A059]/20 flex items-center justify-center gap-1.5 text-[#DFC48B] hover:text-[#FAF8F5] text-xs font-semibold whitespace-nowrap shrink-0 hover:shadow-[0_0_16px_rgba(197,160,89,0.28)] active:scale-95 transition-all"
              >
                <Languages className="w-4 h-4 text-[#C5A059] shrink-0" strokeWidth={1.7} />
                <span translate="no" className="notranslate">
                  {isAr ? 'FR' : 'العربية'}
                </span>
              </button>

              <a
                href={STORE_IDENTITY.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram PARFUMERIE EL KHALIFI"
                className="w-10 h-10 rounded-xl flex items-center justify-center text-[#FAF8F5]/80 hover:text-[#DFC48B] hover:bg-[#C5A059]/10 active:scale-95 transition-all"
              >
                <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <rect x="2" y="2" width="20" height="20" rx="5" />
                  <circle cx="12" cy="12" r="4.5" />
                  <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
                </svg>
              </a>
              <a
                href={STORE_IDENTITY.tiktokUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="TikTok PARFUMERIE EL KHALIFI"
                className="w-10 h-10 rounded-xl flex items-center justify-center text-[#FAF8F5]/80 hover:text-[#DFC48B] hover:bg-[#C5A059]/10 active:scale-95 transition-all"
              >
                <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.76a4.85 4.85 0 0 1-1.01-.07Z" />
                </svg>
              </a>

              <button
                type="button"
                onClick={onOpenCart}
                aria-label={isAr ? 'فتح السلة' : 'Ouvrir le panier'}
                className="relative min-w-[44px] h-10 px-2.5 rounded-xl border border-[#C5A059]/25 hover:border-[#C5A059]/60 bg-[#C5A059]/5 hover:bg-[#C5A059]/15 flex items-center justify-center gap-2 text-[#FAF8F5] hover:text-[#DFC48B] hover:shadow-[0_0_16px_rgba(197,160,89,0.28)] active:scale-95 transition-all"
              >
                <ShoppingBag className="w-5 h-5" strokeWidth={1.5} />
                <span
                  className={`min-w-[20px] h-[20px] px-1.5 rounded-full bg-gradient-to-br from-[#E8D29E] to-[#C5A059] text-[#0A0A0A] text-[11px] font-semibold flex items-center justify-center tabular-nums shadow-[0_0_10px_rgba(197,160,89,0.55)] transition-transform duration-200 ${
                    badgePop ? 'scale-125' : 'scale-100'
                  }`}
                >
                  <LatinNumber value={cartCount} />
                </span>
              </button>
            </div>
          </div>
        </div>
      </header>
    </>
  );
};
