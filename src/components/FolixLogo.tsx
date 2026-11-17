import type { ResolvedTheme } from '../types/folix';
import { cn } from '../utils/format';

interface FolixLogoProps {
  variant?: 'symbol' | 'full';
  resolvedTheme?: ResolvedTheme;
  size?: number;
  className?: string;
}

export function FolixLogo({
  variant = 'symbol',
  resolvedTheme = 'light',
  size = 24,
  className,
}: FolixLogoProps) {
  const isDark = resolvedTheme === 'dark';

  if (variant === 'full') {
    const src = isDark ? './folix-logo-dark.png' : './folix-logo-light.png';
    return (
      <img
        src={src}
        alt="Folix"
        style={{ height: `${size}px`, width: 'auto' }}
        className={cn('block select-none object-contain', className)}
        draggable={false}
      />
    );
  }

  const symbolSrc = isDark ? './folix-symbol-dark.png' : './folix-symbol.png';
  return (
    <img
      src={symbolSrc}
      alt="Folix"
      width={size}
      height={size}
      style={{ width: `${size}px`, height: `${size}px` }}
      className={cn('block shrink-0 select-none object-contain', className)}
      draggable={false}
    />
  );
}
