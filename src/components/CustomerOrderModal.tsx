import React, { useEffect, useState } from 'react';
import { MessageCircle, Minus, Plus, X } from 'lucide-react';
import { CartItem, MOROCCAN_CITIES } from '../types/catalog';
import {
  buildWhatsAppOrderUrl,
  formatMAD,
  getDeliveryFee,
  isTangierCity,
  isValidMoroccanPhone,
} from '../utils/format';

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
      setError('Veuillez saisir votre nom complet.');
      return;
    }
    if (!city.trim()) {
      setError('Veuillez indiquer votre ville de livraison.');
      return;
    }
    if (!address.trim()) {
      setError('Veuillez renseigner votre adresse complète.');
      return;
    }
    if (!isValidMoroccanPhone(phone)) {
      setError('Numéro marocain invalide (ex. 06 10 64 06 66 ou +212610640666).');
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
      aria-label="Finaliser la commande"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B0A08]/80 backdrop-blur-xs p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg max-h-[92dvh] overflow-y-auto bg-[#FDFCFA] text-[#0B0A08] rounded-2xl border border-[#DDD3BE] p-6 sm:p-8"
      >
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-[#DDD3BE]">
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-[#8F6E2E]">
              Commande Rapide WhatsApp
            </p>
            <h2 className="font-display text-2xl font-semibold text-[#0B0A08] mt-1">
              Finaliser votre commande
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
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
            <p className="text-xs text-[#8C857B] mt-0.5">
              {item.sizeLabel} · {formatMAD(item.unitPrice)}
            </p>
          </div>
          <div className="flex items-center border border-[#DDD3BE] bg-[#FDFCFA] shrink-0">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              aria-label="Diminuer la quantité"
              className="w-9 h-9 flex items-center justify-center text-[#0B0A08] hover:bg-[#EAE4DC]"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="w-8 text-center text-xs font-semibold tabular-nums">{quantity}</span>
            <button
              type="button"
              onClick={() => setQuantity((q) => q + 1)}
              aria-label="Augmenter la quantité"
              className="w-9 h-9 flex items-center justify-center text-[#0B0A08] hover:bg-[#EAE4DC]"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* 1. Nom complet * */}
          <div>
            <label htmlFor="modal-fullname" className="block text-xs font-medium text-[#0B0A08] mb-1.5">
              1. Nom complet *
            </label>
            <input
              id="modal-fullname"
              type="text"
              required
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Ex. Youssef El Mansouri"
              className="w-full min-h-[44px] px-3.5 bg-[#FDFCFA] border border-[#DDD3BE] text-sm text-[#0B0A08] focus:border-[#C9A24D] focus:outline-none"
            />
          </div>

          {/* 2. Ville * */}
          <div>
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <label htmlFor="modal-city" className="block text-xs font-medium text-[#0B0A08]">
                2. Ville *
              </label>
              {city.trim() && (
                <span className="text-[11px] font-medium text-[#8F6E2E] tabular-nums">
                  {isTangierCity(city)
                    ? `Livraison Tanger : ${formatMAD(deliveryFeeLocal)}`
                    : `Livraison Maroc : ${formatMAD(deliveryFeeNational)}`}
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
              placeholder="Sélectionnez ou saisissez votre ville"
              className="w-full min-h-[44px] px-3.5 bg-[#FDFCFA] border border-[#DDD3BE] text-sm text-[#0B0A08] focus:border-[#C9A24D] focus:outline-none"
            />
            <datalist id="moroccan-cities-modal">
              {MOROCCAN_CITIES.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>

          {/* 3. Adresse complète * */}
          <div>
            <label htmlFor="modal-address" className="block text-xs font-medium text-[#0B0A08] mb-1.5">
              3. Adresse complète *
            </label>
            <input
              id="modal-address"
              type="text"
              required
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Quartier, rue, numéro d'immeuble..."
              className="w-full min-h-[44px] px-3.5 bg-[#FDFCFA] border border-[#DDD3BE] text-sm text-[#0B0A08] focus:border-[#C9A24D] focus:outline-none"
            />
          </div>

          {/* 4. Numéro de téléphone * */}
          <div>
            <label htmlFor="modal-phone" className="block text-xs font-medium text-[#0B0A08] mb-1.5">
              4. Numéro de téléphone *
            </label>
            <input
              id="modal-phone"
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="06 10 64 06 66"
              className="w-full min-h-[44px] px-3.5 bg-[#FDFCFA] border border-[#DDD3BE] text-sm text-[#0B0A08] tabular-nums focus:border-[#C9A24D] focus:outline-none"
            />
          </div>

          {/* Live Breakdown */}
          <div className="pt-4 border-t border-[#DDD3BE] space-y-2 text-sm">
            <div className="flex justify-between text-[#8C857B]">
              <span>Sous-total</span>
              <span className="tabular-nums text-[#0B0A08]">{formatMAD(subtotal)}</span>
            </div>
            <div className="flex justify-between text-[#8C857B]">
              <span>Frais de livraison</span>
              <span className="tabular-nums text-[#0B0A08]">{formatMAD(deliveryFee)}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-[#DDD3BE] font-semibold text-base">
              <span>TOTAL À PAYER</span>
              <span className="tabular-nums text-[#0B0A08]">{formatMAD(total)}</span>
            </div>
          </div>

          {error && (
            <p role="alert" className="text-xs text-red-700 bg-red-50 border border-red-200 px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="w-full min-h-[48px] rounded-xl bg-[#25D366] hover:bg-[#1EBE5D] text-white text-xs uppercase tracking-[0.14em] font-semibold inline-flex items-center justify-center gap-2 transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Envoyer la commande sur WhatsApp</span>
          </button>

          {generatedUrl && (
            <div className="p-3 bg-[#F6F1E7] border border-[#C9A24D]/50 text-center">
              <p className="text-xs text-[#0B0A08] mb-2">
                Si WhatsApp ne s&apos;est pas ouvert automatiquement :
              </p>
              <a
                href={generatedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-[#8F6E2E] underline"
              >
                Ouvrir WhatsApp maintenant
              </a>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};
