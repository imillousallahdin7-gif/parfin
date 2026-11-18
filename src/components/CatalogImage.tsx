import React, { useEffect, useRef, useState } from 'react';

interface CatalogImageProps {
  src?: string;
  fallbackSrc?: string;
  alt: string;
  title: string;
  eager?: boolean;
  className?: string;
  aspectClass?: string;
}

const RETRY_DELAYS = [1500, 4000, 9000];

export const CatalogImage: React.FC<CatalogImageProps> = ({
  src,
  fallbackSrc,
  alt,
  title,
  eager = false,
  className = '',
  aspectClass = 'aspect-[4/5]',
}) => {
  const initialSrc = src || fallbackSrc || '';
  const [activeBaseSrc, setActiveBaseSrc] = useState(initialSrc);
  const [loaded, setLoaded] = useState(initialSrc.startsWith('data:'));
  const [failed, setFailed] = useState(!initialSrc);
  const [retryCount, setRetryCount] = useState(0);
  const [cacheBust, setCacheBust] = useState('');
  const retryTimerRef = useRef<number | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    const initial = src || fallbackSrc || '';
    setActiveBaseSrc(initial);
    setLoaded(initial.startsWith('data:'));
    setFailed(!initial);
    setRetryCount(0);
    setCacheBust('');
    if (retryTimerRef.current) {
      window.clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  }, [src, fallbackSrc]);

  useEffect(() => {
    const el = imgRef.current;
    if (el && el.complete && el.naturalWidth > 0) {
      setLoaded(true);
    }
  }, [activeBaseSrc, cacheBust]);

  useEffect(() => {
    if (!activeBaseSrc) return;

    const handleRecover = () => {
      if (failed && document.visibilityState !== 'hidden') {
        setFailed(false);
        setLoaded(activeBaseSrc.startsWith('data:'));
        setRetryCount(0);
        setCacheBust(`r=${Date.now()}`);
      }
    };

    window.addEventListener('online', handleRecover);
    document.addEventListener('visibilitychange', handleRecover);
    return () => {
      window.removeEventListener('online', handleRecover);
      document.removeEventListener('visibilitychange', handleRecover);
      if (retryTimerRef.current) {
        window.clearTimeout(retryTimerRef.current);
      }
    };
  }, [activeBaseSrc, failed]);

  const handleError = () => {
    if (fallbackSrc && activeBaseSrc !== fallbackSrc) {
      setActiveBaseSrc(fallbackSrc);
      setLoaded(fallbackSrc.startsWith('data:'));
      setFailed(false);
      setRetryCount(0);
      setCacheBust('');
      return;
    }
    if (!activeBaseSrc) {
      setFailed(true);
      return;
    }
    if (retryCount < RETRY_DELAYS.length) {
      const delay = RETRY_DELAYS[retryCount];
      retryTimerRef.current = window.setTimeout(() => {
        setRetryCount((c) => c + 1);
        setCacheBust(`retry=${Date.now()}`);
      }, delay);
    } else {
      setFailed(true);
    }
  };

  const resolvedSrc = (() => {
    if (!activeBaseSrc) return '';
    if (!cacheBust || activeBaseSrc.startsWith('data:')) return activeBaseSrc;
    const sep = activeBaseSrc.includes('?') ? '&' : '?';
    return `${activeBaseSrc}${sep}${cacheBust}`;
  })();

  const isDataUrl = resolvedSrc.startsWith('data:');
  const showImage = isDataUrl || loaded;

  return (
    <div className={`relative w-full ${aspectClass} overflow-hidden bg-[#F3EFE8] ${className}`}>
      {!showImage && !failed && (
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[#F3EFE8] animate-pulse"
        />
      )}

      {!failed && resolvedSrc ? (
        <img
          ref={imgRef}
          src={resolvedSrc}
          alt={alt}
          loading={eager || isDataUrl ? 'eager' : 'lazy'}
          decoding={eager || isDataUrl ? 'sync' : 'async'}
          referrerPolicy="no-referrer"
          onLoad={() => setLoaded(true)}
          onError={handleError}
          className="relative z-10 w-full h-full object-cover opacity-100"
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-5 text-center bg-gradient-to-b from-[#FAF8F5] to-[#F3EFE8]">
          <span className="text-[#8A6D3B] text-sm mb-2" aria-hidden="true">
            ◆
          </span>
          <p className="font-brand text-xs tracking-[0.14em] text-[#111111]/80 line-clamp-3 leading-relaxed">
            {title}
          </p>
          <span className="mt-2 h-px w-8 bg-[#C5A059]/60" aria-hidden="true" />
        </div>
      )}
    </div>
  );
};
