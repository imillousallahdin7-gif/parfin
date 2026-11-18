import React, { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { AppRoute } from '../types/catalog';

interface HeroProps {
  onExplore: () => void;
  onNavigate?: (route: AppRoute) => void;
}

export const Hero: React.FC<HeroProps> = ({ onExplore, onNavigate }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const id = window.requestAnimationFrame(() => setVisible(true));
    return () => window.cancelAnimationFrame(id);
  }, []);

  return (
    <section
      aria-label="Accueil PARFUMERIE EL KHALIFI"
      className="relative min-h-[76vh] sm:min-h-[84vh] bg-[#0A0A0A] text-[#FAF8F5] overflow-hidden flex items-center"
    >
      {/* Full-bleed responsive perfume photography (completely unobstructed) */}
      <picture className="absolute inset-0 w-full h-full pointer-events-none">
        <source media="(min-width: 768px)" srcSet="/assets/hero/hero-desktop.webp" />
        <img
          src="/assets/hero/hero-mobile.webp"
          alt="Flacons de haute parfumerie PARFUMERIE EL KHALIFI"
          className="w-full h-full object-cover object-center sm:object-right opacity-80"
          fetchPriority="high"
        />
      </picture>

      {/* Directional dark editorial scrim for crisp contrast on left text while preserving bottle highlights */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/55 to-[#0A0A0A]/35 md:bg-gradient-to-r md:from-[#0A0A0A]/95 md:via-[#0A0A0A]/65 md:to-transparent pointer-events-none"
      />
      {/* 4% SVG Fractal-Noise Grain strictly on Hero */}
      <div aria-hidden="true" className="absolute inset-0 hero-grain pointer-events-none" />

      {/* Editorial Foreground Content */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 py-16 sm:py-24">
        <div
          className={`max-w-xl transition-all duration-700 ease-out ${
            visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          <div className="flex items-center gap-3 mb-5">
            <span className="h-px w-8 bg-[#C5A059]" aria-hidden="true" />
            <p className="text-[11px] uppercase tracking-[0.22em] text-[#DFC48B]">
              Édition 2026 · Tanger
            </p>
          </div>

          <h1 className="font-display text-4xl sm:text-5xl lg:text-[58px] leading-[1.08] font-semibold tracking-[-0.02em] text-[#FAF8F5] [text-wrap:balance]">
            L&apos;élégance d&apos;un parfum, la signature de votre style
          </h1>

          <p className="mt-5 text-sm sm:text-base text-[#FAF8F5]/75 leading-relaxed max-w-md">
            Flacons scellés d&apos;origine et décants de précision 5 ml &amp; 10 ml. Une sélection
            française, orientale et de niche livrée partout au Maroc.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3.5">
            <button
              type="button"
              onClick={onExplore}
              className="group btn-gold-luminous inline-flex items-center gap-3 px-7 py-4 text-xs uppercase tracking-[0.16em] font-semibold min-h-[48px] whitespace-nowrap"
            >
              <span>Découvrir la Collection</span>
              <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
            </button>

            {onNavigate && (
              <button
                type="button"
                onClick={() => onNavigate('packs-women')}
                className="btn-outline-luminous inline-flex items-center gap-2 px-6 py-4 text-xs uppercase tracking-[0.16em] font-medium min-h-[48px] whitespace-nowrap"
              >
                <span>Nos Packs</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
