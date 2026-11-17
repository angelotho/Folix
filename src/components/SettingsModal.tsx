import { useEffect } from 'react';
import {
  Check,
  Monitor,
  Moon,
  Palette,
  RotateCcw,
  SlidersHorizontal,
  Sun,
  X,
} from 'lucide-react';
import type {
  FontFamilyPreference,
  PageWidthPreference,
  ReaderSettings,
  ResolvedTheme,
  ThemeMode,
} from '../types/folix';
import { DEFAULT_SETTINGS } from '../utils/storage';
import { cn } from '../utils/format';
import { ThemePreview } from './ThemePreview';

interface SettingsModalProps {
  isOpen: boolean;
  settings: ReaderSettings;
  systemTheme: ResolvedTheme;
  onUpdate: (patch: Partial<ReaderSettings>) => void;
  onClose: () => void;
}

const THEME_CARDS: Array<{
  value: ThemeMode;
  title: string;
  description: string;
  icon: typeof Sun;
}> = [
  {
    value: 'light',
    title: 'Claro',
    description: 'Papel editorial claro com alto contraste para leitura diurna.',
    icon: Sun,
  },
  {
    value: 'dark',
    title: 'Escuro',
    description: 'Carbono profundo equilibrado para conforto visual noturno.',
    icon: Moon,
  },
  {
    value: 'system',
    title: 'Sistema',
    description: 'Sincroniza automaticamente com o tema do Windows 11.',
    icon: Monitor,
  },
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
    subtitle: 'JetBrains Mono',
    previewClass: 'font-mono',
  },
];

const WIDTH_OPTIONS: Array<{ value: PageWidthPreference; label: string }> = [
  { value: 'comfortable', label: 'Confortável' },
  { value: 'wide', label: 'Ampla' },
  { value: 'expanded', label: 'Expandida' },
];

export function SettingsModal({
  isOpen,
  settings,
  systemTheme,
  onUpdate,
  onClose,
}: SettingsModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="no-print fixed inset-0 z-50 flex items-center justify-center bg-[var(--folix-modal-backdrop)] p-4 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="folix-settings-title"
    >
      <div
        className="flex max-h-[88vh] w-full max-w-[680px] flex-col overflow-hidden rounded-2xl border border-folix-border bg-folix-surface shadow-folix-lg animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-folix-border px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-folix-accent-soft text-folix-accent">
              <Palette size={18} />
            </div>
            <div>
              <h2
                id="folix-settings-title"
                className="text-[16px] font-semibold text-folix-text leading-tight"
              >
                Configurações
              </h2>
              <p className="mt-0.5 text-[12.5px] text-folix-text-secondary">
                Personalize a aparência e o conforto de leitura do Folix
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-folix-text-muted transition-colors hover:bg-[var(--folix-surface-hover)] hover:text-folix-text"
            aria-label="Fechar configurações"
            title="Fechar (Esc)"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
          {/* Theme Selection Section */}
          <section aria-labelledby="folix-theme-section">
            <div className="mb-3">
              <h3
                id="folix-theme-section"
                className="text-[13.5px] font-semibold text-folix-text"
              >
                Tema da interface
              </h3>
              <p className="text-[12px] text-folix-text-secondary">
                Aplicado imediatamente em toda a janela e nos documentos abertos
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {THEME_CARDS.map((card) => {
                const Icon = card.icon;
                const isSelected = settings.theme === card.value;
                return (
                  <button
                    key={card.value}
                    type="button"
                    onClick={() => onUpdate({ theme: card.value })}
                    aria-pressed={isSelected}
                    className={cn(
                      'group relative flex flex-col rounded-xl border p-2.5 text-left transition-all duration-150',
                      isSelected
                        ? 'border-folix-accent bg-folix-accent-soft/60 ring-2 ring-[var(--folix-accent-ring)] shadow-folix-sm'
                        : 'border-folix-border bg-folix-surface-elevated hover:border-folix-text-muted/45 hover:bg-folix-surface'
                    )}
                  >
                    {/* Visual Mini Preview */}
                    <div className="aspect-[16/10] w-full overflow-hidden rounded-lg shadow-folix-sm">
                      <ThemePreview
                        mode={card.value}
                        systemTheme={systemTheme}
                      />
                    </div>

                    {/* Title + Check */}
                    <div className="mt-2.5 flex items-center justify-between gap-2 px-0.5">
                      <div className="flex items-center gap-1.5">
                        <Icon
                          size={14}
                          className={
                            isSelected
                              ? 'text-folix-accent'
                              : 'text-folix-text-secondary'
                          }
                        />
                        <span className="text-[13px] font-semibold text-folix-text">
                          {card.title}
                        </span>
                      </div>

                      <span
                        className={cn(
                          'flex h-4.5 w-4.5 items-center justify-center rounded-full border transition-all',
                          isSelected
                            ? 'border-folix-accent bg-folix-accent text-white'
                            : 'border-folix-border bg-folix-surface text-transparent'
                        )}
                      >
                        <Check size={11} strokeWidth={3} />
                      </span>
                    </div>

                    <p className="mt-1 px-0.5 text-[11.5px] leading-snug text-folix-text-secondary">
                      {card.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </section>

          <div className="h-px bg-folix-border-subtle" aria-hidden="true" />

          {/* Reading Preferences Section */}
          <section aria-labelledby="folix-reading-section">
            <div className="mb-3 flex items-center gap-2">
              <SlidersHorizontal size={14} className="text-folix-accent" />
              <h3
                id="folix-reading-section"
                className="text-[13.5px] font-semibold text-folix-text"
              >
                Leitura e tipografia
              </h3>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Font Family */}
              <div className="rounded-xl border border-folix-border bg-folix-surface-elevated p-3.5">
                <label className="mb-2 block text-[12px] font-medium text-folix-text-secondary">
                  Família tipográfica do documento
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
                          'flex flex-col items-center rounded-lg border px-1.5 py-2 text-center transition-all',
                          active
                            ? 'border-folix-accent bg-folix-accent-soft text-folix-text'
                            : 'border-folix-border bg-folix-surface text-folix-text-secondary hover:text-folix-text'
                        )}
                      >
                        <span
                          className={cn(
                            'text-[15px] font-semibold leading-tight',
                            opt.previewClass
                          )}
                        >
                          Aa
                        </span>
                        <span className="mt-1 text-[11px] font-medium leading-none">
                          {opt.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Page Width & Font Size */}
              <div className="flex flex-col justify-between gap-3 rounded-xl border border-folix-border bg-folix-surface-elevated p-3.5">
                <div>
                  <label className="mb-1.5 block text-[12px] font-medium text-folix-text-secondary">
                    Largura da folha de leitura
                  </label>
                  <div className="grid grid-cols-3 gap-1 rounded-lg border border-folix-border-subtle bg-folix-bg p-0.5">
                    {WIDTH_OPTIONS.map((opt) => {
                      const active = settings.pageWidth === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => onUpdate({ pageWidth: opt.value })}
                          className={cn(
                            'rounded-md py-1 text-[11.5px] font-medium transition-all',
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

                <div>
                  <div className="mb-1 flex items-center justify-between text-[12px]">
                    <span className="font-medium text-folix-text-secondary">
                      Tamanho base do texto
                    </span>
                    <span className="font-mono text-[11.5px] font-semibold text-folix-accent">
                      {settings.fontSize}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={80}
                    max={160}
                    step={5}
                    value={settings.fontSize}
                    onChange={(e) =>
                      onUpdate({ fontSize: Number(e.target.value) })
                    }
                    className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-folix-border accent-[var(--folix-accent)]"
                    aria-label="Tamanho base do texto"
                  />
                </div>
              </div>
            </div>

            {/* Sidebar Default Toggle */}
            <div className="mt-3 flex items-center justify-between rounded-xl border border-folix-border bg-folix-surface-elevated px-4 py-3">
              <div>
                <p className="text-[12.5px] font-medium text-folix-text">
                  Exibir sumário lateral ao abrir documentos
                </p>
                <p className="text-[11.5px] text-folix-text-muted">
                  Pode ser alternado rapidamente a qualquer momento com Ctrl + B
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={settings.sidebarOpen}
                onClick={() =>
                  onUpdate({ sidebarOpen: !settings.sidebarOpen })
                }
                className={cn(
                  'relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border transition-colors',
                  settings.sidebarOpen
                    ? 'border-folix-accent bg-folix-accent'
                    : 'border-folix-border bg-folix-bg'
                )}
                aria-label="Exibir sumário lateral ao abrir documentos"
              >
                <span
                  className={cn(
                    'inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform',
                    settings.sidebarOpen ? 'translate-x-4' : 'translate-x-0.5'
                  )}
                />
              </button>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-folix-border bg-folix-surface-elevated px-6 py-3.5">
          <button
            type="button"
            onClick={() => onUpdate(DEFAULT_SETTINGS)}
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12.5px] font-medium text-folix-text-secondary transition-colors hover:bg-[var(--folix-surface-hover)] hover:text-folix-text"
          >
            <RotateCcw size={13} />
            <span>Restaurar padrão</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8.5 items-center rounded-xl bg-folix-accent px-4 py-1.5 text-[13px] font-semibold text-white shadow-folix-sm transition-colors hover:bg-folix-accent-hover"
          >
            Concluído
          </button>
        </div>
      </div>
    </div>
  );
}

