import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import type { ToastMessage } from '../types/folix';
import { cn } from '../utils/format';

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

const TOAST_STYLES: Record<
  ToastMessage['type'],
  { icon: typeof Info; accentClass: string; iconClass: string }
> = {
  info: {
    icon: Info,
    accentClass: 'border-l-indigo-500',
    iconClass: 'text-indigo-500',
  },
  success: {
    icon: CheckCircle2,
    accentClass: 'border-l-emerald-500',
    iconClass: 'text-emerald-500',
  },
  warning: {
    icon: AlertTriangle,
    accentClass: 'border-l-amber-500',
    iconClass: 'text-amber-500',
  },
  error: {
    icon: AlertCircle,
    accentClass: 'border-l-rose-500',
    iconClass: 'text-rose-500',
  },
};

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div
      className="no-print fixed bottom-5 right-5 z-50 flex w-[360px] max-w-[calc(100vw-2.5rem)] flex-col gap-2.5 pointer-events-none"
      role="region"
      aria-label="Notificações"
    >
      {toasts.map((toast) => {
        const style = TOAST_STYLES[toast.type];
        const Icon = style.icon;
        return (
          <div
            key={toast.id}
            className={cn(
              'pointer-events-auto animate-slide-up flex items-start gap-3 rounded-xl border border-folix-border border-l-4 bg-folix-surface p-3.5 shadow-folix-lg',
              style.accentClass
            )}
          >
            <Icon className={cn('mt-0.5 h-4.5 w-4.5 shrink-0', style.iconClass)} size={18} />
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-folix-text leading-snug">
                {toast.title}
              </p>
              {toast.description && (
                <p className="mt-0.5 text-[12px] text-folix-text-secondary leading-relaxed break-words">
                  {toast.description}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              className="shrink-0 rounded-md p-1 text-folix-text-muted transition-colors hover:bg-[var(--folix-surface-hover)] hover:text-folix-text"
              aria-label="Fechar notificação"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

