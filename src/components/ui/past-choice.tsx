import { useCallback, useMemo } from 'react';

import { t, type MessageKey } from '@/i18n';
import { useDialog } from '@/providers/dialog-provider';

/**
 * What a plan's recorded past is called: a bill's charges, a loan's payments, a habit's days, a
 * salary's pays.
 */
export type PastNoun = 'charges' | 'payments' | 'days' | 'pays';

/** 'all' rewrites what is already recorded as well; 'upcoming' leaves it as it landed. */
export type PastChange = 'all' | 'upcoming';

/** 'keep' stops the plan today and leaves its past in history; 'everything' deletes it all. */
export type PastDelete = 'keep' | 'everything';

type PastQuestion = {
  /** The plan's name as the person typed it, read inside the question. */
  name: string;
  noun: PastNoun;
  /** How many are already recorded. */
  count: number;
};

const CHANGE_TITLE: Record<PastNoun, MessageKey> = {
  charges: 'ui.past.change.title.charges',
  payments: 'ui.past.change.title.payments',
  days: 'ui.past.change.title.days',
  pays: 'ui.past.change.title.pays',
};

const CHANGE_BODY: Record<PastNoun, MessageKey> = {
  charges: 'ui.past.change.body.charges',
  payments: 'ui.past.change.body.payments',
  days: 'ui.past.change.body.days',
  pays: 'ui.past.change.body.pays',
};

const DELETE_BODY: Record<PastNoun, MessageKey> = {
  charges: 'ui.past.delete.body.charges',
  payments: 'ui.past.delete.body.payments',
  days: 'ui.past.delete.body.days',
  pays: 'ui.past.delete.body.pays',
};

const KEEP: Record<PastNoun, MessageKey> = {
  charges: 'ui.past.delete.keep.charges',
  payments: 'ui.past.delete.keep.payments',
  days: 'ui.past.delete.keep.days',
  pays: 'ui.past.delete.keep.pays',
};

/**
 * The one way bills, subscriptions, loans, habits and salaries ask about their past on an edit or a
 * delete. Words only, no data: the caller counts what is recorded (and waits for that read) before
 * asking.
 * Every question resolves null when the person backs out, and nothing may be written then.
 */
export function usePastChoice() {
  const ask = useDialog();

  /**
   * Asked once a field the past copied has changed. With nothing recorded there is no past to
   * change, so it resolves 'upcoming' without a dialog; French would also read a count of 0 as one.
   */
  const askChange = useCallback(
    async ({ name, noun, count }: PastQuestion): Promise<PastChange | null> => {
      if (count < 1) return 'upcoming';

      const choice = await ask({
        title: t(CHANGE_TITLE[noun]),
        message: t(CHANGE_BODY[noun], { name, count }),
        actions: [
          { id: 'all', label: t('ui.past.change.all') },
          { id: 'upcoming', label: t('ui.past.change.upcoming') },
        ],
        cancelLabel: t('common.cancel'),
      });
      return choice === 'all' || choice === 'upcoming' ? choice : null;
    },
    [ask],
  );

  /**
   * With nothing recorded, a plain Delete. With a past, keeping it is the first choice. A plan
   * already stopped has kept its past, so the way out says so and the only choice is to remove it.
   */
  const askDelete = useCallback(
    async ({
      name,
      noun,
      count,
      stopped = false,
    }: PastQuestion & { stopped?: boolean }): Promise<PastDelete | null> => {
      const title = t('ui.past.delete.title', { name });

      if (count < 1) {
        const choice = await ask({
          title,
          message: t('ui.past.delete.none'),
          actions: [{ id: 'everything', label: t('common.delete'), destructive: true }],
          cancelLabel: t('common.cancel'),
        });
        return choice === 'everything' ? 'everything' : null;
      }

      const message = t(DELETE_BODY[noun], { name, count });
      const everything = {
        id: 'everything',
        label: t('ui.past.delete.everything'),
        destructive: true,
      };

      if (stopped) {
        const choice = await ask({
          title,
          message,
          actions: [everything],
          cancelLabel: t(KEEP[noun]),
        });
        return choice === 'everything' ? 'everything' : null;
      }

      const choice = await ask({
        title,
        message,
        actions: [{ id: 'keep', label: t(KEEP[noun]) }, everything],
        cancelLabel: t('common.cancel'),
      });
      return choice === 'keep' || choice === 'everything' ? choice : null;
    },
    [ask],
  );

  return useMemo(() => ({ askChange, askDelete }), [askChange, askDelete]);
}
