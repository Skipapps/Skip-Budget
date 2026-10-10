import type { MessageKey } from '@/i18n';

/**
 * The icons a book can wear, in the order the picker offers them. General's own icon is not among
 * them: General is the book every receipt starts in, and a second one wearing its icon would read
 * as it.
 */
export const BOOK_ICONS = [
  'trip',
  'road-trip',
  'kids-family',
  'home',
  'work',
  'pets',
  'health',
  'car',
  'gifts',
  'wedding',
  'groceries',
  'shopping',
  'food',
  'entertainment',
  'fitness',
  'hobbies',
  'school',
  'home-repairs',
  'garden',
  'moving',
  'party',
  'charity',
  'taxes',
] as const;

export type BookIconId = 'general' | (typeof BOOK_ICONS)[number];

/** The picker's first rows; More opens the rest. Eleven, so More completes three rows of four. */
export const BOOK_ICONS_SHOWN = 11;

/** General: a receipt with no book. Not a row, so it has no id of its own; this stands in for one. */
export const GENERAL_BOOK = 'general';

/** The icon a book stored, or General's for one this build does not know. */
export function bookIconId(raw: string | null | undefined): BookIconId {
  return BOOK_ICONS.find((id) => id === raw) ?? 'general';
}

const LABEL_KEYS: Record<BookIconId, MessageKey> = {
  general: 'receipts.books.icon.general',
  trip: 'receipts.books.icon.trip',
  'road-trip': 'receipts.books.icon.roadTrip',
  'kids-family': 'receipts.books.icon.kidsFamily',
  home: 'receipts.books.icon.home',
  work: 'receipts.books.icon.work',
  pets: 'receipts.books.icon.pets',
  health: 'receipts.books.icon.health',
  car: 'receipts.books.icon.car',
  gifts: 'receipts.books.icon.gifts',
  wedding: 'receipts.books.icon.wedding',
  groceries: 'receipts.books.icon.groceries',
  shopping: 'receipts.books.icon.shopping',
  food: 'receipts.books.icon.food',
  entertainment: 'receipts.books.icon.entertainment',
  fitness: 'receipts.books.icon.fitness',
  hobbies: 'receipts.books.icon.hobbies',
  school: 'receipts.books.icon.school',
  'home-repairs': 'receipts.books.icon.homeRepairs',
  garden: 'receipts.books.icon.garden',
  moving: 'receipts.books.icon.moving',
  party: 'receipts.books.icon.party',
  charity: 'receipts.books.icon.charity',
  taxes: 'receipts.books.icon.taxes',
};

export function bookIconLabelKey(id: BookIconId): MessageKey {
  return LABEL_KEYS[id];
}

/** The longest name the database keeps. */
export const BOOK_NAME_MAX = 40;
