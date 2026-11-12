import type { Config } from 'tailwindcss';

const v = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: v('bg'),
        surface: v('surface'),
        raised: v('raised'),
        line: v('line'),
        ink: v('ink'),
        muted: v('muted'),
        faint: v('faint'),
        brand: v('brand'),
        brand2: v('brand2'),
        ok: v('ok'),
        warn: v('warn'),
        bad: v('bad'),
        gold: v('gold'),
      },
      fontFamily: {
        sans: ['"Inter Variable"', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Sora Variable"', 'Sora', '"Inter Variable"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        serif: ['Georgia', 'Cambria', '"Times New Roman"', 'serif'],
      },
      borderRadius: { xl2: '1.25rem' },
      boxShadow: {
        card: '0 1px 2px rgb(var(--shadow) / 0.06), 0 8px 24px -12px rgb(var(--shadow) / 0.18)',
        glow: '0 0 0 1px rgb(var(--brand) / 0.25), 0 8px 30px -8px rgb(var(--brand) / 0.45)',
      },
      keyframes: {
        floaty: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-6px)' } },
        blink: { '0%,92%,100%': { transform: 'scaleY(1)' }, '96%': { transform: 'scaleY(0.1)' } },
        twinkle: { '0%,100%': { opacity: '0.35' }, '50%': { opacity: '1' } },
        zzz: { '0%': { opacity: '0', transform: 'translate(0,0) scale(.6)' }, '30%': { opacity: '1' }, '100%': { opacity: '0', transform: 'translate(14px,-26px) scale(1.1)' } },
        shimmer: { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
      },
      animation: {
        floaty: 'floaty 3.6s ease-in-out infinite',
        blink: 'blink 4.5s infinite',
        twinkle: 'twinkle 2.4s ease-in-out infinite',
        zzz: 'zzz 2.8s ease-out infinite',
        shimmer: 'shimmer 2.2s linear infinite',
      },
    },
  },
  plugins: [],
};
export default config;
