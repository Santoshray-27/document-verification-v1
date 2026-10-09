/** Agnitia design tokens. Based on shadcn preset 'bKsEuMcK' (luma, stone, amber, large) */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Semantic shadcn preset tokens with full alpha support
        background: 'rgb(var(--background) / <alpha-value>)',
        foreground: 'rgb(var(--foreground) / <alpha-value>)',
        card: {
          DEFAULT: 'rgb(var(--card) / <alpha-value>)',
          foreground: 'rgb(var(--card-foreground) / <alpha-value>)',
        },
        popover: {
          DEFAULT: 'rgb(var(--popover) / <alpha-value>)',
          foreground: 'rgb(var(--popover-foreground) / <alpha-value>)',
        },
        primary: {
          DEFAULT: 'rgb(var(--primary) / <alpha-value>)',
          foreground: 'rgb(var(--primary-foreground) / <alpha-value>)',
        },
        secondary: {
          DEFAULT: 'rgb(var(--secondary) / <alpha-value>)',
          foreground: 'rgb(var(--secondary-foreground) / <alpha-value>)',
        },
        muted: {
          DEFAULT: 'rgb(var(--muted) / <alpha-value>)',
          foreground: 'rgb(var(--muted-foreground) / <alpha-value>)',
        },
        accent: {
          DEFAULT: 'rgb(var(--accent) / <alpha-value>)',
          foreground: 'rgb(var(--accent-foreground) / <alpha-value>)',
        },
        destructive: {
          DEFAULT: 'rgb(var(--destructive) / <alpha-value>)',
          foreground: 'rgb(var(--destructive-foreground) / <alpha-value>)',
        },
        border: 'rgb(var(--border) / <alpha-value>)',
        input: 'rgb(var(--input) / <alpha-value>)',
        ring: 'rgb(var(--ring) / <alpha-value>)',
        chart: {
          1: 'rgb(var(--chart-1) / <alpha-value>)',
          2: 'rgb(var(--chart-2) / <alpha-value>)',
          3: 'rgb(var(--chart-3) / <alpha-value>)',
          4: 'rgb(var(--chart-4) / <alpha-value>)',
          5: 'rgb(var(--chart-5) / <alpha-value>)',
        },
        // Existing tokens maintained for non-breaking backward compatibility
        navy: {
          50: '#EEF2FF', 100: '#E0E7FF', 200: '#C3CDE8', 300: '#93A3C8',
          400: '#5A6C97', 500: '#243B6B', 600: '#152A55', 700: '#0F2044',
          800: '#0A1834', 900: '#060F22', 950: '#030814',
        },
        gold: { 200: '#F6E7B4', 300: '#EFD98A', 400: '#E3C463', 500: '#D4AF37', 600: '#B8952C', 700: '#8C6F1F' },
        verdict: {
          genuine: '#10B981', copy: '#14B8A6', altered: '#EA580C', forged: '#EF4444',
          unverifiable: '#8B5CF6', revoked: '#7C3AED', expired: '#64748B', unable: '#94A3B8',
        },
        landing: {
          violet:     '#4B0FC4',
          'violet-2': '#5B14F0',
          periwinkle: '#6E86E8',
          yellow:     '#FFD83D',
          pink:       '#F0568F',
          orange:     '#FF7A2F',
          ink:        '#0A0A0A',
        },
      },
      borderRadius: {
        sm: 'calc(var(--radius) - 6px)',
        DEFAULT: 'calc(var(--radius) - 4px)',
        md: 'calc(var(--radius) - 2px)',
        lg: 'var(--radius)',
        xl: 'calc(var(--radius) + 2px)',
        '2xl': 'calc(var(--radius) + 6px)',
        '3xl': 'calc(var(--radius) + 12px)',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
        landing: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        display: ['3rem', { lineHeight: '1.05', letterSpacing: '-0.02em', fontWeight: '700' }],
      },
      boxShadow: {
        glass: '0 20px 60px -20px rgba(0,0,0,0.6)',
        card: '0 1px 3px 0 rgba(0,0,0,0.06), 0 1px 2px -1px rgba(0,0,0,0.06)',
        'card-hover': '0 10px 25px -5px rgba(0,0,0,0.08), 0 8px 10px -6px rgba(0,0,0,0.08)',
        glow: '0 0 35px -8px rgba(245,158,11,0.3)',
      },
      keyframes: {
        shimmer: { '100%': { transform: 'translateX(100%)' } },
        pulseRing: { '0%': { transform: 'scale(0.9)', opacity: '0.7' }, '70%': { transform: 'scale(1.25)', opacity: '0' }, '100%': { opacity: '0' } },
        float: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-6px)' } },
      },
      animation: {
        shimmer: 'shimmer 1.6s infinite',
        pulseRing: 'pulseRing 2s cubic-bezier(0.4,0,0.6,1) infinite',
        float: 'float 5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
