import { flushSync } from 'react-dom';
import type { ResolvedTheme } from '../types/folix';

interface ViewTransitionLike {
  ready: Promise<void>;
  finished: Promise<void>;
  updateCallbackDone: Promise<void>;
  skipTransition: () => void;
}

type DocumentWithViewTransition = Document & {
  startViewTransition?: (
    updateCallback: () => Promise<void> | void
  ) => ViewTransitionLike;
};

let activeTransition: ViewTransitionLike | null = null;
let fallbackTimer: number | null = null;

export function applyDomThemeAttributes(resolvedTheme: ResolvedTheme): void {
  const root = document.documentElement;
  if (root.getAttribute('data-theme') !== resolvedTheme) {
    root.setAttribute('data-theme', resolvedTheme);
  }
  if (root.style.colorScheme !== resolvedTheme) {
    root.style.colorScheme = resolvedTheme;
  }
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function runSmoothThemeTransition(
  nextTheme: ResolvedTheme,
  commitStateUpdate: () => void,
  options?: { skipAnimation?: boolean }
): void {
  const root = document.documentElement;
  const currentTheme = root.getAttribute('data-theme') as ResolvedTheme | null;

  if (
    options?.skipAnimation ||
    prefersReducedMotion() ||
    !currentTheme ||
    currentTheme === nextTheme
  ) {
    applyDomThemeAttributes(nextTheme);
    commitStateUpdate();
    return;
  }

  const doc = document as DocumentWithViewTransition;

  if (typeof doc.startViewTransition === 'function') {
    if (activeTransition) {
      try {
        activeTransition.skipTransition();
      } catch {
        // Ignore if already finished
      }
      activeTransition = null;
    }

    try {
      const transition = doc.startViewTransition(() => {
        root.classList.add('folix-theme-switching');
        applyDomThemeAttributes(nextTheme);
        flushSync(() => {
          commitStateUpdate();
        });
      });

      activeTransition = transition;

      const clearSwitchingClass = () => {
        root.classList.remove('folix-theme-switching');
      };

      const cleanup = () => {
        clearSwitchingClass();
        if (activeTransition === transition) {
          activeTransition = null;
        }
      };

      transition.ready.then(clearSwitchingClass, clearSwitchingClass);
      transition.finished.then(cleanup, cleanup);
      return;
    } catch {
      root.classList.remove('folix-theme-switching');
    }
  }

  // Lightweight fallback affecting only top-level structural surfaces
  root.classList.add('folix-theme-fallback-transition');
  applyDomThemeAttributes(nextTheme);
  commitStateUpdate();

  if (fallbackTimer !== null) {
    window.clearTimeout(fallbackTimer);
  }
  fallbackTimer = window.setTimeout(() => {
    root.classList.remove('folix-theme-fallback-transition');
    fallbackTimer = null;
  }, 240);
}

