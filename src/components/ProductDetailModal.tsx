import React, { useEffect, useMemo, useState } from 'react';
import { Check, ShoppingBag, X } from 'lucide-react';
import { Product, ProductSize } from '../types/catalog';
import { formatMAD } from '../utils/format';
import { CatalogImage } from './CatalogImage';

interface ProductDetailModalProps {
  product: Product | null;
  onClose: () => void;
  onAddToCart: (product: Product, size: ProductSize) => void;
  onOrderDirect: (product: Product, size: ProductSize) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  onClose,
  onAddToCart,
  onOrderDirect,
}) => {
  const gallery = useMemo(() => {
    if (!product) return [];
    const list: string[] = [];
    const primary =
      (product.imageUrl?.startsWith('/') ? product.imageUrl : undefined) ||
      product.imageData ||
      product.imageUrl;
    if (primary) list.push(primary);
    if (Array.isArray(product.images)) {
      for (const img of product.images) {
        if (img && !list.includes(img)) list.push(img);
      }
    }
    return list;
  }, [product]);

  const sizes = useMemo(() => {
    if (!product) return [];
    if (product.sizes && product.sizes.length > 0) return product.sizes;
    return [
      {
        id: 'default',
        label: product.sizeLabel || 'Flacon complet',
        price: product.price,
        inStock: product.inStock,
      },
    ];
  }, [product]);

  const [selectedSizeId, setSelectedSizeId] = useState<string>('');
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [addedFeedback, setAddedFeedback] = useState(false);

  useEffect(() => {
    if (!product) return;
    const firstAvail = sizes.find((s) => s.inStock) || sizes[0];
    setSelectedSizeId(firstAvail?.id || '');
    setActiveImageIdx(0);
    setAddedFeedback(false);
  }, [product, sizes]);

  useEffect(() => {
    if (!product) return;
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
  }, [product, onClose]);

  if (!product) return null;

  const selectedSize = sizes.find((s) => s.id === selectedSizeId) || sizes[0];
  const isAvailable = product.inStock && selectedSize?.inStock;
  const title = product.name?.fr || 'Création';
  const activeImage = gallery[activeImageIdx];

  const handleAdd = () => {
    if (!isAvailable || !selectedSize) return;
    onAddToCart(product, selectedSize);
    setAddedFeedback(true);
    window.setTimeout(() => setAddedFeedback(false), 1800);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-[#0B0A08]/80 backdrop-blur-xs p-0 md:p-6"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-5xl max-h-[94dvh] md:max-h-[90vh] bg-[#FDFCFA] text-[#0B0A08] rounded-t-2xl md:rounded-2xl border border-[#DDD3BE] overflow-hidden flex flex-col"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer la fiche produit"
          className="absolute top-3 right-3 z-20 w-11 h-11 rounded-full bg-[#FDFCFA]/95 border border-[#DDD3BE] flex items-center justify-center text-[#0B0A08] hover:bg-[#0B0A08] hover:text-[#F6F1E7] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="overflow-y-auto flex-1 pb-24 md:pb-0">
          <div className="grid grid-cols-1 lg:grid-cols-12">
            {/* Left 6 cols: 3:4 Gallery + Thumbnail switcher */}
            <div className="lg:col-span-6 bg-[#F6F1E7] p-4 sm:p-6 flex flex-col gap-3">
              <div className="rounded-xl overflow-hidden border border-[#DDD3BE]">
                <CatalogImage
                  src={activeImage}
                  fallbackSrc={product.imageData}
                  alt={title}
                  title={title}
                  eager
                  aspectClass="aspect-[3/4]"
                />
              </div>

              {gallery.length > 1 && (
                <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar pt-1">
                  {gallery.map((imgUrl, idx) => (
                    <button
                      key={`${imgUrl}-${idx}`}
                      type="button"
                      onClick={() => setActiveImageIdx(idx)}
                      aria-label={`Voir photo ${idx + 1}`}
                      className={`w-16 h-20 rounded-lg overflow-hidden border-2 shrink-0 transition-colors ${
                        activeImageIdx === idx
                          ? 'border-[#C9A24D]'
                          : 'border-[#DDD3BE] opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img
                        src={imgUrl}
                        alt={`${title} miniature ${idx + 1}`}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Right 6 cols: Details & Contiguous Purchase Module */}
            <div className="lg:col-span-6 p-6 sm:p-8 flex flex-col">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-[#8F6E2E] mb-2">
                <span>{product.category}</span>
                {product.name?.ar && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span dir="rtl" className="font-sans">
                      {product.name.ar}
                    </span>
                  </>
                )}
              </div>

              <h2 className="font-display text-2xl sm:text-3xl font-semibold text-[#0B0A08] leading-tight">
                {title}
              </h2>

              <div className="mt-4 pb-4 border-b border-[#DDD3BE] flex items-center justify-between gap-4">
                <span className="text-2xl font-semibold text-[#0B0A08] tabular-nums">
                  {formatMAD(selectedSize ? selectedSize.price : product.price)}
                </span>
                <span
                  className={`rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.12em] font-medium ${
                    isAvailable
                      ? 'bg-[#EAE4DC] text-[#0B0A08]'
                      : 'bg-[#0B0A08] text-[#C9A24D]'
                  }`}
                >
                  {isAvailable ? 'Disponible' : 'Épuisé'}
                </span>
              </div>

              {/* Interactive Size / Decant Grid */}
              <div className="mt-5">
                <p className="text-xs uppercase tracking-[0.14em] text-[#8C857B] mb-3">
                  Format / Contenance
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {sizes.map((size) => {
                    const isSelected = selectedSize?.id === size.id;
                    const sizeAvail = product.inStock && size.inStock;
                    return (
                      <button
                        key={size.id}
                        type="button"
                        onClick={() => setSelectedSizeId(size.id)}
                        className={`p-3 rounded-xl border text-left transition-all min-h-[56px] ${
                          isSelected
                            ? 'border-[#0B0A08] bg-[#0B0A08] text-[#F6F1E7]'
                            : sizeAvail
                            ? 'border-[#DDD3BE] bg-[#F6F1E7]/60 text-[#0B0A08] hover:border-[#C9A24D]'
                            : 'border-[#DDD3BE]/60 bg-[#EAE4DC]/40 text-[#8C857B]'
                        }`}
                      >
                        <div
                          className={`text-xs font-medium ${
                            !sizeAvail ? 'line-through' : ''
                          }`}
                        >
                          {size.label}
                        </div>
                        <div
                          className={`text-xs mt-0.5 tabular-nums ${
                            isSelected ? 'text-[#E8D08C]' : 'text-[#8F6E2E]'
                          } ${!sizeAvail ? 'line-through' : ''}`}
                        >
                          {formatMAD(size.price)}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Desktop / Tablet Actions */}
              <div className="hidden md:grid grid-cols-2 gap-3 mt-6">
                <button
                  type="button"
                  disabled={!isAvailable}
                  onClick={handleAdd}
                  className={`min-h-[48px] rounded-xl px-4 text-xs uppercase tracking-[0.12em] font-medium inline-flex items-center justify-center gap-2 transition-colors ${
                    !isAvailable
                      ? 'bg-[#EAE4DC] text-[#8C857B] cursor-not-allowed'
                      : 'border border-[#0B0A08] bg-[#FDFCFA] text-[#0B0A08] hover:bg-[#0B0A08] hover:text-[#F6F1E7]'
                  }`}
                >
                  {addedFeedback ? (
                    <>
                      <Check className="w-4 h-4 text-[#25D366]" />
                      <span>Ajouté</span>
                    </>
                  ) : (
                    <>
                      <ShoppingBag className="w-4 h-4" />
                      <span>Ajouter à la commande</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  disabled={!isAvailable}
                  onClick={() => isAvailable && selectedSize && onOrderDirect(product, selectedSize)}
                  className={`min-h-[48px] rounded-xl px-4 text-xs uppercase tracking-[0.12em] font-medium transition-colors ${
                    !isAvailable
                      ? 'bg-[#EAE4DC] text-[#8C857B] cursor-not-allowed'
                      : 'bg-[#0B0A08] text-[#F6F1E7] hover:bg-[#25D366] hover:text-white'
                  }`}
                >
                  Commander
                </button>
              </div>

              {/* Full Multi-line Description */}
              <div className="mt-7 pt-5 border-t border-[#DDD3BE]">
                <p className="text-xs uppercase tracking-[0.14em] text-[#8F6E2E] mb-2.5">
                  Notes &amp; Caractère
                </p>
                <p className="text-sm text-[#0B0A08]/85 leading-relaxed whitespace-pre-line">
                  {product.description?.fr ||
                    'Une création d’exception sélectionnée pour son sillage raffiné et sa tenue remarquable. Disponible en flacon scellé ou en décant de précision.'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Sticky Bottom 2-Button Bar on Mobile */}
        <div
          className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-[#FDFCFA] border-t border-[#DDD3BE] px-4 py-3 grid grid-cols-2 gap-2.5"
          style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
        >
          <button
            type="button"
            disabled={!isAvailable}
            onClick={handleAdd}
            className={`min-h-[46px] rounded-xl px-3 text-[11px] uppercase tracking-[0.1em] font-medium inline-flex items-center justify-center gap-1.5 ${
              !isAvailable
                ? 'bg-[#EAE4DC] text-[#8C857B] cursor-not-allowed'
                : 'border border-[#0B0A08] bg-[#FDFCFA] text-[#0B0A08]'
            }`}
          >
            {addedFeedback ? <Check className="w-4 h-4 text-[#25D366]" /> : <ShoppingBag className="w-4 h-4" />}
            <span>{addedFeedback ? 'Ajouté' : 'Ajouter'}</span>
          </button>

          <button
            type="button"
            disabled={!isAvailable}
            onClick={() => isAvailable && selectedSize && onOrderDirect(product, selectedSize)}
            className={`min-h-[46px] rounded-xl px-3 text-[11px] uppercase tracking-[0.1em] font-medium ${
              !isAvailable
                ? 'bg-[#EAE4DC] text-[#8C857B] cursor-not-allowed'
                : 'bg-[#0B0A08] text-[#F6F1E7] active:bg-[#25D366]'
            }`}
          >
            Commander
          </button>
        </div>
      </div>
    </div>
  );
};
