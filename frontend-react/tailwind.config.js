/** Evidentia strict Light Theme design system */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#F4F1EA',
        surface: '#FBFAF6',
        'surface-2': '#EFEBE1',
        ink: '#14130F',
        'ink-muted': '#6B675C',
        line: 'rgba(20, 19, 15, 0.14)',
        'line-strong': '#14130F',
        amber: {
          50: '#fffbeb', 100: '#fef3c7', 200: '#fde68a', 300: '#fcd34d', 400: '#fbbf24',
          500: '#F59E0B', 600: '#d97706', 700: '#b45309', 800: '#92400e', 900: '#78350f',
        },
        verdict: {
          genuine: { DEFAULT: '#059669', bg: '#ecfdf5', text: '#064e3b' },
          copy: { DEFAULT: '#0D9488', bg: '#f0fdfa', text: '#134e4a' },
          altered: { DEFAULT: '#EA580C', bg: '#fff7ed', text: '#7c2d12' },
          forged: { DEFAULT: '#E11D48', bg: '#fff1f2', text: '#881337' },
          revoked: { DEFAULT: '#7C3AED', bg: '#f5f3ff', text: '#4c1d95' },
          unverifiable: { DEFAULT: '#78716C', bg: '#f5f5f4', text: '#44403c' },
        }
      },
      fontFamily: {
        sans: ['Geist', 'Inter', 'sans-serif'],
        display: ['"Instrument Serif"', 'serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      borderRadius: {
        none: '0',
        sm: '2px',
        DEFAULT: '4px',
        full: '9999px',
      },
      boxShadow: {
        hard: '4px 4px 0 var(--tw-shadow-color, #14130F)',
        'hard-sm': '2px 2px 0 var(--tw-shadow-color, #14130F)',
      },
      backgroundImage: {
        'graph-paper': `
          linear-gradient(to right, rgba(20,19,15,.06) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(20,19,15,.06) 1px, transparent 1px)
        `,
      },
      backgroundSize: {
        'graph': '24px 24px',
      }
    },
  },
  plugins: [],
};
