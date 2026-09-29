import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { useCharges } from '@/api/charges';
import { supabase } from '@/lib/supabase';
import { useDialog } from '@/providers/dialog-provider';

/**
 * Editing a bill or subscription that has already been charged.
 *
 * A charge copies its name, amount and card from the plan on the day it lands
 * and never reads them back — so correcting a plan leaves what already went
 * out alone, and the months behind an edit keep the figures they really had.
 * That is right for an electricity bill that costs a different amount every
 * month, and wrong for a rent typed as $1,030 when it was $1,100: the edit
 * saved and September still said $1,030.
 *
 * Only the person knows which of the two an edit is, so they are asked, and
 * only when the answer would change something: a plan with charges behind it,
 * and a change to one of the fields a charge copies. The due date is not one of
 * them — a charge's date is the day the money actually moved.
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
 * Rewrites every recorded charge of one plan to the plan's new values.
 *
 * An update, never a delete and re-record: the scheduler pushes a notice for
 * every charge it newly writes, and a correction must not arrive on somebody's
 * lock screen as a fresh batch of charges.
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
 * The question, and the rewrite behind "Past and upcoming".
 *
 * `choose` resolves to the scope to save with, or null when the person backed
 * out — the form then stays open with nothing saved. When there is nothing to
 * ask about it resolves 'upcoming' without a dialog, which is exactly what a
 * save did before.
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

      const already = unknown
        ? `${name} may already have been charged.`
        : `${name} has already been charged ${count === 1 ? 'once' : `${count} times`}.`;

      const choice = await ask({
        title: 'Change past charges too?',
        message: `${already} Change ${count === 1 ? 'that charge' : 'those'} as well, or only the ones still to come?`,
        actions: [
          { id: 'all', label: 'Past and upcoming' },
          { id: 'upcoming', label: 'Upcoming only' },
        ],
        cancelLabel: 'Cancel',
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
     * Whether an edit can be saved yet. `lastChargedOn` keeps a moved due date
     * from charging a cycle twice, and it cannot do that from a read that has
     * not landed — so an edit waits for it rather than guessing.
     */
    ready: !planId || charges.isSuccess,
    retry: () => void charges.refetch(),
    saving: rewrite.isPending,
  };
}
