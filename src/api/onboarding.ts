import { useCallback } from 'react';

import { useUpdateProfile } from '@/api/mutations';
import {
  useBankAccounts,
  useBills,
  useCards,
  useProfile,
  useReceipts,
  useSalarySources,
  useSubscriptions,
} from '@/api/queries';

export type SetupStep = {
  id: 'salary' | 'wallet' | 'bill' | 'subscription' | 'receipt';
  title: string;
  detail: string;
  done: boolean;
  /** Where tapping the step goes. */
  href: string;
  /** Never blocks finishing setup; said out loud on both surfaces. */
  optional?: boolean;
};

/**
 * The five setup steps, derived rather than stored: the one definition that /setup and Home's
 * Getting Started card both read. Each tick comes from the data the step creates; the only stored
 * fact is the dismissal. The receipt is optional, since a checklist that needs an invented purchase
 * is a lie.
 */
export function useGettingStarted() {
  const profile = useProfile();
  const salary = useSalarySources();
  const cards = useCards();
  const accounts = useBankAccounts();
  const bills = useBills();
  const subscriptions = useSubscriptions();
  const receipts = useReceipts();
  const updateProfile = useUpdateProfile();

  const hasCard = (cards.data?.length ?? 0) > 0;
  const hasAccount = (accounts.data?.length ?? 0) > 0;

  const steps: SetupStep[] = [
    {
      id: 'salary',
      title: 'Set your pay',
      detail: 'Left this month, savings and Insights all start from what comes in.',
      done: (salary.data?.length ?? 0) > 0,
      href: '/salary',
    },
    {
      // Skipping the account offer still ticks the step: an unticked row after adding a card read
      // as "it did not save".
      id: 'wallet',
      title: 'Add your credit card and bank account',
      detail:
        'Card first; the bank account is offered right after, and skipping it still completes the step.',
      done: hasCard || hasAccount,
      href: '/add-card',
    },
    {
      id: 'bill',
      title: 'Add your bills',
      detail: 'Rent or the phone bill — one is enough to light up Coming up.',
      done: (bills.data?.length ?? 0) > 0,
      href: '/add-bill',
    },
    {
      id: 'subscription',
      title: 'Add your subscriptions',
      detail: 'Netflix, the gym — the charges that come back on their own land in Coming up.',
      done: (subscriptions.data?.length ?? 0) > 0,
      href: '/add-subscription',
    },
    {
      id: 'receipt',
      title: 'Add a receipt',
      detail:
        'What you spend day to day, next to your bills. Skippable — the app works without it.',
      done: (receipts.data ?? []).length > 0,
      href: '/add-receipt',
      optional: true,
    },
  ];

  const doneCount = steps.filter((step) => step.done).length;
  const requiredDone = steps.every((step) => step.optional || step.done);

  // Still loading reads as dismissed, so neither surface flashes at people who finished setup.
  // Receipts count: an account whose only entries are receipts is still a returning one.
  const settled =
    Boolean(profile.data) &&
    !salary.isPending &&
    !cards.isPending &&
    !accounts.isPending &&
    !bills.isPending &&
    !subscriptions.isPending &&
    !receipts.isPending;
  const dismissed = Boolean(profile.data?.getting_started_dismissed_at);
  const visible = settled && !dismissed && doneCount < steps.length;

  const dismiss = useCallback(() => {
    updateProfile.mutate({ getting_started_dismissed_at: new Date().toISOString() });
  }, [updateProfile]);

  return { steps, doneCount, requiredDone, settled, dismissed, visible, dismiss };
}
