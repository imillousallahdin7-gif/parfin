import React from 'react';

const TESTIMONIALS = [
  {
    quote:
      "J'ai commandé un sérum éclat visage et deux décants 10 ml pour tester avant mon mariage. Produits 100 % authentiques, emballage soigné et tenue irréprochable.",
    author: 'Yasmine B.',
    city: 'Casablanca',
  },
  {
    quote:
      "Conseil sur mesure via WhatsApp pour ma routine cosmétique quotidienne et un parfum boisé léger. Colis reçu le lendemain matin avec facture claire.",
    author: 'Karim E.',
    city: 'Rabat',
  },
  {
    quote:
      "Mes crèmes hydratantes et mes parfums favoris proviennent désormais d'une seule adresse fiable. La qualité et la traçabilité des produits sont exemplaires.",
    author: 'Nadia T.',
    city: 'Marrakech',
  },
  {
    quote:
      "Passage à la boutique à Tanger rue Florencia : accueil chaleureux, conseils précieux entre soins visage et accords ambrés, et livraison express à domicile.",
    author: 'Mehdi A.',
    city: 'Tanger',
  },
  {
    quote:
      "Mon mari a reçu un pack homme parfum et soin visage en cadeau. La présentation noir et or fait immédiatement son effet et les produits sont impeccables.",
    author: 'Houda Z.',
    city: 'Fès',
  },
  {
    quote:
      "Commande mixte maquillage et eau de parfum passée en deux minutes via WhatsApp, confirmation immédiate et réception à Agadir sans aucun souci.",
    author: 'Amine R.',
    city: 'Agadir',
  },
];

export const Testimonials: React.FC = () => {
  return (
    <section
      aria-label="Avis de nos clients"
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20"
    >
      <div className="mb-12 max-w-2xl">
        <p className="text-[11px] uppercase tracking-[0.18em] text-[#8A6D3B] mb-2">
          Confiance &amp; Fidélité
        </p>
        <h2 className="font-display text-3xl sm:text-4xl font-semibold tracking-[0.04em] text-[#111111]">
          Ce que disent nos clients au Maroc
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-10">
        {TESTIMONIALS.map((item) => (
          <figure
            key={`${item.author}-${item.city}`}
            className="pt-6 border-t border-[#E5DFD5] flex flex-col justify-between"
          >
            <blockquote className="text-sm sm:text-[15px] text-[#111111]/85 leading-relaxed">
              &ldquo;{item.quote}&rdquo;
            </blockquote>
            <figcaption className="mt-5 flex items-center gap-2 text-xs uppercase tracking-[0.12em]">
              <span className="font-semibold text-[#111111]">{item.author}</span>
              <span className="text-[#C5A059]" aria-hidden="true">
                ·
              </span>
              <span className="text-[#8A6D3B]">{item.city}</span>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
};
