/**
 * The monogram tiles' colours (src/lib/monogram.ts), mirrored in order by the push server
 * (supabase/functions/send-push/card.ts): a change here recolours every monogram and must ship
 * with the server's copy. Cards made before FACE_COLORS keep these as their face colours.
 */
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

/**
 * Offered for a card's or account's face. Values are what get stored. Those with white type clear
 * 4.5:1 for the face's 90% white captions too, so blue, teal and violet sit a shade under the
 * designs' #4F7DBA, #3F8A86 and #6A5FC9.
 */
export const FACE_COLORS = [
  { id: 'blue', value: '#426EA8' },
  { id: 'violet', value: '#695EC9' },
  { id: 'plum', value: '#905479' },
  { id: 'teal', value: '#367672' },
  { id: 'slate', value: '#5B6573' },
  { id: 'sand', value: '#C9A979' },
  { id: 'rose', value: '#C9787E' },
  { id: 'black', value: '#1E1A22' },
] as const;

export const DEFAULT_CARD_COLOR = FACE_COLORS[0].value;
