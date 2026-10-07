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
import { t } from '@/i18n';

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
      title: t('api.setup.salary.title'),
      detail: t('api.setup.salary.detail'),
      done: (salary.data?.length ?? 0) > 0,
      href: '/salary',
    },
    {
      // Skipping the account offer still ticks the step: an unticked row after adding a card read
      // as "it did not save".
      id: 'wallet',
      title: t('api.setup.wallet.title'),
      detail: t('api.setup.wallet.detail'),
      done: hasCard || hasAccount,
      href: '/add-card',
    },
    {
      id: 'bill',
      title: t('api.setup.bill.title'),
      detail: t('api.setup.bill.detail'),
      done: (bills.data?.length ?? 0) > 0,
      href: '/add-bill',
    },
    {
      id: 'subscription',
      title: t('api.setup.subscription.title'),
      detail: t('api.setup.subscription.detail'),
      done: (subscriptions.data?.length ?? 0) > 0,
      href: '/add-subscription',
    },
    {
      id: 'receipt',
      title: t('api.setup.receipt.title'),
      detail: t('api.setup.receipt.detail'),
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
