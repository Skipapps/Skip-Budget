/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      // React Native cannot synthesize weights from one file, so every weight
      // is its own family. Use these instead of font-bold/font-semibold.
      fontFamily: {
        poppins: ['Poppins_400Regular'],
        'poppins-medium': ['Poppins_500Medium'],
        'poppins-semibold': ['Poppins_600SemiBold'],
        'poppins-bold': ['Poppins_700Bold'],
      },
      // Every colour is a CSS variable so one provider can repaint the whole
      // app at runtime — light or dark, and any of the twelve accents — without
      // a single className changing. The values live in src/theme/palette.ts;
      // src/global.css only seeds the first frame.
      colors: {
        ink: 'rgb(var(--color-ink) / <alpha-value>)', // headings
        body: 'rgb(var(--color-body) / <alpha-value>)', // paragraph copy
        muted: 'rgb(var(--color-muted) / <alpha-value>)', // secondary / captions
        line: 'rgb(var(--color-line) / <alpha-value>)', // hairline borders
        surface: 'rgb(var(--color-surface) / <alpha-value>)', // the page itself
        card: 'rgb(var(--color-card) / <alpha-value>)', // anything raised off it
        // The chosen colour. `accent` fills, `accent-ink` is the same colour
        // pushed until it can be read as type on the page behind it.
        accent: 'rgb(var(--color-accent) / <alpha-value>)',
        'accent-ink': 'rgb(var(--color-accent-ink) / <alpha-value>)',
        'on-control': 'rgb(var(--color-on-control) / <alpha-value>)',
        control: {
          DEFAULT: 'rgb(var(--color-control) / <alpha-value>)', // pill buttons
          pressed: 'rgb(var(--color-control-pressed) / <alpha-value>)',
        },
        money: {
          in: 'rgb(var(--color-money-in) / <alpha-value>)',
          out: 'rgb(var(--color-money-out) / <alpha-value>)',
        },
      },
      // Phone-scale breakpoints. Tailwind's defaults start at 640px, which no
      // phone reaches, so every `sm:` rule would be dead code on a real device.
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
