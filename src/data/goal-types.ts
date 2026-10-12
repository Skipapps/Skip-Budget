import type { MessageKey } from '@/i18n';

/** What a goal is for, in the order the save page offers them. Stored as the goal's `icon_id`. */
export const GOAL_TYPES = [
  'trip',
  'emergency',
  'home',
  'car',
  'education',
  'wedding',
  'phone',
  'gifts',
  'health',
  'family',
  'pets',
  'other',
] as const;

export type GoalType = (typeof GOAL_TYPES)[number];

/**
 * The type a stored icon id names. Anything else (an id from a later version, a typo, nothing) is
 * drawn as Other rather than left blank.
 */
export function goalIconOf(iconId: string | null | undefined): GoalType {
  return GOAL_TYPES.find((type) => type === iconId) ?? 'other';
}

const LABEL_KEYS: Record<GoalType, MessageKey> = {
  trip: 'goals.type.trip',
  emergency: 'goals.type.emergency',
  home: 'goals.type.home',
  car: 'goals.type.car',
  education: 'goals.type.education',
  wedding: 'goals.type.wedding',
  phone: 'goals.type.phone',
  gifts: 'goals.type.gifts',
  health: 'goals.type.health',
  family: 'goals.type.family',
  pets: 'goals.type.pets',
  other: 'goals.type.other',
};

export function goalTypeLabelKey(type: GoalType): MessageKey {
  return LABEL_KEYS[type];
}
