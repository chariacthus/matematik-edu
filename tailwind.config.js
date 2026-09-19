/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      colors: {
        /* Flader: næsten sort i mørkt tema, køligt hvidt i lyst. */
        ink: {
          50: '#f7f8fa',
          100: '#eef0f4',
          200: '#dde1e9',
          300: '#b9c0ce',
          400: '#8b93a5',
          500: '#646c80',
          600: '#4a5265',
          700: '#343b4c',
          800: '#202634',
          850: '#171c27',
          900: '#11151e',
          950: '#0a0d14',
        },
        /* Primær: elektrisk indigo. Bruges sparsomt og altid til handling. */
        brand: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
          950: '#1e1b4b',
        },
        /* XP og fremgang: lime. Den ene farve der må lyse. */
        xp: {
          100: '#ecfccb',
          200: '#d9f99d',
          300: '#bef264',
          400: '#a3e635',
          500: '#84cc16',
          600: '#65a30d',
          700: '#4d7c0f',
          900: '#365314',
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
          100: '#dcfce7', 200: '#bbf7d0', 300: '#86efac', 400: '#4ade80',
          500: '#22c55e', 600: '#16a34a', 700: '#15803d', 900: '#14532d',
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
        card: '0 1px 2px rgba(10,13,20,0.04), 0 4px 16px -8px rgba(10,13,20,0.12)',
        lift: '0 2px 4px rgba(10,13,20,0.06), 0 16px 32px -16px rgba(10,13,20,0.30)',
        /* Glød til aktive spil-elementer. */
        glow: '0 0 0 1px rgba(99,102,241,0.35), 0 8px 32px -8px rgba(99,102,241,0.45)',
        'glow-xp': '0 0 0 1px rgba(132,204,22,0.35), 0 8px 32px -8px rgba(132,204,22,0.45)',
        inset: 'inset 0 1px 0 rgba(255,255,255,0.06)',
      },
      borderRadius: { xl: '0.75rem', '2xl': '1rem', '3xl': '1.375rem' },
      backdropBlur: { xs: '2px' },
      keyframes: {
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
          '0%': { boxShadow: '0 0 0 0 rgba(132,204,22,0.55)', borderColor: 'rgb(132,204,22)' },
          '65%': { boxShadow: '0 0 0 18px rgba(132,204,22,0)', borderColor: 'rgb(132,204,22)' },
          '100%': { boxShadow: '0 0 0 0 rgba(132,204,22,0)' },
        },
        /* Flammen der trækker vejret på dagens felt. */
        'flame-glow': {
          '0%,100%': { filter: 'drop-shadow(0 0 3px rgba(251,146,60,0.75))', transform: 'scale(1)' },
          '50%': { filter: 'drop-shadow(0 0 9px rgba(251,146,60,0.95))', transform: 'scale(1.09)' },
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
          '0%': { boxShadow: '0 0 0 0 rgba(99,102,241,0.45)' },
          '70%': { boxShadow: '0 0 0 14px rgba(99,102,241,0)' },
          '100%': { boxShadow: '0 0 0 0 rgba(99,102,241,0)' },
        },
        shimmer: { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
        'slide-in': { from: { opacity: '0', transform: 'translateX(14px)' }, to: { opacity: '1', transform: 'translateX(0)' } },
        'count-up': { from: { transform: 'translateY(60%)', opacity: '0' }, to: { transform: 'translateY(0)', opacity: '1' } },
      },
      animation: {
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
