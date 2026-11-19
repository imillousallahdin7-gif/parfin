import React from 'react';
import { formatLatinNumber } from '../utils/format';
import { useLanguage } from '../contexts/LanguageContext';

interface LatinNumberProps {
  value: number | string;
  className?: string;
}

export const LatinNumber: React.FC<LatinNumberProps> = ({ value, className = '' }) => (
  <span translate="no" dir="ltr" lang="en" className={`notranslate tabular-nums ${className}`}>
    {value}
  </span>
);

interface LatinPriceProps {
  amount: number;
  className?: string;
  currencyLabel?: string;
}

export const LatinPrice: React.FC<LatinPriceProps> = ({
  amount,
  className = '',
  currencyLabel,
}) => {
  const { isAr } = useLanguage();
  const label = currencyLabel ?? (isAr ? 'درهم مغربي' : 'MAD');

  return (
    <span className={`tabular-nums whitespace-nowrap inline-flex items-baseline gap-1 ${className}`}>
      <span translate="no" dir="ltr" lang="en" className="notranslate">
        {formatLatinNumber(amount)}
      </span>
      <span>{label}</span>
    </span>
  );
};
