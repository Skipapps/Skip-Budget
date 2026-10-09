import type { FC } from 'react';
import type { SvgProps } from 'react-native-svg';

import { HABIT_ICON_ART, type HabitIconId } from '@/data/habit-icon-art';
import type { MessageKey } from '@/i18n';

export type { HabitIconId } from '@/data/habit-icon-art';

export type HabitIconCategoryId =
  | 'food-dining'
  | 'transport'
  | 'shopping'
  | 'entertainment'
  | 'health'
  | 'fitness'
  | 'wellness'
  | 'home-bills'
  | 'family-pets'
  | 'relationships'
  | 'learning-growth'
  | 'finance'
  | 'goals';

export type HabitIconDef = {
  /** `<category-id>/<name>`. Stored on the habit, so an id is never renamed. */
  id: HabitIconId;
  label: MessageKey;
  Svg: FC<SvgProps>;
  /** The spend_categories id a tapped day's receipt is filed under. */
  spendCategory: string;
};

export type HabitIconCategory = {
  id: HabitIconCategoryId;
  label: MessageKey;
  /** The group's soft background in the icon picker. */
  tint: { light: string; dark: string };
  icons: HabitIconDef[];
};

/** An icon's id and name, and its spend category when it differs from its group's. */
type Entry = readonly [id: HabitIconId, label: MessageKey, spendCategory?: string];

type Group = Omit<HabitIconCategory, 'icons'> & { spendCategory: string; icons: Entry[] };

/*
 * Spending first, in the order people reach for them: the presets' groups, then other day-to-day
 * spending, the household, and last the goals, which are rarely a daily purchase.
 */
const GROUPS: Group[] = [
  {
    id: 'food-dining',
    label: 'habits.category.foodDining',
    tint: { light: '#FFEBDC', dark: '#3F2A1B' },
    spendCategory: 'dining',
    icons: [
      ['food-dining/alcohol-nightlife', 'habits.icon.foodDining.alcoholNightlife'],
      ['food-dining/breakfast', 'habits.icon.foodDining.breakfast'],
      ['food-dining/coffee', 'habits.icon.foodDining.coffee'],
      ['food-dining/dinner-out', 'habits.icon.foodDining.dinnerOut'],
      ['food-dining/fast-food', 'habits.icon.foodDining.fastFood'],
      ['food-dining/groceries', 'habits.icon.foodDining.groceries', 'groceries'],
      ['food-dining/lunch-out', 'habits.icon.foodDining.lunchOut'],
      ['food-dining/restaurant', 'habits.icon.foodDining.restaurant'],
      ['food-dining/snacks-sweets', 'habits.icon.foodDining.snacksSweets'],
      ['food-dining/soft-drinks', 'habits.icon.foodDining.softDrinks'],
    ],
  },
  {
    id: 'transport',
    label: 'habits.category.transport',
    tint: { light: '#DAF6FF', dark: '#15343E' },
    spendCategory: 'transport',
    icons: [
      ['transport/bike', 'habits.icon.transport.bike'],
      ['transport/bus', 'habits.icon.transport.bus'],
      ['transport/car', 'habits.icon.transport.car'],
      ['transport/flights', 'habits.icon.transport.flights'],
      ['transport/parking', 'habits.icon.transport.parking'],
      ['transport/taxi-rides', 'habits.icon.transport.taxiRides'],
      ['transport/train', 'habits.icon.transport.train'],
    ],
  },
  {
    id: 'shopping',
    label: 'habits.category.shopping',
    tint: { light: '#FEE9FA', dark: '#3B2838' },
    spendCategory: 'shopping',
    icons: [
      ['shopping/accessories', 'habits.icon.shopping.accessories', 'clothing'],
      ['shopping/clothes', 'habits.icon.shopping.clothes', 'clothing'],
      ['shopping/gifts', 'habits.icon.shopping.gifts'],
      ['shopping/hair-care', 'habits.icon.shopping.hairCare', 'beauty'],
      ['shopping/jewelry', 'habits.icon.shopping.jewelry', 'clothing'],
      ['shopping/online-shopping', 'habits.icon.shopping.onlineShopping'],
      ['shopping/personal-care', 'habits.icon.shopping.personalCare', 'beauty'],
      ['shopping/shoes', 'habits.icon.shopping.shoes', 'clothing'],
    ],
  },
  {
    id: 'entertainment',
    label: 'habits.category.entertainment',
    tint: { light: '#FBEFD9', dark: '#392D16' },
    spendCategory: 'entertainment',
    icons: [
      ['entertainment/books', 'habits.icon.entertainment.books', 'news'],
      ['entertainment/concerts', 'habits.icon.entertainment.concerts'],
      ['entertainment/fun-outings', 'habits.icon.entertainment.funOutings'],
      ['entertainment/games', 'habits.icon.entertainment.games'],
      ['entertainment/movies-streaming', 'habits.icon.entertainment.moviesStreaming'],
      ['entertainment/music', 'habits.icon.entertainment.music'],
      ['entertainment/parties', 'habits.icon.entertainment.parties'],
    ],
  },
  {
    id: 'health',
    label: 'habits.category.health',
    tint: { light: '#D9F7F6', dark: '#123535' },
    spendCategory: 'pharmacy',
    icons: [
      ['health/dental', 'habits.icon.health.dental'],
      ['health/doctor-visit', 'habits.icon.health.doctorVisit'],
      ['health/eye-care', 'habits.icon.health.eyeCare'],
      ['health/first-aid', 'habits.icon.health.firstAid'],
      ['health/gym-membership', 'habits.icon.health.gymMembership', 'fitness'],
      ['health/health-insurance', 'habits.icon.health.healthInsurance', 'insurance'],
      ['health/hospital', 'habits.icon.health.hospital'],
      ['health/medicine', 'habits.icon.health.medicine'],
    ],
  },
  {
    id: 'fitness',
    label: 'habits.category.fitness',
    tint: { light: '#EAEFFF', dark: '#2A2D43' },
    spendCategory: 'fitness',
    icons: [
      ['fitness/cycling', 'habits.icon.fitness.cycling'],
      ['fitness/running', 'habits.icon.fitness.running'],
      ['fitness/swimming', 'habits.icon.fitness.swimming'],
      ['fitness/track-weight', 'habits.icon.fitness.trackWeight'],
      ['fitness/workout', 'habits.icon.fitness.workout'],
    ],
  },
  {
    id: 'wellness',
    label: 'habits.category.wellness',
    tint: { light: '#E6F6E1', dark: '#253420' },
    spendCategory: 'fitness',
    icons: [
      ['wellness/brush-teeth', 'habits.icon.wellness.brushTeeth'],
      ['wellness/drink-water', 'habits.icon.wellness.drinkWater'],
      ['wellness/eat-healthy', 'habits.icon.wellness.eatHealthy'],
      ['wellness/meditate', 'habits.icon.wellness.meditate'],
      ['wellness/pray', 'habits.icon.wellness.pray'],
      ['wellness/quit-smoking', 'habits.icon.wellness.quitSmoking'],
      ['wellness/sleep-early', 'habits.icon.wellness.sleepEarly'],
      ['wellness/take-vitamins', 'habits.icon.wellness.takeVitamins'],
      ['wellness/wake-up-early', 'habits.icon.wellness.wakeUpEarly'],
    ],
  },
  {
    id: 'home-bills',
    label: 'habits.category.homeBills',
    tint: { light: '#E0F3FF', dark: '#1F3142' },
    spendCategory: 'home',
    icons: [
      ['home-bills/cleaning', 'habits.icon.homeBills.cleaning'],
      ['home-bills/electricity', 'habits.icon.homeBills.electricity', 'utilities'],
      ['home-bills/furniture', 'habits.icon.homeBills.furniture'],
      ['home-bills/home-repairs', 'habits.icon.homeBills.homeRepairs'],
      ['home-bills/internet', 'habits.icon.homeBills.internet', 'telecom'],
      ['home-bills/laundry', 'habits.icon.homeBills.laundry'],
      ['home-bills/mortgage', 'habits.icon.homeBills.mortgage'],
      ['home-bills/phone-bill', 'habits.icon.homeBills.phoneBill', 'telecom'],
      ['home-bills/rent', 'habits.icon.homeBills.rent'],
      ['home-bills/water-bill', 'habits.icon.homeBills.waterBill', 'utilities'],
    ],
  },
  {
    id: 'family-pets',
    label: 'habits.category.familyPets',
    tint: { light: '#FFE9E4', dark: '#412724' },
    spendCategory: 'other',
    icons: [
      ['family-pets/baby-kids', 'habits.icon.familyPets.babyKids'],
      ['family-pets/childcare', 'habits.icon.familyPets.childcare'],
      ['family-pets/donations', 'habits.icon.familyPets.donations'],
      ['family-pets/pets', 'habits.icon.familyPets.pets', 'pets'],
      ['family-pets/school', 'habits.icon.familyPets.school'],
    ],
  },
  {
    id: 'relationships',
    label: 'habits.category.relationships',
    tint: { light: '#F5EBFF', dark: '#342A3F' },
    spendCategory: 'other',
    icons: [
      ['relationships/call-family', 'habits.icon.relationships.callFamily'],
      ['relationships/date-night', 'habits.icon.relationships.dateNight'],
    ],
  },
  {
    id: 'learning-growth',
    label: 'habits.category.learningGrowth',
    tint: { light: '#F1F3DA', dark: '#303119' },
    spendCategory: 'news',
    icons: [
      ['learning-growth/care-for-plants', 'habits.icon.learningGrowth.careForPlants'],
      ['learning-growth/journal', 'habits.icon.learningGrowth.journal'],
      ['learning-growth/learn-a-language', 'habits.icon.learningGrowth.learnALanguage'],
      ['learning-growth/online-course', 'habits.icon.learningGrowth.onlineCourse'],
      ['learning-growth/paint-draw', 'habits.icon.learningGrowth.paintDraw'],
      ['learning-growth/plan-the-day', 'habits.icon.learningGrowth.planTheDay'],
      ['learning-growth/practice-music', 'habits.icon.learningGrowth.practiceMusic'],
      ['learning-growth/read', 'habits.icon.learningGrowth.read'],
    ],
  },
  {
    id: 'finance',
    label: 'habits.category.finance',
    tint: { light: '#FFE8EF', dark: '#40262E' },
    spendCategory: 'other',
    icons: [
      ['finance/bank-fees', 'habits.icon.finance.bankFees', 'finance'],
      ['finance/credit-card', 'habits.icon.finance.creditCard', 'finance'],
      ['finance/insurance', 'habits.icon.finance.insurance', 'insurance'],
      ['finance/investments', 'habits.icon.finance.investments'],
      ['finance/subscriptions', 'habits.icon.finance.subscriptions'],
      ['finance/taxes', 'habits.icon.finance.taxes'],
    ],
  },
  {
    id: 'goals',
    label: 'habits.category.goals',
    tint: { light: '#DDF7EB', dark: '#1A362A' },
    spendCategory: 'other',
    icons: [
      ['goals/big-purchase', 'habits.icon.goals.bigPurchase'],
      ['goals/buy-a-home', 'habits.icon.goals.buyAHome'],
      ['goals/education-fund', 'habits.icon.goals.educationFund'],
      ['goals/emergency-fund', 'habits.icon.goals.emergencyFund'],
      ['goals/just-saving', 'habits.icon.goals.justSaving'],
      ['goals/new-car', 'habits.icon.goals.newCar'],
      ['goals/new-gadget', 'habits.icon.goals.newGadget'],
      ['goals/other', 'habits.icon.goals.other'],
      ['goals/pay-off-debt', 'habits.icon.goals.payOffDebt'],
      ['goals/retirement', 'habits.icon.goals.retirement'],
      ['goals/start-a-business', 'habits.icon.goals.startABusiness'],
      ['goals/start-investing', 'habits.icon.goals.startInvesting'],
      ['goals/vacation', 'habits.icon.goals.vacation'],
      ['goals/wedding', 'habits.icon.goals.wedding'],
      ['goals/world-trip', 'habits.icon.goals.worldTrip'],
    ],
  },
];

/** The icon picker's groups, each with its heading, tint and icons, in display order. */
export const HABIT_ICON_CATEGORIES: HabitIconCategory[] = GROUPS.map(
  ({ spendCategory: groupSpend, icons, ...group }) => ({
    ...group,
    icons: icons.map(([id, label, spendCategory]) => ({
      id,
      label,
      Svg: HABIT_ICON_ART[id],
      spendCategory: spendCategory ?? groupSpend,
    })),
  }),
);

/** All the icons, in picker order. */
export const HABIT_ICONS: HabitIconDef[] = HABIT_ICON_CATEGORIES.flatMap(
  (category) => category.icons,
);

const BY_ID = new Map<string, HabitIconDef>(HABIT_ICONS.map((icon) => [icon.id, icon]));

export function habitIcon(id: string | null | undefined): HabitIconDef | undefined {
  return id ? BY_ID.get(id) : undefined;
}

/** Drawn for an icon id this build does not know, such as one added by a newer version. */
export const FALLBACK_HABIT_ICON: HabitIconDef = BY_ID.get('goals/other') ?? HABIT_ICONS[0];
