import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error.message || 'Une erreur inattendue est survenue.',
    };
  }

  render() {
    if (this.state.hasError) {
      const isAr =
        typeof document !== 'undefined' &&
        (document.documentElement.lang === 'ar' || document.documentElement.dir === 'rtl');
      return (
        <div
          dir={isAr ? 'rtl' : 'ltr'}
          className="min-h-screen bg-[#F6F1E7] text-[#0B0A08] flex items-center justify-center p-6"
        >
          <div className="max-w-lg w-full bg-[#FDFCFA] border border-[#DDD3BE] p-8 text-center">
            <p className="text-xs uppercase tracking-[0.18em] text-[#8F6E2E] mb-3">
              PARFUMERIE EL KHALIFI
            </p>
            <h1 className="font-brand text-2xl mb-4">
              {isAr ? 'توقف مؤقت' : 'Interruption momentanée'}
            </h1>
            <p className="text-sm text-[#8C857B] mb-6 leading-relaxed">
              {isAr
                ? 'حدث خطأ تقني مؤقت أثناء تحميل هذا القسم.'
                : 'Une anomalie technique est survenue lors du chargement de cette section.'}
            </p>
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false, message: '' });
                window.location.hash = '';
                window.location.reload();
              }}
              className="btn-primary-wipe px-6 py-3 text-xs uppercase tracking-[0.14em]"
            >
              {isAr ? 'العودة إلى المتجر' : 'Retourner à la boutique'}
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
