/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      // React Native cannot synthesize weights from one file, so every weight is its own family.
      // Use these instead of font-bold/font-semibold. The names are the faces src/theme/fonts.ts
      // loads; the tokens say nothing about the typeface, so changing it touches only those two.
      fontFamily: {
        app: ['Montserrat_400Regular'],
        'app-medium': ['Montserrat_500Medium'],
        'app-semibold': ['Montserrat_600SemiBold'],
        'app-bold': ['Montserrat_700Bold'],
      },
      // Every colour is a CSS variable so one provider can repaint the app at runtime (light/dark)
      // without a className changing. Values live in src/theme/palette.ts; src/global.css only
      // seeds the first frame.
      colors: {
        ink: 'rgb(var(--color-ink) / <alpha-value>)',
        body: 'rgb(var(--color-body) / <alpha-value>)',
        muted: 'rgb(var(--color-muted) / <alpha-value>)',
        line: 'rgb(var(--color-line) / <alpha-value>)',
        surface: 'rgb(var(--color-surface) / <alpha-value>)',
        card: 'rgb(var(--color-card) / <alpha-value>)',
        // `accent` fills; `accent-ink` is the accent adjusted until it reads as type on the page.
        accent: 'rgb(var(--color-accent) / <alpha-value>)',
        'accent-ink': 'rgb(var(--color-accent-ink) / <alpha-value>)',
        'on-control': 'rgb(var(--color-on-control) / <alpha-value>)',
        control: {
          DEFAULT: 'rgb(var(--color-control) / <alpha-value>)',
          pressed: 'rgb(var(--color-control-pressed) / <alpha-value>)',
        },
        money: {
          in: 'rgb(var(--color-money-in) / <alpha-value>)',
          out: 'rgb(var(--color-money-out) / <alpha-value>)',
        },
        // Destructive actions only.
        danger: 'rgb(var(--color-danger) / <alpha-value>)',
      },
      // Phone-scale breakpoints: Tailwind's defaults start at 640px, which no phone reaches.
      screens: {
        compact: '360px',
        phone: '390px',
        wide: '430px',
        tablet: '768px',
      },
    },
  },
  plugins: [],
};
