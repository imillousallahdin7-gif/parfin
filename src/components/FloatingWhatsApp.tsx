import React, { useEffect, useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { buildWhatsAppDirectUrl } from '../utils/format';
import { useLanguage } from '../contexts/LanguageContext';

interface FloatingWhatsAppProps {
  whatsappNumber: string;
  elevateMobile: boolean;
}

export const FloatingWhatsApp: React.FC<FloatingWhatsAppProps> = ({
  whatsappNumber,
  elevateMobile,
}) => {
  const { lang, isAr } = useLanguage();
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    const showTimer = window.setTimeout(() => {
      setShowTooltip(true);
    }, 3000);

    const hideTimer = window.setTimeout(() => {
      setShowTooltip(false);
    }, 8500);

    return () => {
      window.clearTimeout(showTimer);
      window.clearTimeout(hideTimer);
    };
  }, []);

  return (
    <div
      className={`fixed end-4 sm:end-6 z-40 flex items-center gap-3 transition-all duration-300 ${
        elevateMobile ? 'bottom-24 md:bottom-6' : 'bottom-5 sm:bottom-6'
      }`}
      style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div
        className={`pointer-events-none px-3.5 py-2 bg-[#0A0A0A] text-[#DFC48B] border border-[#C5A059]/45 text-xs font-medium whitespace-nowrap shadow-lg transition-all duration-500 ${
          showTooltip ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-2 rtl:-translate-x-2'
        }`}
      >
        {isAr ? 'اطلب عبر واتساب' : 'Commander sur WhatsApp'}
      </div>

      <a
        href={buildWhatsAppDirectUrl(whatsappNumber, undefined, lang)}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={isAr ? 'اطلب عبر واتساب' : 'Commander sur WhatsApp'}
        className="relative w-[58px] h-[58px] rounded-full bg-gradient-to-br from-[#28DC6C] to-[#19A851] text-white border border-emerald-200/50 flex items-center justify-center shadow-[0_10px_28px_-4px_rgba(37,211,102,0.65)] transition-all duration-200 hover:-translate-y-0.5 hover:scale-105 hover:shadow-[0_14px_34px_-4px_rgba(37,211,102,0.8)] active:scale-95"
      >
        <span
          aria-hidden="true"
          className="absolute inset-0 rounded-full bg-[#25D366] animate-ping opacity-30"
        />
        <MessageCircle className="w-7 h-7 relative z-10" strokeWidth={2} />
      </a>
    </div>
  );
};
