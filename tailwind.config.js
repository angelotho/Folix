/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Inter"', 'system-ui', '-apple-system', '"Segoe UI"', 'sans-serif'],
        serif: ['"Merriweather"', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono"', '"Cascadia Code"', 'Consolas', 'monospace'],
      },
      colors: {
        folix: {
          bg: 'var(--folix-bg)',
          surface: 'var(--folix-surface)',
          'surface-elevated': 'var(--folix-surface-elevated)',
          sidebar: 'var(--folix-sidebar)',
          border: 'var(--folix-border)',
          'border-subtle': 'var(--folix-border-subtle)',
          text: 'var(--folix-text)',
          'text-secondary': 'var(--folix-text-secondary)',
          'text-muted': 'var(--folix-text-muted)',
          accent: 'var(--folix-accent)',
          'accent-hover': 'var(--folix-accent-hover)',
          'accent-soft': 'var(--folix-accent-soft)',
          gold: 'var(--folix-gold)',
        },
      },
      boxShadow: {
        'folix-sm': 'var(--folix-shadow-sm)',
        'folix-md': 'var(--folix-shadow-md)',
        'folix-lg': 'var(--folix-shadow-lg)',
        'folix-doc': 'var(--folix-shadow-doc)',
      },
      animation: {
        'fade-in': 'folixFadeIn 180ms cubic-bezier(0.16, 1, 0.3, 1)',
        'scale-in': 'folixScaleIn 180ms cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-up': 'folixSlideUp 220ms cubic-bezier(0.16, 1, 0.3, 1)',
      },
      keyframes: {
        folixFadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        folixScaleIn: {
          from: { opacity: '0', transform: 'scale(0.97) translateY(4px)' },
          to: { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        folixSlideUp: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};

