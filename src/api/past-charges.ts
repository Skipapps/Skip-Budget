import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { useCharges } from '@/api/charges';
import { usePastChoice, type PastDelete, type PastNoun } from '@/components/ui/past-choice';
import { supabase } from '@/lib/supabase';

/**
 * Editing or deleting a bill, subscription or loan that has already been charged. A charge copies
 * its name, amount and card from the plan the day it lands and never reads them back, so months
 * behind an edit keep their figures: right for a varying electricity bill, wrong for a mistyped
 * rent. Only the person knows which, so they are asked, and only when it would change something:
 * the plan has charges and a copied field changed. The due date is not copied; a charge's date is
 * the day the money moved. A delete asks whether to keep that past (the plan stops today) or
 * remove it with the plan.
 */

export type PastChargesScope = 'all' | 'upcoming';

/** A loan's charges are its bill's: the payments recorded month by month. */
type Kind = 'bill' | 'subscription' | 'loan';

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
  loan: 'bill_id',
};

const NOUN: Record<Kind, PastNoun> = {
  bill: 'charges',
  subscription: 'charges',
  loan: 'payments',
};

/**
 * Rewrites every recorded charge of one plan to its new values. An update, never a delete and
 * re-record: the scheduler pushes a notice for every charge it newly writes, and a correction must
 * not arrive as a fresh batch.
 */
function useRewritePastCharges() {
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
      // Two writes from here could leave a loan edited and its payments not; its edit rewrites them
      // in the same transaction instead (useUpdateLoan's `past`).
      if (kind === 'loan') throw new Error('A loan rewrites its payments with its edit.');
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
 * The questions behind "Past and upcoming" and "Keep past". Each resolves to the answer, or null
 * when the person backed out, and then nothing may be written. Both wait for the charges read
 * (`ready`): a read that has not answered is not "no charges", so either returns null until it has.
 */
export function usePastCharges(kind: Kind, planId: string | undefined) {
  const charges = useCharges();
  const { askChange, askDelete } = usePastChoice();
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
  const ready = !planId || charges.isSuccess;
  const noun = NOUN[kind];

  /** On Save of an edit; with nothing to ask (a new plan, nothing copied changed, no charges) it is 'upcoming' at once. */
  const choose = useCallback(
    async (name: string, changed: boolean): Promise<PastChargesScope | null> => {
      if (!planId || !changed) return 'upcoming';
      if (!ready) return null;
      return askChange({ name, noun, count });
    },
    [askChange, count, noun, planId, ready],
  );

  /**
   * On Delete. `stopped`: the plan has already stopped, so its past is kept and the only choice is
   * to remove it. `extra`: past that is not a charge but goes with the plan, a loan's payoffs.
   * With no past at all it is the plain confirm.
   */
  const chooseDelete = useCallback(
    async (
      name: string,
      options: { stopped?: boolean; extra?: number } = {},
    ): Promise<PastDelete | null> => {
      if (!ready) return null;
      return askDelete({
        name,
        noun,
        count: count + (options.extra ?? 0),
        stopped: options.stopped,
      });
    },
    [askDelete, count, noun, ready],
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
    chooseDelete,
    /** Bills and subscriptions only. A loan's edit carries `past` to `useUpdateLoan`. */
    apply,
    /** How many charges (a loan's payments) are recorded for the plan. */
    count,
    lastChargedOn,
    /**
     * Whether an edit or a delete can go ahead yet. `lastChargedOn` stops a moved due date charging
     * a cycle twice, and the questions need the count, so both wait for the read rather than guess.
     */
    ready,
    retry: () => void charges.refetch(),
    saving: rewrite.isPending,
  };
}
