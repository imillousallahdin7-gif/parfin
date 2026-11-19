import { CartItem, STORE_IDENTITY } from '../types/catalog';

/**
 * Formats a number with French thousand spacing and strict Latin digits, e.g. "1 200".
 */
export function formatLatinNumber(amount: number): string {
  const safe = Number.isFinite(amount) ? Math.round(amount) : 0;
  return safe.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

/**
 * Formats a number in Moroccan Dirhams (MAD), e.g. "1 200 MAD".
 */
export function formatMAD(amount: number): string {
  return `${formatLatinNumber(amount)} MAD`;
}

/**
 * Normalizes text for search & matching:
 * - lowercases
 * - removes French/Latin accents
 * - removes Arabic diacritics (tashkeel) and normalizes alef/teh marbuta
 */
export function normalizeText(input: string): string {
  if (!input) return '';
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .toLowerCase()
    .trim();
}

const TANGIER_VARIANTS = ['tanger', 'tangier', 'tanja', 'tangere', 'طنجة', 'طنجه'];

export function isTangierCity(cityInput: string): boolean {
  const normalized = normalizeText(cityInput);
  if (!normalized) return false;
  return TANGIER_VARIANTS.some(
    (variant) => normalized === normalizeText(variant) || normalized.includes(normalizeText(variant))
  );
}

export function getDeliveryFee(
  cityInput: string,
  localFee = 20,
  nationalFee = 35
): number {
  if (!cityInput.trim()) return nationalFee;
  return isTangierCity(cityInput) ? localFee : nationalFee;
}

export const MOROCCAN_PHONE_REGEX = /^(?:(?:\+?212)|0)[5-7]\d{8}$/;

export function cleanPhoneInput(raw: string): string {
  return raw.replace(/[\s.\-()]/g, '');
}

export function isValidMoroccanPhone(raw: string): boolean {
  return MOROCCAN_PHONE_REGEX.test(cleanPhoneInput(raw));
}

export function sanitizeWhatsappNumber(raw?: string): string {
  const digits = (raw || STORE_IDENTITY.whatsappDigits).replace(/\D/g, '');
  return digits || STORE_IDENTITY.whatsappDigits;
}

export function buildWhatsAppOrderUrl(params: {
  whatsappNumber: string;
  customerName: string;
  city: string;
  address: string;
  phone: string;
  items: CartItem[];
  deliveryFeeLocal?: number;
  deliveryFeeNational?: number;
  lang?: 'fr' | 'ar';
}): string {
  const isAr = params.lang === 'ar';
  const number = sanitizeWhatsappNumber(params.whatsappNumber);
  const subtotal = params.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const deliveryFee = getDeliveryFee(
    params.city,
    params.deliveryFeeLocal ?? 20,
    params.deliveryFeeNational ?? 35
  );
  const total = subtotal + deliveryFee;
  const now = new Date();
  const dateStr = now.toLocaleDateString('fr-MA-u-nu-latn', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const timeStr = now.toLocaleTimeString('fr-MA-u-nu-latn', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const fmtPrice = (val: number) =>
    isAr ? `${formatLatinNumber(val)} درهم مغربي` : formatMAD(val);

  const itemLines = params.items.map((item, idx) => {
    const lineTotal = item.unitPrice * item.quantity;
    return `${idx + 1}. *${item.title}* — ${item.sizeLabel} × ${item.quantity} = ${fmtPrice(lineTotal)}`;
  });

  const isTangier = isTangierCity(params.city);

  const message = isAr
    ? [
        `*طلب وفاتورة — بارفومري الخليفي (PARFUMERIE EL KHALIFI)*`,
        ``,
        `*العميل:* ${params.customerName.trim()}`,
        `*الهاتف:* ${cleanPhoneInput(params.phone)}`,
        `*المدينة:* ${params.city.trim()}`,
        `*العنوان:* ${params.address.trim()}`,
        ``,
        `*المنتجات المطلوبة:*`,
        ...itemLines,
        ``,
        `*المجموع الفرعي:* ${fmtPrice(subtotal)}`,
        `*رسوم التوصيل (${isTangier ? 'طنجة' : 'باقي المدن المغربية'}):* ${fmtPrice(deliveryFee)}`,
        `*الإجمالي للدفع:* ${fmtPrice(total)}`,
        ``,
        `التاريخ: ${dateStr} الساعة ${timeStr}`,
        `شكراً لثقتكم — ${STORE_IDENTITY.brand}`,
      ].join('\n')
    : [
        `*COMMANDE & FACTURE — PARFUMERIE EL KHALIFI*`,
        ``,
        `*Client :* ${params.customerName.trim()}`,
        `*Téléphone :* ${cleanPhoneInput(params.phone)}`,
        `*Ville :* ${params.city.trim()}`,
        `*Adresse :* ${params.address.trim()}`,
        ``,
        `*Articles commandés :*`,
        ...itemLines,
        ``,
        `*Sous-total :* ${fmtPrice(subtotal)}`,
        `*Frais de livraison (${isTangier ? 'Tanger' : 'Maroc'}) :* ${fmtPrice(deliveryFee)}`,
        `*TOTAL À PAYER :* ${fmtPrice(total)}`,
        ``,
        `Date : ${dateStr} à ${timeStr}`,
        `Merci pour votre confiance — ${STORE_IDENTITY.brand}`,
      ].join('\n');

  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

export function buildWhatsAppDirectUrl(
  whatsappNumber?: string,
  text?: string,
  lang: 'fr' | 'ar' = 'fr'
): string {
  const number = sanitizeWhatsappNumber(whatsappNumber);
  const defaultMsg =
    text ||
    (lang === 'ar'
      ? 'السلام عليكم PARFUMERIE EL KHALIFI، أرغب في الحصول على استشارة بخصوص تشكيلتكم من العطور ومستحضرات التجميل.'
      : 'Bonjour PARFUMERIE EL KHALIFI, je souhaite obtenir des conseils sur votre sélection de parfums et produits cosmétiques.');
  return `https://wa.me/${number}?text=${encodeURIComponent(defaultMsg)}`;
}
