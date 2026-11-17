import { useEffect } from 'react';
import { X, ZoomIn } from 'lucide-react';

interface ImageLightboxProps {
  src: string;
  alt?: string;
  onClose: () => void;
}

export function ImageLightbox({ src, alt, onClose }: ImageLightboxProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="no-print fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-6 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={alt || 'Visualização ampliada de imagem'}
    >
      <div
        className="relative flex max-h-[90vh] max-w-[92vw] flex-col items-center gap-3 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex w-full items-center justify-between gap-4 rounded-xl border border-white/10 bg-[#14161D]/90 px-4 py-2 text-white shadow-lg backdrop-blur-md">
          <div className="flex items-center gap-2 text-xs text-white/80 truncate">
            <ZoomIn size={14} className="shrink-0 text-indigo-400" />
            <span className="truncate">{alt || 'Imagem do documento'}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Fechar visualização"
          >
            <X size={16} />
          </button>
        </div>

        <img
          src={src}
          alt={alt || ''}
          className="max-h-[80vh] max-w-[90vw] rounded-xl border border-white/10 object-contain shadow-2xl bg-white/5"
        />
      </div>
    </div>
  );
}

