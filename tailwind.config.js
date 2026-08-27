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
      // Brand palette. Keep these in sync with src/theme/colors.ts, which is the
      // same set of tokens for places that need a raw value (SVG fills, props).
      colors: {
        ink: '#111111', // headings
        body: '#2F2F2F', // paragraph copy
        muted: '#6F6F6F', // secondary / captions
        accent: '#FA8F6F', // coral used throughout the illustrations
        line: '#DCDCDC', // hairline borders (inputs, dividers)
        control: {
          DEFAULT: '#3D3D3D', // dark pill buttons
          pressed: '#2A2A2A',
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
