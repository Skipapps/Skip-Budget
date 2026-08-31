import { useCallback } from 'react';

import { useUpdateProfile } from '@/api/mutations';
import { usePro } from '@/api/pro';
import { enableReminders } from '@/api/push';
import {
  useBankAccounts,
  useBills,
  useCards,
  useProfile,
  useReceipts,
  useSalarySources,
} from '@/api/queries';
import { useUserId } from '@/providers/session-provider';

export type SetupStep = {
  id: 'salary' | 'source' | 'bill' | 'scan' | 'reminders';
  title: string;
  detail: string;
  done: boolean;
  /** Where tapping the step goes. Null when the step acts in place. */
  href: string | null;
};

/**
 * The Getting Started checklist, derived rather than stored.
 *
 * Every tick is read from the data the step creates — a salary row means pay
 * is set, a receipt scanned means the scanner was tried — the same rule the
 * balances follow, so the card can never disagree with reality. The only
 * stored fact is the dismissal, because "stop showing me this" is a choice
 * about the card and leaves no other trace.
 *
 * The order is the argument: pay first, because every good number in the app
 * is downstream of income; the scanner in the first five, because it is the
 * moment most likely to make somebody stay.
 */
export function useGettingStarted() {
  const userId = useUserId();
  const profile = useProfile();
  const salary = useSalarySources();
  const cards = useCards();
  const accounts = useBankAccounts();
  const bills = useBills();
  const receipts = useReceipts();
  const updateProfile = useUpdateProfile();
  const { pro } = usePro();

  // An account fact, not a device one. The phone's permission is shared by
  // every account on it, and a step that read it arrived pre-ticked for every
  // fresh sign-in on a used phone — claiming credit for a choice nobody made.
  const notified = Boolean(profile.data?.reminders_enabled_at);

  const askForReminders = useCallback(async () => {
    if (!userId) return;
    if (await enableReminders(userId)) {
      // enableReminders wrote the column; this refreshes the cache so the
      // tick appears now rather than on the next profile read.
      updateProfile.mutate({ reminders_enabled_at: new Date().toISOString() });
    }
  }, [userId, updateProfile]);

  const steps: SetupStep[] = [
    {
      id: 'salary',
      title: 'Set your pay',
      detail: 'Left this month, savings and Insights all start from what comes in.',
      done: (salary.data?.length ?? 0) > 0,
      href: '/salary',
    },
    {
      id: 'source',
      title: 'Add a card or account',
      detail: 'Gives your spending somewhere to come from.',
      done: (cards.data?.length ?? 0) > 0 || (accounts.data?.length ?? 0) > 0,
      href: '/add-card',
    },
    {
      id: 'bill',
      title: 'Add your first bill',
      detail: 'Rent or the phone bill — one is enough to light up Coming up.',
      done: (bills.data?.length ?? 0) > 0,
      href: '/add-bill',
    },
    // Scanning is Pro; the checklist has to be finishable on free, so the
    // free step is the manual one and either kind of receipt completes it.
    pro
      ? {
          id: 'scan' as const,
          title: 'Scan a receipt',
          detail: 'Point the camera at one — Skip reads it, you check it, done.',
          done: (receipts.data ?? []).some(
            (row) => row.source === 'scan' || row.source === 'upload',
          ),
          href: '/receipts',
        }
      : {
          id: 'scan' as const,
          title: 'Add your first receipt',
          detail: 'What you spend day to day, next to your bills.',
          done: (receipts.data ?? []).length > 0,
          href: '/add-receipt',
        },
    {
      id: 'reminders',
      title: 'Turn on reminders',
      detail: 'So a bill never lands unannounced.',
      done: notified,
      // Acts in place: the tap IS the system permission ask.
      href: null,
    },
  ];

  const doneCount = steps.filter((step) => step.done).length;

  // Still loading reads as dismissed, so the card cannot flash at people who
  // finished setup months ago while their rows are on the way in.
  const settled = Boolean(profile.data) && !salary.isPending && !bills.isPending;
  const dismissed = Boolean(profile.data?.getting_started_dismissed_at);
  const visible = settled && !dismissed && doneCount < steps.length;

  const dismiss = useCallback(() => {
    updateProfile.mutate({ getting_started_dismissed_at: new Date().toISOString() });
  }, [updateProfile]);

  return { steps, doneCount, visible, dismiss, askForReminders };
}
