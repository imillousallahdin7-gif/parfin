import { LocalizedText, Product, Pack } from '../types/catalog';

export type SiteLang = 'fr' | 'ar';

const CATEGORY_AR_MAP: Record<string, string> = {
  tout: 'الكل',
  cosmetiques: 'مستحضرات التجميل',
  'soins visage': 'العناية بالوجه',
  'soins corps': 'العناية بالجسم',
  maquillage: 'المكياج',
  francaise: 'عطور فرنسية',
  arabe: 'عطور شرقية',
  niche: 'عطور النيش',
  homme: 'رجالي',
  femme: 'نسائي',
  unisexe: 'للجنسين',
  cadeaux: 'هدايا',
};

function stripKey(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function getCategoryLabel(category: string, lang: SiteLang): string {
  if (lang === 'fr') return category;
  return CATEGORY_AR_MAP[stripKey(category)] || category;
}

export function getLocalizedText(
  text: LocalizedText | undefined,
  lang: SiteLang,
  fallback = ''
): string {
  if (!text) return fallback;
  if (lang === 'ar') {
    return text.ar?.trim() || text.fr?.trim() || fallback;
  }
  return text.fr?.trim() || text.ar?.trim() || fallback;
}

export function getProductTitle(product: Product, lang: SiteLang): string {
  return getLocalizedText(product.name, lang, lang === 'ar' ? 'منتج فاخر' : 'Création');
}

export function getProductDescription(product: Product, lang: SiteLang): string {
  const fallback =
    lang === 'ar'
      ? 'تشكيلة أصلية مختارة بعناية من العطور الفاخرة ومستحضرات التجميل.'
      : 'Sélection authentique de haute parfumerie et soins cosmétiques.';
  return getLocalizedText(product.description, lang, fallback);
}

export function getPackTitle(pack: Pack, lang: SiteLang): string {
  return getLocalizedText(pack.name, lang, lang === 'ar' ? 'باقة مختارة' : 'Pack');
}

export function getPackDescription(pack: Pack, lang: SiteLang): string {
  const fallback =
    lang === 'ar'
      ? 'تشكيلة حصرية محضّرة بعناية من دارنا في طنجة.'
      : 'Sélection exclusive préparée avec soin par notre maison.';
  return getLocalizedText(pack.description, lang, fallback);
}

export const CITY_AR_TO_FR: Record<string, string> = {
  Tanger: 'طنجة',
  Casablanca: 'الدار البيضاء',
  Rabat: 'الرباط',
  Marrakech: 'مراكش',
  Fès: 'فاس',
  Agadir: 'أكادير',
  Tétouan: 'تطوان',
  Meknès: 'مكناس',
  Oujda: 'وجدة',
  Kénitra: 'القنيطرة',
  Salé: 'سلا',
  Mohammédia: 'المحمدية',
  'El Jadida': 'الجديدة',
  'Béni Mellal': 'بني ملال',
  Nador: 'الناظور',
  Taza: 'تازة',
  Settat: 'سطات',
  Khouribga: 'خريبكة',
  Larache: 'العرائش',
  'Ksar El Kébir': 'القصر الكبير',
  Chefchaouen: 'شفشاون',
  'Al Hoceïma': 'الحسيمة',
  Essaouira: 'الصويرة',
  Ouarzazate: 'ورزازات',
  Errachidia: 'الرشيدية',
  Laâyoune: 'العيون',
  Dakhla: 'الداخلة',
  Berkane: 'بركان',
  Berrechid: 'برشيد',
  Témara: 'تمارة',
};
