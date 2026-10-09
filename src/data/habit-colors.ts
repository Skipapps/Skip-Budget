/** The six colours a habit card can wear. Stored by id, so the values can be tuned later. */
export type HabitColor = 'caramel' | 'coral' | 'green' | 'blue' | 'violet' | 'pink';

export type HabitColorDef = {
  id: HabitColor;
  /**
   * The filled day circle, the today ring and the swatch, in both modes. White checks sit on it at
   * 3:1 or better, so it also clears 3:1 against either card.
   */
  fill: string;
  /** The soft circle behind the habit's icon. */
  tint: { light: string; dark: string };
  /** The coloured sub-line ("3 days skipped"): 4.6:1 or better on each mode's card. */
  ink: { light: string; dark: string };
};

export const HABIT_COLORS: HabitColorDef[] = [
  {
    id: 'caramel',
    fill: '#C38449',
    tint: { light: '#F4E8DC', dark: '#4D341E' },
    ink: { light: '#A4672A', dark: '#C38449' },
  },
  {
    id: 'coral',
    fill: '#E66E51',
    tint: { light: '#FDE9E3', dark: '#513129' },
    ink: { light: '#C44F33', dark: '#E66E51' },
  },
  {
    id: 'green',
    fill: '#2FA573',
    tint: { light: '#E2F4EA', dark: '#214332' },
    ink: { light: '#008656', dark: '#2FA573' },
  },
  {
    id: 'blue',
    fill: '#4C7CF3',
    tint: { light: '#E4ECFD', dark: '#2E3A55' },
    ink: { light: '#3F6DE3', dark: '#678EE7' },
  },
  {
    id: 'violet',
    fill: '#8B6CE6',
    tint: { light: '#EDE8FC', dark: '#3B3653' },
    ink: { light: '#7F5FD8', dark: '#9782E2' },
  },
  {
    id: 'pink',
    fill: '#E2679B',
    tint: { light: '#FBE6EF', dark: '#4F2F3B' },
    ink: { light: '#C1497F', dark: '#E2679B' },
  },
];

export const DEFAULT_HABIT_COLOR: HabitColor = 'caramel';

export function habitColor(id: string | null | undefined): HabitColorDef {
  return HABIT_COLORS.find((color) => color.id === id) ?? HABIT_COLORS[0];
}
