import pkg from '../../package.json';
import type { ResolvedTheme } from '../types/folix';
import { cn } from '../utils/format';
import { FolixLogo } from './FolixLogo';

interface SplashScreenProps {
  resolvedTheme: ResolvedTheme;
  isExiting: boolean;
  isStillLoading: boolean;
}

export function SplashScreen({
  resolvedTheme,
  isExiting,
  isStillLoading,
}: SplashScreenProps) {
  const isDark = resolvedTheme === 'dark';

  return (
    <div
      className={cn(
        'no-print folix-drag-region fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden select-none transition-all duration-500 ease-out',
        isDark ? 'bg-[#0B0C10] text-[#EDEDEF]' : 'bg-[#F5F2EC] text-[#181816]',
        isExiting
          ? 'pointer-events-none opacity-0 scale-[1.02]'
          : 'opacity-100 scale-100'
      )}
      role="status"
      aria-label="Iniciando Folix"
    >
      {/* Subtle Architectural Editorial Grid */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: isDark
            ? 'linear-gradient(to right, rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.035) 1px, transparent 1px)'
            : 'linear-gradient(to right, rgba(28,28,61,0.045) 1px, transparent 1px), linear-gradient(to bottom, rgba(28,28,61,0.045) 1px, transparent 1px)',
          backgroundSize: '44px 44px',
          maskImage:
            'radial-gradient(ellipse 68% 60% at 50% 50%, #000 18%, transparent 100%)',
          WebkitMaskImage:
            'radial-gradient(ellipse 68% 60% at 50% 50%, #000 18%, transparent 100%)',
        }}
        aria-hidden="true"
      />

      {/* Ambient Brand Illumination (Official Lavender #9B98EF & Navy #1C1C3D) */}
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden"
        aria-hidden="true"
      >
        <div
          className="folix-splash-glow absolute left-1/2 top-1/2 h-[420px] w-[560px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[95px]"
          style={{
            background: isDark
              ? 'radial-gradient(circle, rgba(155, 152, 239, 0.19) 0%, rgba(28, 28, 61, 0.25) 48%, transparent 75%)'
              : 'radial-gradient(circle, rgba(155, 152, 239, 0.30) 0%, rgba(28, 28, 61, 0.08) 52%, transparent 76%)',
          }}
        />
      </div>

      {/* Editorial Composition: Layered Abstract Folio Pages + Centerpiece */}
      <div className="relative z-10 flex flex-col items-center">
        <div className="relative flex items-center justify-center px-14 py-8">
          {/* Left Abstract Document Sheet */}
          <div
            className={cn(
              'folix-splash-sheet-left pointer-events-none absolute left-1/2 top-1/2 h-[176px] w-[144px] rounded-2xl border p-4 shadow-folix-md',
              isDark
                ? 'border-white/[0.08] bg-[#131520]/85'
                : 'border-[#1C1C3D]/[0.09] bg-white/80'
            )}
            aria-hidden="true"
          >
            {/* Folded page corner accent */}
            <span className="absolute right-0 top-0 h-5 w-5 rounded-bl-lg bg-[#9B98EF]/35" />
            <div className="mt-2 space-y-2.5">
              <div
                className={cn(
                  'h-2 w-14 rounded-full',
                  isDark ? 'bg-[#9B98EF]/40' : 'bg-[#1C1C3D]/20'
                )}
              />
              <div
                className={cn(
                  'h-1.5 w-full rounded-full',
                  isDark ? 'bg-white/10' : 'bg-[#1C1C3D]/10'
                )}
              />
              <div
                className={cn(
                  'h-1.5 w-4/5 rounded-full',
                  isDark ? 'bg-white/10' : 'bg-[#1C1C3D]/10'
                )}
              />
              <div
                className={cn(
                  'h-1.5 w-5/6 rounded-full',
                  isDark ? 'bg-white/10' : 'bg-[#1C1C3D]/10'
                )}
              />
            </div>
          </div>

          {/* Right Abstract Document Sheet */}
          <div
            className={cn(
              'folix-splash-sheet-right pointer-events-none absolute left-1/2 top-1/2 h-[176px] w-[144px] rounded-2xl border p-4 shadow-folix-md',
              isDark
                ? 'border-white/[0.08] bg-[#131520]/85'
                : 'border-[#1C1C3D]/[0.09] bg-white/80'
            )}
            aria-hidden="true"
          >
            <span className="absolute right-0 top-0 h-5 w-5 rounded-bl-lg bg-[#9B98EF]/35" />
            <div className="mt-2 space-y-2.5">
              <div
                className={cn(
                  'h-2 w-12 rounded-full',
                  isDark ? 'bg-[#9B98EF]/35' : 'bg-[#9B98EF]/55'
                )}
              />
              <div
                className={cn(
                  'h-1.5 w-full rounded-full',
                  isDark ? 'bg-white/10' : 'bg-[#1C1C3D]/10'
                )}
              />
              <div
                className={cn(
                  'h-1.5 w-3/4 rounded-full',
                  isDark ? 'bg-white/10' : 'bg-[#1C1C3D]/10'
                )}
              />
              <div
                className={cn(
                  'mt-3 h-7 w-full rounded-lg border',
                  isDark
                    ? 'border-white/[0.06] bg-white/[0.03]'
                    : 'border-[#1C1C3D]/[0.07] bg-[#F5F2EC]/80'
                )}
              />
            </div>
          </div>

          {/* Central Elevated Brand Stage */}
          <div
            className={cn(
              'folix-splash-stage relative z-10 flex flex-col items-center rounded-3xl border px-10 py-8 backdrop-blur-xl',
              isDark
                ? 'border-white/[0.11] bg-[#11131B]/90 shadow-[0_24px_60px_-14px_rgba(0,0,0,0.75)]'
                : 'border-[#1C1C3D]/[0.09] bg-white/92 shadow-[0_24px_56px_-16px_rgba(28,28,61,0.18)]'
            )}
          >
            {/* Subtle top hairline shimmer */}
            <div
              className="pointer-events-none absolute inset-x-10 top-0 h-px"
              style={{
                background:
                  'linear-gradient(90deg, transparent, rgba(155, 152, 239, 0.7), transparent)',
              }}
              aria-hidden="true"
            />

            <div className="folix-splash-logo-reveal">
              <FolixLogo
                variant="full"
                resolvedTheme={resolvedTheme}
                size={68}
              />
            </div>

            <p
              className={cn(
                'folix-splash-subtitle mt-4 text-[13px] font-medium tracking-wide',
                isDark ? 'text-[#A2A5B5]' : 'text-[#5A5852]'
              )}
            >
              Leitura editorial para documentos Markdown
            </p>
          </div>
        </div>

        {/* Discreet Readiness Indicator */}
        <div className="folix-splash-progress-wrap mt-3 flex flex-col items-center gap-2.5">
          <div
            className={cn(
              'relative h-[2.5px] w-[184px] overflow-hidden rounded-full',
              isDark ? 'bg-white/[0.08]' : 'bg-[#1C1C3D]/[0.09]'
            )}
          >
            <div
              className={cn(
                'h-full rounded-full',
                isStillLoading
                  ? 'folix-splash-progress-indeterminate w-2/5'
                  : 'folix-splash-progress-fill w-full'
              )}
              style={{
                background: isDark
                  ? 'linear-gradient(90deg, #6366F1, #9B98EF)'
                  : 'linear-gradient(90deg, #1C1C3D, #9B98EF)',
              }}
            />
          </div>

          <span
            className={cn(
              'text-[11px] font-medium tracking-wider uppercase',
              isDark ? 'text-[#6E7282]' : 'text-[#86837B]'
            )}
          >
            {isStillLoading ? 'Preparando documentos...' : `Versão ${pkg.version}`}
          </span>
        </div>
      </div>
    </div>
  );
}

