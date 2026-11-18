import React, { useEffect, useRef, useState } from 'react';
import { ShoppingBag } from 'lucide-react';
import { AppRoute, STORE_IDENTITY } from '../types/catalog';
import { BrandLogo } from './BrandLogo';

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

  return (
    <>
      {/* Static slim announcement strip above sticky header so sticky bar never changes height or jumps */}
      <div className="w-full h-[30px] bg-[#0A0A0A] border-b border-[#C5A059]/20 px-4 flex items-center justify-center gap-3 text-[10px] sm:text-[11px] uppercase tracking-[0.14em] text-[#DFC48B] whitespace-nowrap overflow-hidden">
        <span className="truncate">{announcementText || STORE_IDENTITY.announcementFr}</span>
        <span className="text-[#C5A059] hidden sm:inline" aria-hidden="true">
          •
        </span>
        <span className="hidden sm:inline shrink-0">Livraison dans tout le Maroc</span>
        <span className="text-[#C5A059] hidden md:inline" aria-hidden="true">
          •
        </span>
        <span className="hidden md:inline shrink-0">Tanger, Maroc</span>
      </div>

      {/* Fixed-height, zero-jitter sticky navigation bar */}
      <header className="sticky top-0 z-40 w-full bg-[#0A0A0A]/95 backdrop-blur-md text-[#FAF8F5] border-b border-[#C5A059]/25">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          {/* Mobile Header (<768px): fixed 64px, 3-column grid */}
          <div className="md:hidden grid grid-cols-[1fr_auto_1fr] items-center h-[64px]">
            <div className="flex items-center justify-start">
              <button
                type="button"
                onClick={onToggleMenu}
                aria-label={menuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
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
              className="flex items-center gap-2 min-w-0"
            >
              <BrandLogo sizeClass="w-10 h-10" />
              <span className="font-brand text-[11px] sm:text-xs text-[#DFC48B] whitespace-nowrap">
                {STORE_IDENTITY.brand}
              </span>
            </button>

            <div className="flex items-center justify-end">
              <button
                type="button"
                onClick={onOpenCart}
                aria-label="Ouvrir le panier"
                className="relative w-11 h-11 rounded-xl flex items-center justify-center text-[#FAF8F5] hover:text-[#DFC48B] hover:bg-[#C5A059]/10 active:scale-95 transition-all"
              >
                <ShoppingBag className="w-5 h-5" strokeWidth={1.5} />
                {cartCount > 0 && (
                  <span
                    className={`absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-gradient-to-br from-[#E8D29E] to-[#C5A059] text-[#0A0A0A] text-[10px] font-semibold flex items-center justify-center tabular-nums shadow-[0_0_10px_rgba(197,160,89,0.65)] transition-transform duration-200 ${
                      badgePop ? 'scale-125' : 'scale-100'
                    }`}
                  >
                    {cartCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Desktop Header (>=768px): fixed 72px, clean 3-zone lockup (Brand Left · Nav Center · Actions Right) */}
          <div className="hidden md:flex items-center justify-between gap-8 h-[72px]">
            {/* Zone 1: Brand Mark & Single-Line Wordmark */}
            <button
              type="button"
              onClick={() => onNavigate('home')}
              className="flex items-center gap-3 shrink-0"
            >
              <BrandLogo sizeClass="w-11 h-11 border border-[#C5A059]/30" />
              <span className="font-brand text-sm lg:text-[15px] text-gold-gradient whitespace-nowrap">
                {STORE_IDENTITY.brand}
              </span>
            </button>

            {/* Zone 2: Clean Single-Line Navigation Links (crawlable anchors + SPA navigation) */}
            <nav className="flex items-center gap-5 lg:gap-7" aria-label="Navigation principale">
              {[
                { label: 'Boutique', href: '/shop', action: () => onNavigate('shop') },
                { label: 'Nos Packs', href: '/packs-women', action: () => onNavigate('packs-women') },
                { label: 'Notre histoire', href: '/#story', action: () => onNavigate('home', 'story') },
                { label: 'Notre Magasin', href: '/#location', action: () => onNavigate('home', 'location') },
                { label: 'Contact', href: '/#contact', action: () => onNavigate('home', 'contact') },
              ].map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  onClick={(e) => {
                    if (!e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
                      e.preventDefault();
                      item.action();
                    }
                  }}
                  className="group relative py-2 text-xs uppercase tracking-[0.1em] text-[#FAF8F5]/85 hover:text-[#DFC48B] transition-colors whitespace-nowrap shrink-0"
                >
                  {item.label}
                  <span className="absolute left-0 bottom-1 w-full h-px bg-[#C5A059] scale-x-0 group-hover:scale-x-100 transition-transform duration-200 origin-left" />
                </a>
              ))}
            </nav>

            {/* Zone 3: Socials + Bag */}
            <div className="flex items-center justify-end gap-1.5 shrink-0">
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
                aria-label="Ouvrir le panier"
                className="relative min-w-[44px] h-10 px-2.5 rounded-xl border border-[#C5A059]/25 hover:border-[#C5A059]/60 bg-[#C5A059]/5 hover:bg-[#C5A059]/15 flex items-center justify-center gap-2 text-[#FAF8F5] hover:text-[#DFC48B] hover:shadow-[0_0_16px_rgba(197,160,89,0.28)] active:scale-95 transition-all"
              >
                <ShoppingBag className="w-5 h-5" strokeWidth={1.5} />
                <span
                  className={`min-w-[20px] h-[20px] px-1.5 rounded-full bg-gradient-to-br from-[#E8D29E] to-[#C5A059] text-[#0A0A0A] text-[11px] font-semibold flex items-center justify-center tabular-nums shadow-[0_0_10px_rgba(197,160,89,0.55)] transition-transform duration-200 ${
                    badgePop ? 'scale-125' : 'scale-100'
                  }`}
                >
                  {cartCount}
                </span>
              </button>
            </div>
          </div>
        </div>
      </header>
    </>
  );
};
