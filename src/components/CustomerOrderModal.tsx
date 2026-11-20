import React, { useEffect, useState } from 'react';
import { MessageCircle, Minus, Plus, X } from 'lucide-react';
import { CartItem, MOROCCAN_CITIES } from '../types/catalog';
import {
  buildWhatsAppOrderUrl,
  getDeliveryFee,
  isTangierCity,
  isValidMoroccanPhone,
} from '../utils/format';
import { useLanguage } from '../contexts/LanguageContext';
import { CITY_AR_TO_FR } from '../utils/i18n';
import { LatinNumber, LatinPrice } from './LatinDigits';

interface CustomerOrderModalProps {
  item: CartItem | null;
  whatsappNumber: string;
  deliveryFeeLocal?: number;
  deliveryFeeNational?: number;
  onClose: () => void;
}

export const CustomerOrderModal: React.FC<CustomerOrderModalProps> = ({
  item,
  whatsappNumber,
  deliveryFeeLocal = 20,
  deliveryFeeNational = 35,
  onClose,
}) => {
  const { lang, isAr } = useLanguage();
  const [quantity, setQuantity] = useState(1);
  const [customerName, setCustomerName] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!item) return;
    setQuantity(item.quantity || 1);
    setError(null);
    setGeneratedUrl(null);
  }, [item]);

  useEffect(() => {
    if (!item) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [item, onClose]);

  if (!item) return null;

  const subtotal = item.unitPrice * quantity;
  const deliveryFee = getDeliveryFee(city, deliveryFeeLocal, deliveryFeeNational);
  const total = subtotal + deliveryFee;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!customerName.trim()) {
      setError(isAr ? 'يرجى إدخال اسمك الكامل.' : 'Veuillez saisir votre nom complet.');
      return;
    }
    if (!city.trim()) {
      setError(isAr ? 'يرجى تحديد مدينة التوصيل.' : 'Veuillez indiquer votre ville de livraison.');
      return;
    }
    if (!address.trim()) {
      setError(isAr ? 'يرجى إدخال عنوانك الكامل.' : 'Veuillez renseigner votre adresse complète.');
      return;
    }
    if (!isValidMoroccanPhone(phone)) {
      setError(
        isAr
          ? 'رقم الهاتف المغربي غير صحيح (مثال: 06 10 64 06 66 أو +212610640666).'
          : 'Numéro marocain invalide (ex. 06 10 64 06 66 ou +212610640666).'
      );
      return;
    }

    const url = buildWhatsAppOrderUrl({
      whatsappNumber,
      customerName,
      city,
      address,
      phone,
      items: [{ ...item, quantity }],
      deliveryFeeLocal,
      deliveryFeeNational,
      lang,
    });

    setGeneratedUrl(url);
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={isAr ? 'إتمام الطلب' : 'Finaliser la commande'}
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B0A08]/80 backdrop-blur-xs p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg max-h-[92dvh] overflow-y-auto bg-[#FDFCFA] text-[#0B0A08] rounded-2xl border border-[#DDD3BE] p-6 sm:p-8"
      >
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-[#DDD3BE]">
          <div>
            <p
              className={`text-[11px] text-[#8F6E2E] ${
                isAr ? 'font-medium' : 'uppercase tracking-[0.16em]'
              }`}
            >
              {isAr ? 'طلب سريع عبر واتساب' : 'Commande Rapide WhatsApp'}
            </p>
            <h2 className="font-display text-2xl font-semibold text-[#0B0A08] mt-1">
              {isAr ? 'إتمام طلبك' : 'Finaliser votre commande'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={isAr ? 'إغلاق' : 'Fermer'}
            className="w-10 h-10 rounded-full border border-[#DDD3BE] flex items-center justify-center text-[#0B0A08] hover:bg-[#0B0A08] hover:text-[#F6F1E7] transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Selected Item Summary */}
        <div className="mt-4 p-4 bg-[#F6F1E7] border border-[#DDD3BE] flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-display text-base font-semibold text-[#0B0A08] truncate">
              {item.title}
            </p>
            <p className="text-xs text-[#8C857B] mt-0.5 flex items-center gap-1.5 flex-wrap">
              <span translate="no" className="notranslate">
                {item.sizeLabel}
              </span>
              <span>·</span>
              <LatinPrice amount={item.unitPrice} />
            </p>
          </div>
          <div className="flex items-center border border-[#DDD3BE] bg-[#FDFCFA] shrink-0">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              aria-label={isAr ? 'إنقاص الكمية' : 'Diminuer la quantité'}
              className="w-9 h-9 flex items-center justify-center text-[#0B0A08] hover:bg-[#EAE4DC]"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="w-8 text-center text-xs font-semibold">
              <LatinNumber value={quantity} />
            </span>
            <button
              type="button"
              onClick={() => setQuantity((q) => q + 1)}
              aria-label={isAr ? 'زيادة الكمية' : 'Augmenter la quantité'}
              className="w-9 h-9 flex items-center justify-center text-[#0B0A08] hover:bg-[#EAE4DC]"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* 1. Full Name */}
          <div>
            <label htmlFor="modal-fullname" className="block text-xs font-medium text-[#0B0A08] mb-1.5">
              <LatinNumber value="1" />. {isAr ? 'الاسم الكامل *' : 'Nom complet *'}
            </label>
            <input
              id="modal-fullname"
              type="text"
              required
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder={isAr ? 'مثال: يوسف المنصوري' : 'Ex. Youssef El Mansouri'}
              className="w-full min-h-[44px] px-3.5 bg-[#FDFCFA] border border-[#DDD3BE] text-sm text-[#0B0A08] focus:border-[#C9A24D] focus:outline-none"
            />
          </div>

          {/* 2. City */}
          <div>
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <label htmlFor="modal-city" className="block text-xs font-medium text-[#0B0A08]">
                <LatinNumber value="2" />.{' '}
                {isAr ? 'المدينة (داخل المغرب فقط) *' : 'Ville (Maroc uniquement) *'}
              </label>
              {city.trim() && (
                <span className="text-[11px] font-medium text-[#8F6E2E]">
                  {isTangierCity(city) ? (
                    <>
                      {isAr ? 'التوصيل بطنجة:' : 'Livraison Tanger :'}{' '}
                      <LatinPrice amount={deliveryFeeLocal} />
                    </>
                  ) : (
                    <>
                      {isAr ? 'التوصيل لباقي أنحاء المغرب:' : 'Livraison Maroc :'}{' '}
                      <LatinPrice amount={deliveryFeeNational} />
                    </>
                  )}
                </span>
              )}
            </div>
            <input
              id="modal-city"
              type="text"
              required
              list="moroccan-cities-modal"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder={isAr ? 'اختر أو اكتب مدينتك في المغرب' : 'Sélectionnez votre ville au Maroc'}
              className="w-full min-h-[44px] px-3.5 bg-[#FDFCFA] border border-[#DDD3BE] text-sm text-[#0B0A08] focus:border-[#C9A24D] focus:outline-none"
            />
            <datalist id="moroccan-cities-modal">
              {MOROCCAN_CITIES.map((c) => (
                <option key={c} value={isAr ? CITY_AR_TO_FR[c] || c : c} />
              ))}
            </datalist>
          </div>

          {/* 3. Address */}
          <div>
            <label htmlFor="modal-address" className="block text-xs font-medium text-[#0B0A08] mb-1.5">
              <LatinNumber value="3" />. {isAr ? 'العنوان الكامل *' : 'Adresse complète *'}
            </label>
            <input
              id="modal-address"
              type="text"
              required
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder={isAr ? 'الحي، الشارع، رقم الإقامة...' : "Quartier, rue, numéro d'immeuble..."}
              className="w-full min-h-[44px] px-3.5 bg-[#FDFCFA] border border-[#DDD3BE] text-sm text-[#0B0A08] focus:border-[#C9A24D] focus:outline-none"
            />
          </div>

          {/* 4. Phone */}
          <div>
            <label htmlFor="modal-phone" className="block text-xs font-medium text-[#0B0A08] mb-1.5">
              <LatinNumber value="4" />. {isAr ? 'رقم الهاتف *' : 'Numéro de téléphone *'}
            </label>
            <input
              id="modal-phone"
              type="tel"
              dir="ltr"
              lang="en"
              translate="no"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="06 10 64 06 66"
              className="notranslate w-full min-h-[44px] px-3.5 bg-[#FDFCFA] border border-[#DDD3BE] text-sm text-[#0B0A08] tabular-nums focus:border-[#C9A24D] focus:outline-none"
            />
          </div>

          {/* Live Breakdown */}
          <div className="pt-4 border-t border-[#DDD3BE] space-y-2 text-sm">
            <div className="flex justify-between text-[#8C857B]">
              <span>{isAr ? 'المجموع الفرعي' : 'Sous-total'}</span>
              <span className="text-[#0B0A08]">
                <LatinPrice amount={subtotal} />
              </span>
            </div>
            <div className="flex justify-between text-[#8C857B]">
              <span>{isAr ? 'رسوم التوصيل' : 'Frais de livraison'}</span>
              <span className="text-[#0B0A08]">
                <LatinPrice amount={deliveryFee} />
              </span>
            </div>
            <div className="flex justify-between pt-2 border-t border-[#DDD3BE] font-semibold text-base">
              <span>{isAr ? 'المجموع' : 'Total à payer'}</span>
              <span className="text-[#0B0A08]">
                <LatinPrice amount={total} />
              </span>
            </div>
          </div>

          {error && (
            <p role="alert" className="text-xs text-red-700 bg-red-50 border border-red-200 px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            className={`btn-whatsapp-luminous w-full min-h-[48px] text-xs font-semibold inline-flex items-center justify-center gap-2 whitespace-nowrap ${
              isAr ? '' : 'uppercase tracking-[0.14em]'
            }`}
          >
            <MessageCircle className="w-4 h-4" />
            <span>{isAr ? 'إرسال الطلب عبر واتساب' : 'Envoyer la commande sur WhatsApp'}</span>
          </button>

          {generatedUrl && (
            <div className="p-3 bg-[#F6F1E7] border border-[#C9A24D]/50 text-center">
              <p className="text-xs text-[#0B0A08] mb-2">
                {isAr
                  ? 'إذا لم يُفتح تطبيق واتساب تلقائياً:'
                  : "Si WhatsApp ne s'est pas ouvert automatiquement :"}
              </p>
              <a
                href={generatedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-[#8F6E2E] underline"
              >
                {isAr ? 'افتح واتساب الآن' : 'Ouvrir WhatsApp maintenant'}
              </a>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};
