/**
 * The changes typed into the loan calculator that is open: the bank's monthly payment and single
 * payments changed on the schedule. The calculator starts a draft and passes its id as `?draft=`;
 * the schedule and the payment pages read it live and write it on Done, and back writes nothing,
 * so whatever page sits underneath is current when it shows again.
 *
 * In memory, one slot: a cold link or a remounted navigator finds no matching id, and the pages
 * fall back to what their params say, read-only. Forward, to the schedule and the save page, the
 * same changes also travel as params (`loan-route.ts`), so a page opened from them shows the loan
 * that will be saved.
 */
import { useSyncExternalStore } from 'react';

import type { PaymentOverrides } from '@/lib/loan-overrides';

export type LoanDraft = { id: string; overrides: PaymentOverrides };

let slot: LoanDraft | null = null;
let counter = 0;
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((listener) => listener());

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/** A fresh draft for a calculator just opened; any earlier one is gone. */
export function startLoanDraft(): string {
  counter += 1;
  slot = { id: `loan-${counter}`, overrides: {} };
  emit();
  return slot.id;
}

export function readLoanDraft(id: string | undefined): PaymentOverrides | null {
  return id && slot?.id === id ? slot.overrides : null;
}

/** Replaces the draft's changes; false when the draft is no longer open. */
export function updateLoanDraft(id: string | undefined, overrides: PaymentOverrides): boolean {
  if (!id || slot?.id !== id) return false;
  slot = { id, overrides };
  emit();
  return true;
}

/** The draft's changes, re-read on every write; null when the draft is not the open one. */
export function useLoanDraft(id: string | undefined): PaymentOverrides | null {
  return useSyncExternalStore(subscribe, () => readLoanDraft(id));
}

/** The draft open now, whichever it is: the calculator reads the one it started this way. */
export function useOpenLoanDraft(): LoanDraft | null {
  return useSyncExternalStore(subscribe, () => slot);
}

export function resetLoanDraftForTests(): void {
  slot = null;
  emit();
}
