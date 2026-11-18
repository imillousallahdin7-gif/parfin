import React from 'react';

interface BrandLogoProps {
  sizeClass?: string;
  className?: string;
  alt?: string;
  glow?: boolean;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  sizeClass = 'w-12 h-12',
  className = '',
  alt = 'PARFUMERIE EL KHALIFI',
  glow = false,
}) => {
  return (
    <span
      className={`inline-block rounded-full overflow-hidden bg-[#0B0A08] shrink-0 ${sizeClass} ${
        glow ? 'drop-shadow-[0_0_28px_rgba(201,162,77,0.38)]' : ''
      } ${className}`}
    >
      <img
        src="/logo.webp"
        alt={alt}
        decoding="async"
        className="w-full h-full object-cover scale-[1.06]"
        referrerPolicy="no-referrer"
      />
    </span>
  );
};
