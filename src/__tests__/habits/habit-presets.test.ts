import { HABIT_COLORS } from '@/data/habit-colors';
import { habitIcon } from '@/data/habit-icons';
import {
  HABIT_PRESETS,
  OWN_HABIT_CHIPS,
  PRESETS_SHOWN,
  habitPreset,
  presetChips,
  presetPrice,
} from '@/data/habit-presets';
import { CURRENCIES } from '@/i18n/config';
import { MESSAGES } from '@/i18n/messages';

// Jest has no SVG transformer; the registry only needs each drawing to be something.
jest.mock('@/data/habit-icon-art', () => ({
  HABIT_ICON_ART: new Proxy({}, { get: () => () => null }),
}));

/**
 * The ten ready-made habits: what Pick shows first, what More adds, and what each starts at in
 * every currency. Spec section 10, with the CEO's peso call (prices and chips x10).
 */

describe('habit presets', () => {
  it('are the ten of the spec, the first six shown and the commonest four behind More', () => {
    expect(HABIT_PRESETS.map((preset) => preset.id)).toEqual([
      'coffee',
      'breakfast',
      'lunch',
      'delivery',
      'snacks',
      'rides',
      'dinner',
      'drinks',
      'shopping',
      'soda',
    ]);
    expect(PRESETS_SHOWN).toBe(6);
    expect(new Set(HABIT_PRESETS.map((preset) => preset.id)).size).toBe(10);
  });

  it('pin each icon, colour, price and its three chips', () => {
    expect(
      HABIT_PRESETS.map(({ id, icon, color, price, chips }) => [id, icon, color, price, chips]),
    ).toEqual([
      ['coffee', 'food-dining/coffee', 'caramel', 5, [3, 5, 7]],
      ['breakfast', 'food-dining/breakfast', 'coral', 10, [8, 10, 15]],
      ['lunch', 'food-dining/lunch-out', 'green', 15, [10, 15, 20]],
      ['delivery', 'food-dining/fast-food', 'blue', 25, [15, 25, 35]],
      ['snacks', 'food-dining/snacks-sweets', 'pink', 4, [2, 4, 6]],
      ['rides', 'transport/taxi-rides', 'violet', 15, [10, 15, 25]],
      ['dinner', 'food-dining/dinner-out', 'green', 40, [30, 40, 60]],
      ['drinks', 'food-dining/alcohol-nightlife', 'violet', 20, [10, 20, 30]],
      ['shopping', 'shopping/online-shopping', 'blue', 30, [20, 30, 50]],
      ['soda', 'food-dining/soft-drinks', 'coral', 3, [2, 3, 5]],
    ]);
    expect(OWN_HABIT_CHIPS).toEqual([5, 10, 20]);
  });

  it('use icons the registry has and colours a habit can wear', () => {
    const colours = HABIT_COLORS.map((color) => color.id);
    for (const preset of HABIT_PRESETS) {
      expect({ id: preset.id, icon: habitIcon(preset.icon)?.id }).toEqual({
        id: preset.id,
        icon: preset.icon,
      });
      expect(colours).toContain(preset.color);
    }
  });

  it('offer the price among their own chips', () => {
    for (const preset of HABIT_PRESETS) expect(preset.chips).toContain(preset.price);
  });

  it('have a name and a subtitle in every language', () => {
    for (const preset of HABIT_PRESETS) {
      for (const key of [preset.name, preset.subtitle]) {
        const message = MESSAGES[key];
        expect(key).toMatch(new RegExp(`^habitFlow\\.preset\\.${preset.id}\\.`));
        for (const language of ['en', 'es', 'fr'] as const) {
          expect(typeof message[language] === 'string' && message[language].trim()).toBeTruthy();
        }
      }
    }
  });

  it('cost ten times as much in pesos, prices and chips alike, and the same elsewhere', () => {
    const coffee = habitPreset('coffee')!;
    expect(presetPrice(coffee, 'MXN')).toBe(50);
    expect(presetChips(coffee.chips, 'MXN')).toEqual([30, 50, 70]);
    expect(presetChips(OWN_HABIT_CHIPS, 'MXN')).toEqual([50, 100, 200]);

    for (const currency of CURRENCIES) {
      for (const preset of HABIT_PRESETS) {
        const scale = currency === 'MXN' ? 10 : 1;
        expect(presetPrice(preset, currency)).toBe(preset.price * scale);
        expect(presetChips(preset.chips, currency)).toEqual(
          preset.chips.map((chip) => chip * scale),
        );
      }
    }
  });

  it('look up by stored id, and know nothing of an id they never had', () => {
    expect(habitPreset('soda')?.icon).toBe('food-dining/soft-drinks');
    expect(habitPreset('bubble-tea')).toBeUndefined();
    expect(habitPreset(null)).toBeUndefined();
  });
});
