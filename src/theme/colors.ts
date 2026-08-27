/**
 * Raw brand colors, for anywhere a className cannot reach — SVG fills,
 * component props, native config. Mirrors the palette in tailwind.config.js.
 */
export const colors = {
  ink: '#111111',
  body: '#2F2F2F',
  muted: '#6F6F6F',
  accent: '#FA8F6F',
  control: '#3D3D3D',
  line: '#DCDCDC', // hairline borders (inputs, dividers)
  controlPressed: '#2A2A2A',
  surface: '#FFFFFF',
} as const;

export type ColorName = keyof typeof colors;
