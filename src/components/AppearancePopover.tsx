import { useEffect, useRef } from 'react';
import { Monitor, Moon, RotateCcw, Sun } from 'lucide-react';
import type {
  FontFamilyPreference,
  PageWidthPreference,
  ReaderSettings,
  ThemeMode,
} from '../types/folix';
import { DEFAULT_SETTINGS } from '../utils/storage';
import { cn } from '../utils/format';

interface AppearancePopoverProps {
  settings: ReaderSettings;
  onUpdate: (patch: Partial<ReaderSettings>) => void;
  onClose: () => void;
}

const THEME_OPTIONS: Array<{ value: ThemeMode; label: string; icon: typeof Sun }> = [
  { value: 'light', label: 'Claro', icon: Sun },
  { value: 'dark', label: 'Escuro', icon: Moon },
  { value: 'system', label: 'Sistema', icon: Monitor },
];

const FONT_OPTIONS: Array<{
  value: FontFamilyPreference;
  label: string;
  subtitle: string;
  previewClass: string;
}> = [
  {
    value: 'inter',
    label: 'Moderna',
    subtitle: 'Inter',
    previewClass: 'font-sans',
  },
  {
    value: 'merriweather',
    label: 'Editorial',
    subtitle: 'Merriweather',
    previewClass: 'font-serif',
  },
  {
    value: 'mono',
    label: 'Técnica',
    subtitle: 'JetBrains',
    previewClass: 'font-mono',
  },
];

const WIDTH_OPTIONS: Array<{ value: PageWidthPreference; label: string }> = [
  { value: 'comfortable', label: 'Confortável' },
  { value: 'wide', label: 'Ampla' },
  { value: 'expanded', label: 'Expandida' },
];

export function AppearancePopover({
  settings,
  onUpdate,
  onClose,
}: AppearancePopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    // Delay listener registration slightly so the opening click doesn't close immediately
    const timer = window.setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  return (
    <div
      ref={popoverRef}
      className="no-print absolute right-0 top-full z-40 mt-2 w-[312px] rounded-2xl border border-folix-border bg-folix-surface p-4 shadow-folix-lg animate-scale-in"
      role="dialog"
      aria-label="Preferências de aparência e leitura"
    >
      <div className="mb-3.5 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-folix-text-muted">
          Aparência e Leitura
        </span>
        <button
          type="button"
          onClick={() =>
            onUpdate({
              theme: DEFAULT_SETTINGS.theme,
              fontFamily: DEFAULT_SETTINGS.fontFamily,
              fontSize: DEFAULT_SETTINGS.fontSize,
              pageWidth: DEFAULT_SETTINGS.pageWidth,
            })
          }
          className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium text-folix-text-muted transition-colors hover:bg-[var(--folix-surface-hover)] hover:text-folix-text"
          title="Restaurar padrões de leitura"
        >
          <RotateCcw size={11} />
          <span>Padrão</span>
        </button>
      </div>

      {/* Theme Selector */}
      <div className="mb-4">
        <label className="mb-1.5 block text-[12px] font-medium text-folix-text-secondary">
          Tema visual
        </label>
        <div className="grid grid-cols-3 gap-1 rounded-xl bg-folix-bg p-1 border border-folix-border-subtle">
          {THEME_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const active = settings.theme === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onUpdate({ theme: opt.value })}
                className={cn(
                  'flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-[12px] font-medium transition-all',
                  active
                    ? 'bg-folix-surface text-folix-text shadow-folix-sm ring-1 ring-folix-border'
                    : 'text-folix-text-secondary hover:text-folix-text'
                )}
              >
                <Icon size={13} className={active ? 'text-folix-accent' : ''} />
                <span>{opt.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Font Family Selector */}
      <div className="mb-4">
        <label className="mb-1.5 block text-[12px] font-medium text-folix-text-secondary">
          Tipografia do documento
        </label>
        <div className="grid grid-cols-3 gap-1.5">
          {FONT_OPTIONS.map((opt) => {
            const active = settings.fontFamily === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onUpdate({ fontFamily: opt.value })}
                className={cn(
                  'flex flex-col items-center rounded-xl border px-2 py-2 text-center transition-all',
                  active
                    ? 'border-folix-accent bg-folix-accent-soft text-folix-text'
                    : 'border-folix-border bg-folix-surface-elevated text-folix-text-secondary hover:border-folix-text-muted/40 hover:text-folix-text'
                )}
              >
                <span className={cn('text-base font-semibold leading-tight', opt.previewClass)}>
                  Aa
                </span>
                <span className="mt-1 text-[11px] font-medium leading-none">
                  {opt.label}
                </span>
                <span className="mt-0.5 text-[10px] text-folix-text-muted leading-none">
                  {opt.subtitle}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Column Width Selector */}
      <div className="mb-4">
        <label className="mb-1.5 block text-[12px] font-medium text-folix-text-secondary">
          Largura da página
        </label>
        <div className="grid grid-cols-3 gap-1 rounded-xl bg-folix-bg p-1 border border-folix-border-subtle">
          {WIDTH_OPTIONS.map((opt) => {
            const active = settings.pageWidth === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onUpdate({ pageWidth: opt.value })}
                className={cn(
                  'rounded-lg py-1.5 text-[11.5px] font-medium transition-all',
                  active
                    ? 'bg-folix-surface text-folix-text shadow-folix-sm ring-1 ring-folix-border'
                    : 'text-folix-text-secondary hover:text-folix-text'
                )}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Font Size Slider */}
      <div>
        <div className="mb-1.5 flex items-center justify-between text-[12px]">
          <span className="font-medium text-folix-text-secondary">Tamanho do texto</span>
          <span className="font-mono text-[11px] font-semibold text-folix-accent">
            {settings.fontSize}%
          </span>
        </div>
        <input
          type="range"
          min={80}
          max={160}
          step={5}
          value={settings.fontSize}
          onChange={(e) => onUpdate({ fontSize: Number(e.target.value) })}
          className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-folix-border accent-[var(--folix-accent)]"
          aria-label="Tamanho do texto"
        />
        <div className="mt-1 flex justify-between text-[10px] text-folix-text-muted">
          <span>Compacto</span>
          <span>Padrão</span>
          <span>Ampliado</span>
        </div>
      </div>
    </div>
  );
}

