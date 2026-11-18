import { AppRoute, Pack, Product, STORE_IDENTITY } from '../types/catalog';

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

function resolveRouteSeo(route: AppRoute, selectedCategory: string, detailProduct: Product | null) {
  const origin =
    typeof window !== 'undefined' && window.location.origin.startsWith('http')
      ? window.location.origin
      : STORE_IDENTITY.canonicalUrl.replace(/\/$/, '');

  if (route === 'admin') {
    return {
      title: 'Administration | PARFUMERIE EL KHALIFI',
      description: 'Espace d’administration privé PARFUMERIE EL KHALIFI.',
      url: `${origin}/admin`,
      robots: 'noindex, nofollow',
      breadcrumbs: [
        { name: 'Accueil', item: `${origin}/` },
        { name: 'Administration', item: `${origin}/admin` },
      ],
    };
  }

  if (detailProduct) {
    const productName = detailProduct.name?.fr || 'Création';
    const rawDesc = (detailProduct.description?.fr || '').trim();
    const minPrice =
      detailProduct.sizes && detailProduct.sizes.length > 0
        ? Math.min(...detailProduct.sizes.map((s) => s.price))
        : detailProduct.price;
    const desc =
      rawDesc.length >= 40
        ? rawDesc.slice(0, 155)
        : `${productName} (${detailProduct.category}) à partir de ${minPrice} DH chez PARFUMERIE EL KHALIFI à Tanger. Livraison dans tout le Maroc.`;

    return {
      title: `${productName} — PARFUMERIE EL KHALIFI Tanger`,
      description: desc,
      url: `${origin}${route === 'shop' ? '/shop' : '/'}`,
      robots: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
      breadcrumbs: [
        { name: 'Accueil', item: `${origin}/` },
        { name: 'Boutique', item: `${origin}/shop` },
        { name: productName, item: `${origin}/shop` },
      ],
    };
  }

  if (route === 'shop') {
    const catSuffix = selectedCategory && selectedCategory !== 'Tout' ? ` · ${selectedCategory}` : '';
    return {
      title: `Boutique Parfums & Cosmétiques${catSuffix} — PARFUMERIE EL KHALIFI`,
      description: `Explorez notre catalogue complet de parfums originaux, décants, soins visage et maquillage${catSuffix} à Tanger. Commande WhatsApp & livraison partout au Maroc.`,
      url:
        selectedCategory && selectedCategory !== 'Tout'
          ? `${origin}/shop?category=${encodeURIComponent(selectedCategory)}`
          : `${origin}/shop`,
      robots: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
      breadcrumbs: [
        { name: 'Accueil', item: `${origin}/` },
        { name: 'Boutique', item: `${origin}/shop` },
      ],
    };
  }

  if (route === 'packs-women') {
    return {
      title: 'Packs Femme Parfums & Cosmétiques — PARFUMERIE EL KHALIFI',
      description:
        'Découvrez nos Packs Femme alliant parfums de prestige et soins beauté à Tanger. Idéal pour offrir ou se faire plaisir, livré partout au Maroc.',
      url: `${origin}/packs-women`,
      robots: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
      breadcrumbs: [
        { name: 'Accueil', item: `${origin}/` },
        { name: 'Packs Femme', item: `${origin}/packs-women` },
      ],
    };
  }

  if (route === 'packs-men') {
    return {
      title: 'Packs Homme Parfums & Soins — PARFUMERIE EL KHALIFI',
      description:
        'Découvrez nos Packs Homme mêlant parfums boisés, orientaux et soins essentiels à Tanger. Livraison rapide dans tout le Maroc.',
      url: `${origin}/packs-men`,
      robots: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
      breadcrumbs: [
        { name: 'Accueil', item: `${origin}/` },
        { name: 'Packs Homme', item: `${origin}/packs-men` },
      ],
    };
  }

  const catLabel = selectedCategory && selectedCategory !== 'Tout' ? ` (${selectedCategory})` : '';
  return {
    title: `PARFUMERIE EL KHALIFI — Parfums & Cosmétiques Tanger${catLabel}`,
    description:
      'PARFUMERIE EL KHALIFI à Tanger : parfums français, arabes et de niche, décants sur mesure, soins visage et maquillage livrés partout au Maroc.',
    url:
      selectedCategory && selectedCategory !== 'Tout'
        ? `${origin}/?category=${encodeURIComponent(selectedCategory)}`
        : `${origin}/`,
    robots: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
    breadcrumbs: [{ name: 'Accueil', item: `${origin}/` }],
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
}): void {
  const { route, selectedCategory, detailProduct, products, packs } = params;
  const seo = resolveRouteSeo(route, selectedCategory, detailProduct);
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
