import type { ResolvedTheme } from '../types/folix';
import { FolixLogo } from './FolixLogo';

interface DocumentLoaderProps {
  fileName?: string;
  resolvedTheme: ResolvedTheme;
}

export function DocumentLoader({
  fileName,
  resolvedTheme,
}: DocumentLoaderProps) {
  const isDark = resolvedTheme === 'dark';

  return (
    <div
      className="no-print relative flex flex-1 items-center justify-center overflow-hidden bg-folix-bg px-6 animate-fade-in"
      role="status"
      aria-live="polite"
      aria-label="Carregando documento Markdown"
    >
      {/* Subtle Ambient Aura */}
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden"
        aria-hidden="true"
      >
        <div
          className="absolute left-1/2 top-1/2 h-[300px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[90px]"
          style={{
            background: isDark
              ? 'radial-gradient(circle, rgba(155, 152, 239, 0.16) 0%, transparent 72%)'
              : 'radial-gradient(circle, rgba(155, 152, 239, 0.24) 0%, transparent 72%)',
          }}
        />
      </div>

      {/* Centered Minimalist Brand Card */}
      <div className="relative z-10 flex w-full max-w-[340px] flex-col items-center rounded-2xl border border-folix-border bg-folix-surface px-8 py-7 text-center shadow-folix-lg animate-scale-in">
        {/* Top specular highlight */}
        <div
          className="pointer-events-none absolute inset-x-10 top-0 h-px"
          style={{
            background:
              'linear-gradient(90deg, transparent, rgba(155, 152, 239, 0.55), transparent)',
          }}
          aria-hidden="true"
        />

        {/* Floating Official Emblem inside subtle orbital ring */}
        <div className="relative mb-4 flex h-16 w-16 items-center justify-center">
          <span
            className="absolute inset-0 rounded-2xl border border-folix-accent/25 bg-folix-accent-soft/50"
            aria-hidden="true"
          />
          <div className="folix-loader-logo relative z-10">
            <FolixLogo
              variant="symbol"
              resolvedTheme={resolvedTheme}
              size={38}
            />
          </div>
        </div>

        <p className="w-full truncate text-[14px] font-semibold text-folix-text">
          {fileName || 'Documento Markdown'}
        </p>
        <p className="mt-1 text-[12px] text-folix-text-secondary">
          Formatando para leitura...
        </p>

        {/* Smooth Luminous Progress Bar */}
        <div className="mt-5 h-[3px] w-[168px] overflow-hidden rounded-full bg-folix-border-subtle">
          <div
            className="folix-loader-bar h-full w-full rounded-full"
            style={{
              background: isDark
                ? 'linear-gradient(90deg, #6366F1 0%, #9B98EF 100%)'
                : 'linear-gradient(90deg, #1C1C3D 0%, #6366F1 55%, #9B98EF 100%)',
              boxShadow: isDark
                ? '0 0 10px rgba(155, 152, 239, 0.45)'
                : '0 0 8px rgba(99, 102, 241, 0.25)',
            }}
          />
        </div>
      </div>
    </div>
  );
}
