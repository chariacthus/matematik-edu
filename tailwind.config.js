/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Geist Variable"', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['"Geist Variable"', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['"Geist Mono Variable"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      colors: {
        ink: {
          50: '#f7f8fa',
          100: '#eff1f4',
          200: '#e0e3e8',
          300: '#c3c8d0',
          400: '#9ba2ae',
          500: '#6f7682',
          600: '#4c525d',
          700: '#353a43',
          800: '#262a31',
          850: '#1c1f25',
          900: '#16181d',
          950: '#0f1114',
        },
        brand: {
          50: '#eef4ff',
          100: '#dde8ff',
          200: '#c0d4ff',
          300: '#94b6fb',
          400: '#6795f5',
          500: '#4479ec',
          600: '#3563d6',
          700: '#2c50b3',
          800: '#27438f',
          900: '#243a72',
          950: '#172246',
        },
        /* XP og fremgang: lime. Den ene farve der må lyse. */
        xp: {
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
          900: '#064e3b',
        },
        accent: {
          50: '#ecfeff',
          100: '#cffafe',
          200: '#a5f3fc',
          300: '#67e8f9',
          400: '#22d3ee',
          500: '#06b6d4',
          600: '#0891b2',
          700: '#0e7490',
          900: '#164e63',
        },
        good: {
          100: '#d1fae5', 200: '#a7f3d0', 300: '#6ee7b7', 400: '#34d399',
          500: '#10b981', 600: '#059669', 700: '#047857', 900: '#064e3b',
        },
        warn: {
          100: '#fef3c7', 200: '#fde68a', 300: '#fcd34d', 400: '#fbbf24',
          500: '#f59e0b', 600: '#d97706', 700: '#b45309', 900: '#78350f',
        },
        bad: {
          100: '#ffe4e6', 200: '#fecdd3', 300: '#fda4af', 400: '#fb7185',
          500: '#f43f5e', 600: '#e11d48', 700: '#be123c', 900: '#881337',
        },
      },
      boxShadow: {
        card: '0 1px 2px rgba(0,0,0,0.20), 0 8px 24px -12px rgba(0,0,0,0.45)',
        lift: '0 2px 6px rgba(0,0,0,0.30), 0 20px 48px -20px rgba(0,0,0,0.60)',
        glow: '0 1px 2px rgba(0,0,0,0.20), 0 10px 28px -14px rgba(0,0,0,0.55)',
        'glow-xp': '0 0 0 1px rgba(16,185,129,0.35), 0 10px 28px -14px rgba(0,0,0,0.55)',
        inset: 'inset 0 1px 1px rgba(255,255,255,0.3)',
      },
      borderRadius: { xl: '0.75rem', '2xl': '1rem', '3xl': '1.375rem' },
      backdropBlur: { xs: '2px' },
      keyframes: {
        /* Fluebenet tegner sig selv - kvitteringen for et rigtigt svar. */
        'tick-draw': { from: { strokeDashoffset: '26' }, to: { strokeDashoffset: '0' } },
        /* Vinkelbuen svinges op, så man ser vinklen blive målt. */
        'arc-draw': { from: { strokeDashoffset: 'var(--arc-len)' }, to: { strokeDashoffset: '0' } },
        'rise-in': { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        'swap-in': {
          from: { opacity: '0', transform: 'translateY(10px) scale(.985)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        nudge: { '0%,100%': { transform: 'translateX(0)' }, '35%': { transform: 'translateX(3px)' }, '70%': { transform: 'translateX(-2px)' } },
        'bar-grow': { from: { transform: 'scaleX(0)' }, to: { transform: 'scaleX(1)' } },
        'combo-beat': { '0%,100%': { transform: 'scale(1)' }, '40%': { transform: 'scale(1.18)' } },
        'tab-slide': { from: { opacity: '0', transform: 'scaleX(.4)' }, to: { opacity: '1', transform: 'scaleX(1)' } },
        'streak-lift': { from: { transform: 'translateY(4px) scale(.8)', opacity: '0' }, to: { transform: 'translateY(0) scale(1)', opacity: '1' } },
        'ring-fill': { from: { strokeDashoffset: 'var(--ring-len)' }, to: { strokeDashoffset: 'var(--ring-off)' } },

        /* Niveauskift: ringen sprænger udad og forsvinder. */
        'level-burst': {
          '0%': { transform: 'scale(0.6)', opacity: '0.9' },
          '70%': { transform: 'scale(2.1)', opacity: '0.12' },
          '100%': { transform: 'scale(2.6)', opacity: '0' },
        },
        'level-pop': {
          '0%': { transform: 'scale(1)' },
          '30%': { transform: 'scale(1.35) rotate(-8deg)' },
          '60%': { transform: 'scale(0.94) rotate(4deg)' },
          '100%': { transform: 'scale(1) rotate(0)' },
        },
        /* Grønt pulsslag ved rigtigt svar. */
        'pulse-correct': {
          '0%': { boxShadow: '0 0 0 0 rgba(16,185,129,0.40)', borderColor: 'rgb(16,185,129)' },
          '65%': { boxShadow: '0 0 0 14px rgba(16,185,129,0)', borderColor: 'rgb(16,185,129)' },
          '100%': { boxShadow: '0 0 0 0 rgba(16,185,129,0)' },
        },
        /* Flammen der trækker vejret på dagens felt. */
        'flame-glow': {
          '0%,100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.06)' },
        },
        /* Tre prikker der skriver. */
        'typing-dot': {
          '0%,60%,100%': { transform: 'translateY(0)', opacity: '0.35' },
          '30%': { transform: 'translateY(-4px)', opacity: '1' },
        },
        /* Lysstribe der vandrer hen over XP-bjælken. */
        sheen: {
          '0%': { transform: 'translateX(-120%) skewX(-18deg)' },
          '100%': { transform: 'translateX(320%) skewX(-18deg)' },
        },
        'panel-in': {
          from: { opacity: '0', transform: 'translateY(16px) scale(0.97)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        drift: {
          '0%,100%': { transform: 'translate3d(0,0,0) scale(1)' },
          '50%': { transform: 'translate3d(3%, -4%, 0) scale(1.08)' },
        },
        'fade-up': { from: { opacity: '0', transform: 'translateY(10px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        /* Fjedrende indtoning — det der giver "spil" frem for "formular". */
        pop: {
          '0%': { transform: 'scale(0.82)', opacity: '0' },
          '55%': { transform: 'scale(1.06)', opacity: '1' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        shake: {
          '0%,100%': { transform: 'translateX(0)' },
          '18%': { transform: 'translateX(-7px)' },
          '38%': { transform: 'translateX(7px)' },
          '58%': { transform: 'translateX(-4px)' },
          '78%': { transform: 'translateX(4px)' },
        },
        /* XP der flyver op mod bjælken. */
        'xp-rise': {
          '0%': { opacity: '0', transform: 'translateY(6px) scale(0.9)' },
          '20%': { opacity: '1', transform: 'translateY(0) scale(1.08)' },
          '75%': { opacity: '1', transform: 'translateY(-26px) scale(1)' },
          '100%': { opacity: '0', transform: 'translateY(-44px) scale(0.95)' },
        },
        /* Pulserende ring om det aktive element. */
        halo: {
          '0%': { boxShadow: '0 0 0 0 rgba(68,121,236,0.35)' },
          '70%': { boxShadow: '0 0 0 12px rgba(68,121,236,0)' },
          '100%': { boxShadow: '0 0 0 0 rgba(68,121,236,0)' },
        },
        shimmer: { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
        'slide-in': { from: { opacity: '0', transform: 'translateX(14px)' }, to: { opacity: '1', transform: 'translateX(0)' } },
        'count-up': { from: { transform: 'translateY(60%)', opacity: '0' }, to: { transform: 'translateY(0)', opacity: '1' } },
      },
      animation: {
        'tick-draw': 'tick-draw .5s cubic-bezier(.16,1,.3,1) forwards',
        'arc-draw': 'arc-draw .8s cubic-bezier(.16,1,.3,1) forwards',
        'rise-in': 'rise-in .42s cubic-bezier(.16,1,.3,1) both',
        'swap-in': 'swap-in .34s cubic-bezier(.16,1.1,.3,1) both',
        'nudge': 'nudge .5s cubic-bezier(.16,1,.3,1)',
        'bar-grow': 'bar-grow .6s cubic-bezier(.16,1,.3,1) both',
        'combo-beat': 'combo-beat .45s cubic-bezier(.16,1.3,.4,1)',
        'tab-slide': 'tab-slide .3s cubic-bezier(.16,1,.3,1) both',
        'streak-lift': 'streak-lift .5s cubic-bezier(.16,1.2,.3,1) both',
        'ring-fill': 'ring-fill 1s cubic-bezier(.16,1,.3,1) forwards',

        'level-burst': 'level-burst .9s cubic-bezier(.16,1,.3,1) forwards',
        'level-pop': 'level-pop .7s cubic-bezier(.16,1.2,.3,1) both',
        'pulse-correct': 'pulse-correct 1s cubic-bezier(.16,1,.3,1)',
        'flame-glow': 'flame-glow 2.2s ease-in-out infinite',
        'typing-dot': 'typing-dot 1.2s ease-in-out infinite',
        sheen: 'sheen 2.6s cubic-bezier(.4,0,.2,1) infinite',
        'panel-in': 'panel-in .34s cubic-bezier(.16,1.05,.3,1) both',
        drift: 'drift 26s ease-in-out infinite',
        'fade-up': 'fade-up .38s cubic-bezier(.16,1,.3,1) both',
        'fade-in': 'fade-in .28s ease both',
        pop: 'pop .42s cubic-bezier(.16,1.3,.4,1) both',
        shake: 'shake .42s ease',
        'xp-rise': 'xp-rise 1.1s ease-out forwards',
        halo: 'halo 1.8s cubic-bezier(.16,1,.3,1) infinite',
        shimmer: 'shimmer 2.2s linear infinite',
        'slide-in': 'slide-in .32s cubic-bezier(.16,1,.3,1) both',
        'count-up': 'count-up .32s cubic-bezier(.16,1,.3,1) both',
      },
      transitionTimingFunction: { spring: 'cubic-bezier(.16,1.1,.3,1)' },
    },
  },
  plugins: [],
};
