import React, { useEffect } from 'react';
import { X, MessageCircle, Lock } from 'lucide-react';
import { AppRoute, STORE_IDENTITY } from '../types/catalog';
import { buildWhatsAppDirectUrl } from '../utils/format';
import { BrandLogo } from './BrandLogo';

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

  const links: Array<{ num: string; label: string; action: () => void }> = [
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
      aria-label="Menu de navigation"
      className="fixed inset-0 z-50 bg-[#0A0A0A] text-[#FAF8F5] flex flex-col justify-between overflow-y-auto px-6 py-6 sm:px-10 sm:py-8"
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-[0.18em] text-[#C5A059]">
          {STORE_IDENTITY.brand}
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer le menu"
          className="w-11 h-11 flex items-center justify-center text-[#FAF8F5] hover:text-[#DFC48B] border border-[#C5A059]/30 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="max-w-xl w-full mx-auto my-8 flex flex-col items-center text-center">
        <BrandLogo sizeClass="w-[130px] h-[130px] mb-8" glow />

        <nav className="w-full space-y-2" aria-label="Menu principal mobile">
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
              <span className="text-xs font-mono text-[#C5A059] tabular-nums">{item.num}</span>
              <span className="text-[#A8A29A]">/</span>
              <span className="font-display text-2xl sm:text-3xl tracking-[0.06em] uppercase">
                {item.label}
              </span>
            </button>
          ))}
        </nav>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <a
            href={STORE_IDENTITY.instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2.5 text-xs uppercase tracking-[0.12em] border border-[#C5A059]/40 text-[#DFC48B] hover:bg-[#C5A059] hover:text-[#0A0A0A] transition-colors"
          >
            Instagram
          </a>
          <a
            href={STORE_IDENTITY.tiktokUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2.5 text-xs uppercase tracking-[0.12em] border border-[#C5A059]/40 text-[#DFC48B] hover:bg-[#C5A059] hover:text-[#0A0A0A] transition-colors"
          >
            TikTok
          </a>
          <a
            href={buildWhatsAppDirectUrl(whatsappNumber)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 text-xs uppercase tracking-[0.12em] bg-[#25D366] hover:bg-[#1EBE5D] text-white transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
            WhatsApp Direct
          </a>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-[#C9A24D]/15 text-xs text-[#8C857B]">
        <span>{STORE_IDENTITY.addressFr}</span>
        <button
          type="button"
          onClick={() => {
            onClose();
            onNavigate('admin');
          }}
          className="inline-flex items-center gap-1.5 py-2 px-2 text-[#8C857B] hover:text-[#C9A24D] transition-colors"
        >
          <Lock className="w-3.5 h-3.5" />
          <span>Accès Curateur</span>
        </button>
      </div>
    </div>
  );
};
