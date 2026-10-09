import type { HabitColor } from '@/data/habit-colors';
import type { HabitIconId } from '@/data/habit-icons';
import type { CurrencyCode } from '@/i18n/config';
import type { MessageKey } from '@/i18n';

export type HabitPresetId =
  | 'coffee'
  | 'breakfast'
  | 'lunch'
  | 'delivery'
  | 'snacks'
  | 'rides'
  | 'dinner'
  | 'drinks'
  | 'shopping'
  | 'soda';

export type HabitPreset = {
  /** Stored on the habit as `preset_id`, so an id is never renamed. */
  id: HabitPresetId;
  /** Copied into the habit, in the language on screen, when it is created. */
  name: MessageKey;
  subtitle: MessageKey;
  icon: HabitIconId;
  color: HabitColor;
  /** In dollar-sized units; `presetPrice` puts it in the account's currency. */
  price: number;
  chips: readonly [number, number, number];
};

/** The first six are shown on Pick; the other four sit behind More, commonest first. */
export const HABIT_PRESETS: readonly HabitPreset[] = [
  {
    id: 'coffee',
    name: 'habitFlow.preset.coffee.name',
    subtitle: 'habitFlow.preset.coffee.subtitle',
    icon: 'food-dining/coffee',
    color: 'caramel',
    price: 5,
    chips: [3, 5, 7],
  },
  {
    id: 'breakfast',
    name: 'habitFlow.preset.breakfast.name',
    subtitle: 'habitFlow.preset.breakfast.subtitle',
    icon: 'food-dining/breakfast',
    color: 'coral',
    price: 10,
    chips: [8, 10, 15],
  },
  {
    id: 'lunch',
    name: 'habitFlow.preset.lunch.name',
    subtitle: 'habitFlow.preset.lunch.subtitle',
    icon: 'food-dining/lunch-out',
    color: 'green',
    price: 15,
    chips: [10, 15, 20],
  },
  {
    id: 'delivery',
    name: 'habitFlow.preset.delivery.name',
    subtitle: 'habitFlow.preset.delivery.subtitle',
    icon: 'food-dining/fast-food',
    color: 'blue',
    price: 25,
    chips: [15, 25, 35],
  },
  {
    id: 'snacks',
    name: 'habitFlow.preset.snacks.name',
    subtitle: 'habitFlow.preset.snacks.subtitle',
    icon: 'food-dining/snacks-sweets',
    color: 'pink',
    price: 4,
    chips: [2, 4, 6],
  },
  {
    id: 'rides',
    name: 'habitFlow.preset.rides.name',
    subtitle: 'habitFlow.preset.rides.subtitle',
    icon: 'transport/taxi-rides',
    color: 'violet',
    price: 15,
    chips: [10, 15, 25],
  },
  {
    id: 'dinner',
    name: 'habitFlow.preset.dinner.name',
    subtitle: 'habitFlow.preset.dinner.subtitle',
    icon: 'food-dining/dinner-out',
    color: 'green',
    price: 40,
    chips: [30, 40, 60],
  },
  {
    id: 'drinks',
    name: 'habitFlow.preset.drinks.name',
    subtitle: 'habitFlow.preset.drinks.subtitle',
    icon: 'food-dining/alcohol-nightlife',
    color: 'violet',
    price: 20,
    chips: [10, 20, 30],
  },
  {
    id: 'shopping',
    name: 'habitFlow.preset.shopping.name',
    subtitle: 'habitFlow.preset.shopping.subtitle',
    icon: 'shopping/online-shopping',
    color: 'blue',
    price: 30,
    chips: [20, 30, 50],
  },
  {
    id: 'soda',
    name: 'habitFlow.preset.soda.name',
    subtitle: 'habitFlow.preset.soda.subtitle',
    icon: 'food-dining/soft-drinks',
    color: 'coral',
    price: 3,
    chips: [2, 3, 5],
  },
];

export const PRESETS_SHOWN = 6;

/** Add my own has no price to start from; these are its chips. */
export const OWN_HABIT_CHIPS: readonly [number, number, number] = [5, 10, 20];

/**
 * A coffee is about 5 in dollars, pounds and their cousins, and about 50 in pesos. Whole factors
 * only, so a scaled price is still an exact amount.
 */
const PRICE_SCALE: Record<CurrencyCode, number> = {
  USD: 1,
  GBP: 1,
  CAD: 1,
  AUD: 1,
  MXN: 10,
};

export function presetPrice(preset: Pick<HabitPreset, 'price'>, currency: CurrencyCode): number {
  return preset.price * PRICE_SCALE[currency];
}

export function presetChips(
  chips: readonly [number, number, number],
  currency: CurrencyCode,
): [number, number, number] {
  const scale = PRICE_SCALE[currency];
  return [chips[0] * scale, chips[1] * scale, chips[2] * scale];
}

export function habitPreset(id: string | null | undefined): HabitPreset | undefined {
  return id ? HABIT_PRESETS.find((preset) => preset.id === id) : undefined;
}
