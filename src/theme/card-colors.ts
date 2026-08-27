/** Palette offered when creating a card. Values are what get stored. */
export const CARD_COLORS = [
  { id: 'coral', label: 'Coral', value: '#FA8F6F' },
  { id: 'ink', label: 'Ink', value: '#161616' },
  { id: 'snow', label: 'Snow', value: '#FFFFFF' },
  { id: 'lime', label: 'Lime', value: '#C7E756' },
  { id: 'sky', label: 'Sky', value: '#7BC4F5' },
  { id: 'violet', label: 'Violet', value: '#8B7BF5' },
  { id: 'sand', label: 'Sand', value: '#E9CF9B' },
  { id: 'forest', label: 'Forest', value: '#2E6E5B' },
] as const;

export const DEFAULT_CARD_COLOR = CARD_COLORS[0].value;
