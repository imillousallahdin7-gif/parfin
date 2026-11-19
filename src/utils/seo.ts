import { AppRoute, Pack, Product, STORE_IDENTITY } from '../types/catalog';
import { getCategoryLabel, getProductDescription, getProductTitle, SiteLang } from './i18n';

const DYNAMIC_LD_SCRIPT_ID = 'elkhalifi-dynamic-jsonld';

function upsertMeta(attr: 'name' | 'property', key: string, content: string): void {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertCanonical(url: string): void {
  let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    document.head.appendChild(link);
  }
  link.setAttribute('href', url);
}

function resolveRouteSeo(
  route: AppRoute,
  selectedCategory: string,
  detailProduct: Product | null,
  lang: SiteLang
) {
  const isAr = lang === 'ar';
  const origin =
    typeof window !== 'undefined' && window.location.origin.startsWith('http')
      ? window.location.origin
      : STORE_IDENTITY.canonicalUrl.replace(/\/$/, '');

  if (route === 'admin') {
    return {
      title: 'لوحة الإدارة | PARFUMERIE EL KHALIFI',
      description: 'فضاء الإدارة الخاص بـ PARFUMERIE EL KHALIFI.',
      url: `${origin}/admin`,
      robots: 'noindex, nofollow',
      breadcrumbs: [
        { name: isAr ? 'الرئيسية' : 'Accueil', item: `${origin}/` },
        { name: isAr ? 'الإدارة' : 'Administration', item: `${origin}/admin` },
      ],
    };
  }

  if (detailProduct) {
    const productName = getProductTitle(detailProduct, lang);
    const rawDesc = getProductDescription(detailProduct, lang).trim();
    const minPrice =
      detailProduct.sizes && detailProduct.sizes.length > 0
        ? Math.min(...detailProduct.sizes.map((s) => s.price))
        : detailProduct.price;
    const desc =
      rawDesc.length >= 40
        ? rawDesc.slice(0, 155)
        : isAr
        ? `${productName} (${getCategoryLabel(detailProduct.category, lang)}) ابتداءً من ${minPrice} درهم مغربي لدى بارفومري الخليفي بطنجة. التوصيل لجميع مدن المغرب.`
        : `${productName} (${detailProduct.category}) à partir de ${minPrice} MAD chez PARFUMERIE EL KHALIFI à Tanger. Livraison dans tout le Maroc.`;

    return {
      title: isAr
        ? `${productName} — بارفومري الخليفي طنجة`
        : `${productName} — PARFUMERIE EL KHALIFI Tanger`,
      description: desc,
      url: `${origin}${route === 'shop' ? '/shop' : '/'}`,
      robots: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
      breadcrumbs: [
        { name: isAr ? 'الرئيسية' : 'Accueil', item: `${origin}/` },
        { name: isAr ? 'المتجر' : 'Boutique', item: `${origin}/shop` },
        { name: productName, item: `${origin}/shop` },
      ],
    };
  }

  if (route === 'shop') {
    const localizedCat =
      selectedCategory && selectedCategory !== 'Tout'
        ? getCategoryLabel(selectedCategory, lang)
        : '';
    const catSuffix = localizedCat ? ` · ${localizedCat}` : '';
    return {
      title: isAr
        ? `متجر العطور ومستحضرات التجميل${catSuffix} — بارفومري الخليفي`
        : `Boutique Parfums & Cosmétiques${catSuffix} — PARFUMERIE EL KHALIFI`,
      description: isAr
        ? `اكتشفوا مجموعتنا الكاملة من العطور الأصلية في قنينات مختومة ومستحضرات العناية والمكياج${catSuffix} في طنجة. طلب عبر واتساب وتوصيل لجميع مدن المغرب.`
        : `Explorez notre catalogue complet de parfums originaux en flacons scellés, soins visage et maquillage${catSuffix} à Tanger. Commande WhatsApp & livraison partout au Maroc.`,
      url:
        selectedCategory && selectedCategory !== 'Tout'
          ? `${origin}/shop?category=${encodeURIComponent(selectedCategory)}`
          : `${origin}/shop`,
      robots: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
      breadcrumbs: [
        { name: isAr ? 'الرئيسية' : 'Accueil', item: `${origin}/` },
        { name: isAr ? 'المتجر' : 'Boutique', item: `${origin}/shop` },
      ],
    };
  }

  if (route === 'packs-women') {
    return {
      title: isAr
        ? 'باقات النساء: عطور ومستحضرات تجميل — بارفومري الخليفي'
        : 'Packs Femme Parfums & Cosmétiques — PARFUMERIE EL KHALIFI',
      description: isAr
        ? 'اكتشفوا باقات النساء التي تجمع بين أرقى العطور ومستحضرات العناية والجمال في طنجة مع التوصيل لجميع مدن المغرب.'
        : 'Découvrez nos Packs Femme alliant parfums de prestige et soins beauté à Tanger. Idéal pour offrir ou se faire plaisir, livré partout au Maroc.',
      url: `${origin}/packs-women`,
      robots: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
      breadcrumbs: [
        { name: isAr ? 'الرئيسية' : 'Accueil', item: `${origin}/` },
        { name: isAr ? 'باقات النساء' : 'Packs Femme', item: `${origin}/packs-women` },
      ],
    };
  }

  if (route === 'packs-men') {
    return {
      title: isAr
        ? 'باقات الرجال: عطور وعناية — بارفومري الخليفي'
        : 'Packs Homme Parfums & Soins — PARFUMERIE EL KHALIFI',
      description: isAr
        ? 'اكتشفوا باقات الرجال التي تجمع بين العطور الخشبية والشرقية ومنتجات العناية الأساسية في طنجة مع توصيل سريع لكل المغرب.'
        : 'Découvrez nos Packs Homme mêlant parfums boisés, orientaux et soins essentiels à Tanger. Livraison rapide dans tout le Maroc.',
      url: `${origin}/packs-men`,
      robots: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
      breadcrumbs: [
        { name: isAr ? 'الرئيسية' : 'Accueil', item: `${origin}/` },
        { name: isAr ? 'باقات الرجال' : 'Packs Homme', item: `${origin}/packs-men` },
      ],
    };
  }

  const catLabel =
    selectedCategory && selectedCategory !== 'Tout'
      ? ` (${getCategoryLabel(selectedCategory, lang)})`
      : '';
  return {
    title: isAr
      ? `بارفومري الخليفي — عطور ومستحضرات تجميل طنجة${catLabel}`
      : `PARFUMERIE EL KHALIFI — Parfums & Cosmétiques Tanger${catLabel}`,
    description: isAr
      ? 'بارفومري الخليفي بطنجة: عطور فرنسية وعربية وعطور نيش أصلية في قنينات مختومة، عناية بالبشرة ومكياج مع التوصيل لجميع مدن المغرب.'
      : 'PARFUMERIE EL KHALIFI à Tanger : parfums français, arabes et de niche en flacons originaux, soins visage et maquillage livrés partout au Maroc.',
    url:
      selectedCategory && selectedCategory !== 'Tout'
        ? `${origin}/?category=${encodeURIComponent(selectedCategory)}`
        : `${origin}/`,
    robots: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
    breadcrumbs: [{ name: isAr ? 'الرئيسية' : 'Accueil', item: `${origin}/` }],
  };
}

function buildProductJsonLd(product: Product, origin: string) {
  const imageCandidate = product.imageUrl || product.images?.[0];
  const absoluteImage =
    imageCandidate && !imageCandidate.startsWith('data:')
      ? imageCandidate.startsWith('http')
        ? imageCandidate
        : `${origin}${imageCandidate.startsWith('/') ? '' : '/'}${imageCandidate}`
      : `${origin}/assets/hero/hero-desktop.webp`;

  const prices =
    product.sizes && product.sizes.length > 0
      ? product.sizes.map((s) => s.price).filter((n) => Number.isFinite(n) && n >= 0)
      : [product.price];
  const lowPrice = prices.length > 0 ? Math.min(...prices) : product.price;
  const highPrice = prices.length > 0 ? Math.max(...prices) : product.price;

  return {
    '@type': 'Product',
    name: product.name?.fr || 'Création',
    description:
      (product.description?.fr || '').trim() ||
      `${product.name?.fr || 'Produit'} — ${product.category} disponible chez PARFUMERIE EL KHALIFI à Tanger.`,
    category: product.category,
    image: absoluteImage,
    brand: {
      '@type': 'Brand',
      name: 'PARFUMERIE EL KHALIFI',
    },
    offers:
      prices.length > 1 && highPrice > lowPrice
        ? {
            '@type': 'AggregateOffer',
            priceCurrency: 'MAD',
            lowPrice: String(lowPrice),
            highPrice: String(highPrice),
            offerCount: String(prices.length),
            availability: product.inStock
              ? 'https://schema.org/InStock'
              : 'https://schema.org/OutOfStock',
          }
        : {
            '@type': 'Offer',
            priceCurrency: 'MAD',
            price: String(lowPrice),
            availability: product.inStock
              ? 'https://schema.org/InStock'
              : 'https://schema.org/OutOfStock',
            seller: {
              '@type': 'Organization',
              name: 'PARFUMERIE EL KHALIFI',
            },
          },
  };
}

export function updateDocumentSeo(params: {
  route: AppRoute;
  selectedCategory: string;
  detailProduct: Product | null;
  products: Product[];
  packs: Pack[];
  lang?: SiteLang;
}): void {
  const { route, selectedCategory, detailProduct, products, packs, lang = 'fr' } = params;
  const seo = resolveRouteSeo(route, selectedCategory, detailProduct, lang);
  const origin =
    typeof window !== 'undefined' && window.location.origin.startsWith('http')
      ? window.location.origin
      : STORE_IDENTITY.canonicalUrl.replace(/\/$/, '');

  document.title = seo.title;
  upsertMeta('name', 'description', seo.description);
  upsertMeta('name', 'robots', seo.robots);
  upsertCanonical(seo.url);

  upsertMeta('property', 'og:title', seo.title);
  upsertMeta('property', 'og:description', seo.description);
  upsertMeta('property', 'og:url', seo.url);
  upsertMeta('name', 'twitter:title', seo.title);
  upsertMeta('name', 'twitter:description', seo.description);

  if (route === 'admin') {
    const existing = document.getElementById(DYNAMIC_LD_SCRIPT_ID);
    if (existing) existing.remove();
    return;
  }

  const graph: Record<string, unknown>[] = [
    {
      '@type': 'BreadcrumbList',
      itemListElement: seo.breadcrumbs.map((crumb, idx) => ({
        '@type': 'ListItem',
        position: idx + 1,
        name: crumb.name,
        item: crumb.item,
      })),
    },
  ];

  if (detailProduct) {
    graph.push(buildProductJsonLd(detailProduct, origin));
  } else if (route === 'packs-women' || route === 'packs-men') {
    const targetCategory = route === 'packs-women' ? 'women' : 'men';
    const visiblePacks = packs.filter((p) => p.active && p.category === targetCategory).slice(0, 12);
    if (visiblePacks.length > 0) {
      graph.push({
        '@type': 'ItemList',
        name: route === 'packs-women' ? 'Packs Femme' : 'Packs Homme',
        numberOfItems: visiblePacks.length,
        itemListElement: visiblePacks.map((pack, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          item: {
            '@type': 'Product',
            name: pack.name?.fr || 'Pack',
            description:
              (pack.description?.fr || '').trim() ||
              `Pack parfumerie et cosmétiques ${targetCategory === 'women' ? 'Femme' : 'Homme'} PARFUMERIE EL KHALIFI.`,
            offers: {
              '@type': 'Offer',
              priceCurrency: 'MAD',
              price: String(pack.price),
              availability: 'https://schema.org/InStock',
            },
          },
        })),
      });
    }
  } else if (products.length > 0) {
    const filtered =
      selectedCategory && selectedCategory !== 'Tout'
        ? products.filter((p) => p.category.toLowerCase() === selectedCategory.toLowerCase())
        : products;
    const sample = filtered.slice(0, 12);
    if (sample.length > 0) {
      graph.push({
        '@type': 'ItemList',
        name:
          selectedCategory && selectedCategory !== 'Tout'
            ? `Collection ${selectedCategory} — PARFUMERIE EL KHALIFI`
            : 'Catalogue Parfums & Cosmétiques — PARFUMERIE EL KHALIFI',
        numberOfItems: sample.length,
        itemListElement: sample.map((product, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          item: buildProductJsonLd(product, origin),
        })),
      });
    }
  }

  let script = document.getElementById(DYNAMIC_LD_SCRIPT_ID) as HTMLScriptElement | null;
  if (!script) {
    script = document.createElement('script');
    script.id = DYNAMIC_LD_SCRIPT_ID;
    script.type = 'application/ld+json';
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': graph,
  });
}
