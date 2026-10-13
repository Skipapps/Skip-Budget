import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { useCharges, type ChargeRow } from '@/api/charges';
import {
  assertFinite,
  guardBillDates,
  NOTHING_UPDATED,
  type BillValues,
  type SubscriptionValues,
} from '@/api/mutations';
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

type PlanKind = 'bill' | 'subscription';

/** A bill's edit or a subscription's, as its form builds it, with the answer to the past question. */
export type PlanEdit<K extends PlanKind> = {
  id: string;
  values: K extends 'bill' ? Partial<BillValues> : Partial<SubscriptionValues>;
  past: PastChargesScope;
};

/** The call is not on this database yet: PostgREST has not seen it (PGRST202), or Postgres has not. */
const lacksFunction = (error: { code?: string } | null) =>
  error?.code === 'PGRST202' || error?.code === '42883';

/** The plan alone, as `useUpdateBill` / `useUpdateSubscription` write it. */
async function savePlanOnly(table: 'bills' | 'subscriptions', id: string, values: object) {
  const { data, error } = await supabase
    .from(table)
    .update(values as never)
    .eq('id', id)
    .select('id');
  if (error) throw error;
  if (!data || data.length === 0) throw new Error(NOTHING_UPDATED);
}

/**
 * Saves an edited bill or subscription and, for `past: 'all'`, gives every charge already recorded
 * for it the name, amount and card or account it now has: one transaction
 * (`update_bill_and_charges` / `update_subscription_and_charges`), so a failure leaves neither
 * written and nothing is owed afterwards. 'upcoming' saves the plan alone.
 *
 * On a database without the functions, 'upcoming' saves the plan with a plain update instead, so
 * an app that reaches it first still saves edits. 'all' fails there and writes nothing: two writes
 * could save the plan without its past.
 */
export function useUpdatePlanAndCharges<K extends PlanKind>(kind: K) {
  const client = useQueryClient();

  return useMutation({
    mutationFn: async (edit: PlanEdit<K>) => {
      const values =
        kind === 'bill'
          ? await guardBillDates(edit.id, edit.values as Partial<BillValues>)
          : edit.values;
      assertFinite(values);
      const { data, error } = await supabase.rpc(
        kind === 'bill' ? 'update_bill_and_charges' : 'update_subscription_and_charges',
        { p_id: edit.id, p_values: values, p_rewrite: edit.past === 'all' },
      );
      if (error) {
        // The plan is gone, or not this person's: the same answer an empty update gives.
        if (error.code === 'P0002') throw new Error(NOTHING_UPDATED);
        if (edit.past !== 'all' && lacksFunction(error)) {
          await savePlanOnly(kind === 'bill' ? 'bills' : 'subscriptions', edit.id, values);
          return { id: edit.id };
        }
        throw error;
      }
      if (!data) throw new Error(NOTHING_UPDATED);
      return { id: edit.id };
    },
    onSuccess: ({ id }, edit) => {
      client.invalidateQueries({ queryKey: [kind === 'bill' ? 'bills' : 'subscriptions'] });
      client.invalidateQueries({ queryKey: [kind, id] });
      client.invalidateQueries({ queryKey: ['dashboard'] });
      // A loan is read with its bill.
      if (kind === 'bill') client.invalidateQueries({ queryKey: ['loans'] });
      if (edit.past === 'all') client.invalidateQueries({ queryKey: ['charges'] });
    },
  });
}

/** What the charges read says about one plan. */
export type PastRead = {
  /** How many charges (a loan's payments) are recorded for the plan. */
  count: number;
  /** The newest day the plan has been charged, for `floorAfterCharges`. */
  lastChargedOn: string | null;
};

const NO_PAST: PastRead = { count: 0, lastChargedOn: null };

function pastOf(charges: readonly ChargeRow[], kind: Kind, planId: string): PastRead {
  const mine = charges.filter((charge) => charge[COLUMN[kind]] === planId);
  return {
    count: mine.length,
    lastChargedOn: mine.reduce<string | null>(
      (latest, charge) => (!latest || charge.charged_on > latest ? charge.charged_on : latest),
      null,
    ),
  };
}

/**
 * The questions behind "Past and upcoming" and "Keep past". Each resolves to the answer, or null
 * when the person backed out, and then nothing may be written. A read that has not answered is not
 * "no charges": a screen awaits `load()` and hands its answer to the question. Asked without one
 * before the charges are read (`ready`), either returns null.
 */
export function usePastCharges(kind: Kind, planId: string | undefined) {
  const charges = useCharges();
  const { askChange, askDelete } = usePastChoice();
  const rewrite = useRewritePastCharges();

  const { data, isSuccess, refetch } = charges;
  const { count, lastChargedOn } = planId ? pastOf(data ?? [], kind, planId) : NO_PAST;
  const ready = !planId || isSuccess;
  const noun = NOUN[kind];

  /**
   * The plan's charges once the read has answered: at once when it has, otherwise after waiting for
   * it (the read already on its way, or a new one). Rejects only when the read fails.
   */
  const load = useCallback(async (): Promise<PastRead> => {
    if (!planId) return NO_PAST;
    const rows = isSuccess
      ? (data ?? [])
      : ((await refetch({ throwOnError: true, cancelRefetch: false })).data ?? []);
    return pastOf(rows, kind, planId);
  }, [data, isSuccess, kind, planId, refetch]);

  /**
   * On Save of an edit; with nothing to ask (a new plan, nothing copied changed, no charges) it is
   * 'upcoming' at once. `past` is what `load()` answered.
   */
  const choose = useCallback(
    async (name: string, changed: boolean, past?: PastRead): Promise<PastChargesScope | null> => {
      if (!planId || !changed) return 'upcoming';
      if (!past && !ready) return null;
      return askChange({ name, noun, count: past?.count ?? count });
    },
    [askChange, count, noun, planId, ready],
  );

  /**
   * On Delete. `stopped`: the plan has already stopped, so its past is kept and the only choice is
   * to remove it. `extra`: past that is not a charge but goes with the plan, a loan's payoffs.
   * With no past at all it is the plain confirm. `past` is what `load()` answered.
   */
  const chooseDelete = useCallback(
    async (
      name: string,
      options: { stopped?: boolean; extra?: number } = {},
      past?: PastRead,
    ): Promise<PastDelete | null> => {
      if (!past && !ready) return null;
      return askDelete({
        name,
        noun,
        count: (past?.count ?? count) + (options.extra ?? 0),
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
     * Whether the charges have been read. `lastChargedOn` stops a moved due date charging a cycle
     * twice, and the questions need the count, so an edit or a delete awaits `load()` until then.
     */
    ready,
    load,
    retry: () => void refetch(),
    saving: rewrite.isPending,
  };
}
