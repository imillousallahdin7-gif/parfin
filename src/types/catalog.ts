export interface LocalizedText {
  fr: string;
  ar: string;
}

export interface ProductSize {
  id: string;
  label: string;
  price: number;
  inStock: boolean;
}

export interface Product {
  id: string;
  name: LocalizedText;
  description: LocalizedText;
  category: string;
  price: number;
  sizeLabel?: string;
  sizes: ProductSize[];
  inStock: boolean;
  imageData?: string;
  imageUrl?: string;
  images?: string[];
  createdAt?: number | string;
  updatedAt?: number | string;
}

export interface Pack {
  id: string;
  category: 'women' | 'men';
  name: LocalizedText;
  description: LocalizedText;
  price: number;
  active: boolean;
  imageData?: string;
  imageUrl?: string;
  createdAt?: number | string;
  updatedAt?: number | string;
}

export interface StoreSettings {
  whatsappNumber: string;
  storeName: string;
  announcementFr: string;
  announcementAr?: string;
  customCategories: string[];
  deliveryFeeLocal: number;
  deliveryFeeNational: number;
}

export interface CatalogSnapshot {
  version: string;
  generatedAt: string;
  products: Product[];
  packs: Pack[];
  settings: StoreSettings;
}

export interface CartItem {
  key: string; // `${kind}:${id}:${sizeId}`
  kind: 'product' | 'pack';
  id: string;
  title: string;
  sizeLabel: string;
  sizeId: string;
  unitPrice: number;
  quantity: number;
  imageUrl?: string;
}

export type AppRoute = 'home' | 'shop' | 'packs-women' | 'packs-men' | 'admin';

export const DEFAULT_STORE_SETTINGS: StoreSettings = {
  whatsappNumber: '212610640666',
  storeName: 'PARFUMERIE EL KHALIFI',
  announcementFr: 'PARFUMERIE EL KHALIFI — FLACONS ET DÉCANTS VIA WHATSAPP',
  announcementAr: 'بارفومري الخليفي — قنينات وتقسيمات عبر واتساب',
  customCategories: [],
  deliveryFeeLocal: 20,
  deliveryFeeNational: 35,
};

export const STORE_IDENTITY = {
  brand: 'PARFUMERIE EL KHALIFI',
  slug: 'parfumerie_elkhalifi',
  taglineFr: 'Haute Parfumerie & Décants',
  announcementFr: 'PARFUMERIE EL KHALIFI — FLACONS ET DÉCANTS VIA WHATSAPP',
  canonicalUrl: 'https://parfumerie-elkhalifi.vercel.app/',
  email: 'Taghzout.saif@hotmail.com',
  whatsappDigits: '212610640666',
  phoneDisplay: '06 10 64 06 66',
  telHref: 'tel:+212610640666',
  addressFr: '2 Florencia St, Tanger 90060, Maroc',
  addressAr: '2 شارع فلورنسيا، طنجة 90060، المغرب',
  postalCode: '90060',
  region: 'Tanger-Tétouan-Al Hoceïma',
  mapsLink: 'https://www.google.com/maps/search/?api=1&query=2+Florencia+St+Tangier+90060+Maroc',
  mapsEmbedUrl:
    'https://maps.google.com/maps?q=2%20Florencia%20St%2C%20Tangier%2090060%2C%20Maroc&t=&z=17&ie=UTF8&iwloc=&output=embed',
  openingHoursFr: 'Lundi – Samedi : 10h00 - 21h00',
  conciergeHoursFr: 'Service Conciergerie : 7j/7 de 9h à 22h',
  handle: '@parfumereaelkhlifi',
  instagramUrl: 'https://www.instagram.com/parfumereaelkhlifi',
  tiktokUrl: 'https://www.tiktok.com/@khaledelkhlifi',
  adminEmail: 'Taghzout.saif@hotmail.com',
} as const;

export const BASE_CATEGORIES = [
  'Tout',
  'Française',
  'Arabe',
  'Niche',
  'Homme',
  'Femme',
  'Unisexe',
  'Cadeaux',
] as const;

export const MOROCCAN_CITIES = [
  'Tanger',
  'Casablanca',
  'Rabat',
  'Marrakech',
  'Fès',
  'Agadir',
  'Tétouan',
  'Meknès',
  'Oujda',
  'Kénitra',
  'Salé',
  'Mohammédia',
  'El Jadida',
  'Béni Mellal',
  'Nador',
  'Taza',
  'Settat',
  'Khouribga',
  'Larache',
  'Ksar El Kébir',
  'Chefchaouen',
  'Al Hoceïma',
  'Essaouira',
  'Ouarzazate',
  'Errachidia',
  'Laâyoune',
  'Dakhla',
  'Berkane',
  'Berrechid',
  'Témara',
] as const;
