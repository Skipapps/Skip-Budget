/**
 * The month, year and filter pages choose for the page that opened them, and a choice there is only
 * how that page looks (nothing is saved), so it is handed straight back to it. Nothing is kept: a
 * pick with no page listening (one reached by a link) goes nowhere, so a page opened later is never
 * handed a choice made for another.
 */

import type { DateRangeChoice } from '@/lib/payment-search';

/** A search's date range, as the search keeps it. */
export type PickedRange = DateRangeChoice;

/**
 * The one filter a filter page sets, whole: the amount page always hands back both bounds, so
 * clearing one cannot leave the other behind.
 */
export type PickedFilter =
  | { range: PickedRange }
  | { minCents: number | null; maxCents: number | null }
  | {
      /** Null for every account, '' for "Card not set". */
      source: string | null;
    };

export type PaymentPick =
  | {
      owner: string;
      type: 'month';
      /** yyyy-mm. */
      month: string;
    }
  | { owner: string; type: 'year'; year: number }
  | { owner: string; type: 'filters'; filter: PickedFilter };

export type PaymentPickType = PaymentPick['type'];

export type PaymentPickOf<T extends PaymentPickType> = Extract<PaymentPick, { type: T }>;

const listeners = new Set<(pick: PaymentPick) => void>();

/**
 * Hears the picks made for `owner` (the opener's `useId()`) of one type; a second page of the same
 * kind mounted underneath has its own id, so it never hears them.
 */
export function onPaymentPicked<T extends PaymentPickType>(
  owner: string,
  type: T,
  listener: (pick: PaymentPickOf<T>) => void,
): () => void {
  const heard = (pick: PaymentPick) => {
    if (pick.owner === owner && pick.type === type) listener(pick as PaymentPickOf<T>);
  };
  listeners.add(heard);
  return () => {
    listeners.delete(heard);
  };
}

export function pickPayment(pick: PaymentPick): void {
  for (const listener of listeners) listener(pick);
}
