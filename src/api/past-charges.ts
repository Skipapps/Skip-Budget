import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { useCharges } from '@/api/charges';
import { t } from '@/i18n';
import { supabase } from '@/lib/supabase';
import { useDialog } from '@/providers/dialog-provider';

/**
 * Editing a bill or subscription that has already been charged. A charge copies its name, amount
 * and card from the plan the day it lands and never reads them back, so months behind an edit keep
 * their figures: right for a varying electricity bill, wrong for a mistyped rent. Only the person
 * knows which, so they are asked, and only when it would change something: the plan has charges and
 * a copied field changed. The due date is not copied; a charge's date is the day the money moved.
 */

export type PastChargesScope = 'all' | 'upcoming';

type Kind = 'bill' | 'subscription';

/** The fields a charge copies from its plan, so the only ones an edit can carry back. */
export type CarriedValues = {
  label: string;
  amount: number;
  card_id: string | null;
  bank_account_id: string | null;
};

const COLUMN: Record<Kind, 'bill_id' | 'subscription_id'> = {
  bill: 'bill_id',
  subscription: 'subscription_id',
};

/**
 * Rewrites every recorded charge of one plan to its new values. An update, never a delete and
 * re-record: the scheduler pushes a notice for every charge it newly writes, and a correction must
 * not arrive as a fresh batch.
 */
export function useRewritePastCharges() {
  const client = useQueryClient();

  return useMutation({
    mutationFn: async ({
      kind,
      planId,
      values,
    }: {
      kind: Kind;
      planId: string;
      values: CarriedValues;
    }) => {
      const { error } = await supabase
        .from('charges')
        .update(values as never)
        .eq(COLUMN[kind], planId);
      if (error) throw error;
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['charges'] });
      client.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

/**
 * The question behind "Past and upcoming". `choose` resolves to the scope to save with, or null
 * when the person backed out; with nothing to ask it resolves 'upcoming' without a dialog.
 */
export function usePastCharges(kind: Kind, planId: string | undefined) {
  const charges = useCharges();
  const ask = useDialog();
  const rewrite = useRewritePastCharges();

  const mine = planId
    ? (charges.data ?? []).filter((charge) => charge[COLUMN[kind]] === planId)
    : [];
  const count = mine.length;
  // The newest day this plan has been charged, for `floorAfterCharges`.
  const lastChargedOn = mine.reduce<string | null>(
    (latest, charge) => (!latest || charge.charged_on > latest ? charge.charged_on : latest),
    null,
  );
  // A read that has not answered is not "no charges": asking costs one tap,
  // guessing wrong leaves a month showing a figure nobody meant.
  const unknown = Boolean(planId) && !charges.isSuccess;

  const choose = useCallback(
    async (name: string, changed: boolean): Promise<PastChargesScope | null> => {
      if (!planId || !changed || (count === 0 && !unknown)) return 'upcoming';

      // Unanswered, the count is usually 0, and French plural rules would read 0 as "that charge";
      // so this case picks its sentence on count === 1 itself.
      const message = unknown
        ? t(count === 1 ? 'api.pastCharges.maybeOne' : 'api.pastCharges.maybeMany', { name })
        : t('api.pastCharges.charged', { name, count });

      const choice = await ask({
        title: t('api.pastCharges.title'),
        message,
        actions: [
          { id: 'all', label: t('api.pastCharges.all') },
          { id: 'upcoming', label: t('api.pastCharges.upcoming') },
        ],
        cancelLabel: t('common.cancel'),
      });
      return choice === 'all' || choice === 'upcoming' ? choice : null;
    },
    [ask, count, planId, unknown],
  );

  const apply = useCallback(
    async (values: CarriedValues) => {
      if (!planId) return;
      await rewrite.mutateAsync({ kind, planId, values });
    },
    [kind, planId, rewrite],
  );

  return {
    choose,
    apply,
    lastChargedOn,
    /**
     * Whether an edit can be saved yet. `lastChargedOn` stops a moved due date charging a cycle
     * twice, so an edit waits for the read rather than guessing.
     */
    ready: !planId || charges.isSuccess,
    retry: () => void charges.refetch(),
    saving: rewrite.isPending,
  };
}
