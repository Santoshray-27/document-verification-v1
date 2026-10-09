/** Agnitia design tokens. Dark navy + gold, glass surfaces, verdict colours. */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#EEF2FF', 100: '#E0E7FF', 200: '#C3CDE8', 300: '#93A3C8',
          400: '#5A6C97', 500: '#243B6B', 600: '#152A55', 700: '#0F2044',
          800: '#0A1834', 900: '#060F22', 950: '#030814',
        },
        gold: { 200: '#F6E7B4', 300: '#EFD98A', 400: '#E3C463', 500: '#D4AF37', 600: '#B8952C', 700: '#8C6F1F' },
        verdict: {
          genuine: '#10B981', copy: '#14B8A6', altered: '#F59E0B', forged: '#EF4444',
          unverifiable: '#8B5CF6', revoked: '#F97316', expired: '#64748B', unable: '#94A3B8',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
        display: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      fontSize: { display: ['3rem', { lineHeight: '1.05', letterSpacing: '-0.02em', fontWeight: '700' }] },
      boxShadow: {
        glass: '0 20px 60px -20px rgba(0,0,0,0.6)',
        card: '0 8px 30px -12px rgba(0,0,0,0.5)',
        glow: '0 0 40px -8px rgba(212,175,55,0.35)',
      },
      backgroundImage: {
        grid: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
      },
      backgroundSize: { grid: '32px 32px' },
      keyframes: {
        shimmer: { '100%': { transform: 'translateX(100%)' } },
        pulseRing: { '0%': { transform: 'scale(0.9)', opacity: '0.7' }, '70%': { transform: 'scale(1.25)', opacity: '0' }, '100%': { opacity: '0' } },
        float: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-6px)' } },
        sweep: { '0%': { transform: 'translateY(-100%)' }, '100%': { transform: 'translateY(400%)' } },
      },
      animation: {
        shimmer: 'shimmer 1.6s infinite',
        pulseRing: 'pulseRing 2s cubic-bezier(0.4,0,0.6,1) infinite',
        float: 'float 5s ease-in-out infinite',
        sweep: 'sweep 2.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
