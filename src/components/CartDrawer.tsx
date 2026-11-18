import React, { useEffect, useState } from 'react';
import { ArrowLeft, MessageCircle, Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react';
import { CartItem, MOROCCAN_CITIES } from '../types/catalog';
import {
  buildWhatsAppOrderUrl,
  formatMAD,
  getDeliveryFee,
  isTangierCity,
  isValidMoroccanPhone,
} from '../utils/format';

interface CartDrawerProps {
  open: boolean;
  items: CartItem[];
  whatsappNumber: string;
  deliveryFeeLocal?: number;
  deliveryFeeNational?: number;
  onClose: () => void;
  onUpdateQuantity: (key: string, delta: number) => void;
  onRemoveItem: (key: string) => void;
  onClearCart: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  open,
  items,
  whatsappNumber,
  deliveryFeeLocal = 20,
  deliveryFeeNational = 35,
  onClose,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
}) => {
  const [step, setStep] = useState<'cart' | 'checkout'>('cart');
  const [customerName, setCustomerName] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setStep('cart');
      setError(null);
      setGeneratedUrl(null);
      return;
    }
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
  }, [open, onClose]);

  if (!open) return null;

  const subtotal = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
  const deliveryFee = getDeliveryFee(city, deliveryFeeLocal, deliveryFeeNational);
  const total = subtotal + deliveryFee;

  const handleCheckoutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (items.length === 0) {
      setError('Votre panier est vide.');
      return;
    }
    if (!customerName.trim()) {
      setError('Veuillez saisir votre nom complet.');
      return;
    }
    if (!city.trim()) {
      setError('Veuillez indiquer votre ville.');
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
      items,
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
      aria-label="Votre panier"
      className="fixed inset-0 z-50 flex justify-end bg-[#0B0A08]/75 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md h-full bg-[#FDFCFA] text-[#0B0A08] border-l border-[#DDD3BE] flex flex-col"
      >
        {/* Drawer Header */}
        <div className="px-5 py-4 border-b border-[#DDD3BE] flex items-center justify-between bg-[#0B0A08] text-[#F6F1E7]">
          <div className="flex items-center gap-2.5">
            {step === 'checkout' && (
              <button
                type="button"
                onClick={() => setStep('cart')}
                aria-label="Retour au panier"
                className="w-9 h-9 flex items-center justify-center text-[#E8D08C] hover:text-white"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <h2 className="font-brand text-sm tracking-[0.14em] text-[#E8D08C]">
              {step === 'cart' ? 'Votre Commande' : 'Coordonnées de Livraison'}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer le panier"
            className="w-10 h-10 flex items-center justify-center text-[#F6F1E7] hover:text-[#C9A24D]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Body */}
        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <ShoppingBag className="w-10 h-10 text-[#C9A24D] mb-4" strokeWidth={1.3} />
            <h3 className="font-display text-2xl text-[#0B0A08] mb-2">
              Votre panier est vide
            </h3>
            <p className="text-sm text-[#8C857B] mb-6">
              Ajoutez vos flacons ou décants favoris pour préparer votre commande WhatsApp.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="btn-primary-wipe px-6 py-3 text-xs uppercase tracking-[0.14em] min-h-[44px]"
            >
              Découvrir la Collection
            </button>
          </div>
        ) : step === 'cart' ? (
          <>
            <div className="flex-1 overflow-y-auto divide-y divide-[#DDD3BE] px-5">
              {items.map((item) => (
                <div key={item.key} className="py-4 flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.title}
                        className="w-14 h-16 object-cover bg-[#EAE4DC] border border-[#DDD3BE] shrink-0"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-14 h-16 bg-[#EAE4DC] border border-[#DDD3BE] flex items-center justify-center text-[#8F6E2E] text-xs shrink-0">
                        ◆
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-display text-base font-semibold text-[#0B0A08] truncate">
                        {item.title}
                      </p>
                      <p className="text-xs text-[#8C857B] mt-0.5">{item.sizeLabel}</p>
                      <p className="text-xs font-semibold text-[#8F6E2E] mt-1 tabular-nums">
                        {formatMAD(item.unitPrice * item.quantity)}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => onRemoveItem(item.key)}
                      aria-label={`Supprimer ${item.title}`}
                      className="text-[#8C857B] hover:text-red-700 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <div className="flex items-center border border-[#DDD3BE] bg-[#F6F1E7]">
                      <button
                        type="button"
                        onClick={() => onUpdateQuantity(item.key, -1)}
                        aria-label="Diminuer"
                        className="w-8 h-8 flex items-center justify-center hover:bg-[#EAE4DC]"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-7 text-center text-xs font-semibold tabular-nums">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => onUpdateQuantity(item.key, 1)}
                        aria-label="Augmenter"
                        className="w-8 h-8 flex items-center justify-center hover:bg-[#EAE4DC]"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div
              className="p-5 border-t border-[#DDD3BE] bg-[#F6F1E7]"
              style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}
            >
              <div className="flex items-center justify-between text-sm mb-4">
                <span className="text-[#8C857B]">Sous-total</span>
                <span className="text-lg font-semibold text-[#0B0A08] tabular-nums">
                  {formatMAD(subtotal)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setStep('checkout')}
                className="btn-noir-luminous w-full min-h-[48px] text-xs uppercase tracking-[0.14em] font-semibold whitespace-nowrap"
              >
                Passer la commande
              </button>
              <button
                type="button"
                onClick={onClearCart}
                className="w-full mt-2 py-2 text-[11px] uppercase tracking-[0.12em] text-[#8C857B] hover:text-[#0B0A08]"
              >
                Vider le panier
              </button>
            </div>
          </>
        ) : (
          <form onSubmit={handleCheckoutSubmit} className="flex-1 overflow-y-auto p-5 flex flex-col justify-between gap-5">
            <div className="space-y-4">
              {/* 1. Nom complet * */}
              <div>
                <label htmlFor="cart-fullname" className="block text-xs font-medium text-[#0B0A08] mb-1.5">
                  1. Nom complet *
                </label>
                <input
                  id="cart-fullname"
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Ex. Salma Bennani"
                  className="w-full min-h-[44px] px-3.5 bg-[#FDFCFA] border border-[#DDD3BE] text-sm text-[#0B0A08] focus:border-[#C9A24D] focus:outline-none"
                />
              </div>

              {/* 2. Ville * */}
              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <label htmlFor="cart-city" className="block text-xs font-medium text-[#0B0A08]">
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
                  id="cart-city"
                  type="text"
                  required
                  list="moroccan-cities-cart"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Choisissez votre ville"
                  className="w-full min-h-[44px] px-3.5 bg-[#FDFCFA] border border-[#DDD3BE] text-sm text-[#0B0A08] focus:border-[#C9A24D] focus:outline-none"
                />
                <datalist id="moroccan-cities-cart">
                  {MOROCCAN_CITIES.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>

              {/* 3. Adresse complète * */}
              <div>
                <label htmlFor="cart-address" className="block text-xs font-medium text-[#0B0A08] mb-1.5">
                  3. Adresse complète *
                </label>
                <input
                  id="cart-address"
                  type="text"
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Quartier, rue, numéro..."
                  className="w-full min-h-[44px] px-3.5 bg-[#FDFCFA] border border-[#DDD3BE] text-sm text-[#0B0A08] focus:border-[#C9A24D] focus:outline-none"
                />
              </div>

              {/* 4. Numéro de téléphone * */}
              <div>
                <label htmlFor="cart-phone" className="block text-xs font-medium text-[#0B0A08] mb-1.5">
                  4. Numéro de téléphone *
                </label>
                <input
                  id="cart-phone"
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="06 10 64 06 66"
                  className="w-full min-h-[44px] px-3.5 bg-[#FDFCFA] border border-[#DDD3BE] text-sm text-[#0B0A08] tabular-nums focus:border-[#C9A24D] focus:outline-none"
                />
              </div>

              {/* Breakdown */}
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
            </div>

            <div style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}>
              <button
                type="submit"
                className="btn-whatsapp-luminous w-full min-h-[48px] text-xs uppercase tracking-[0.14em] font-semibold inline-flex items-center justify-center gap-2 whitespace-nowrap"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Confirmer via WhatsApp</span>
              </button>

              {generatedUrl && (
                <div className="mt-3 p-3 bg-[#F6F1E7] border border-[#C9A24D]/50 text-center">
                  <a
                    href={generatedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8F6E2E] underline"
                  >
                    Ouvrir votre facture WhatsApp
                  </a>
                </div>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
