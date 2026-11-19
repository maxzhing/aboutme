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
        accent: v('accent'),
        accent2: v('accent2'),
        'brand-solid': v('brand-solid'),
        'brand2-solid': v('brand2-solid'),
        dom: v('dom'),
        sec: v('sec'),
        star: v('star'),
      },
      fontFamily: {
        sans: ['"IBM Plex Sans"', 'ui-sans-serif', 'system-ui', '-apple-system', '"Segoe UI"', 'Roboto', 'sans-serif'],
        display: ['"Source Serif 4 Variable"', '"Source Serif 4"', 'Georgia', 'Cambria', 'serif'],
        serif: ['"Source Serif 4 Variable"', '"Source Serif 4"', 'Georgia', 'Cambria', 'serif'],
      },
      /* rounded, soft corners (owner request): 12px for controls and small boxes, 16px for cards, and the pill */
      borderRadius: { none: '0', sm: '8px', DEFAULT: '12px', md: '10px', lg: '12px', xl: '12px', '2xl': '16px', '3xl': '20px', xl2: '16px', full: '9999px' },
      /* three weights: regular, medium, semibold (bold and heavier map to semibold) */
      fontWeight: { normal: '400', medium: '500', semibold: '600', bold: '600', extrabold: '600', black: '600' },
      boxShadow: {
        card: 'none',
        glow: 'none',
        float: '0 1px 2px rgb(var(--shadow) / .10), 0 8px 24px -12px rgb(var(--shadow) / .30)',
      },
      transitionDuration: { DEFAULT: '160ms' },
      transitionTimingFunction: { DEFAULT: 'cubic-bezier(0.2, 0, 0, 1)' },
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
