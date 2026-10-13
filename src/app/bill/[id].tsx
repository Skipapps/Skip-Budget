import { Redirect, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { useLoanDetail } from '@/api/loans';
import { useDeleteBill } from '@/api/mutations';
import { usePastCharges } from '@/api/past-charges';
import { useBills, usePaymentSources } from '@/api/queries';
import { BillMark } from '@/components/bills/bill-mark';
import { ChangeLogoButton } from '@/components/brands/change-logo-button';
import { billCategoryLabel, recurrenceLabel } from '@/components/bills/bill-row';
import { PlanDetail, type PlanDetailRow } from '@/components/plans/plan-detail';
import { getBillCategory } from '@/data/bill-categories';
import { t } from '@/i18n';
import { formatFullDate } from '@/lib/date';
import { failureMessage, failureText } from '@/lib/failure';
import { warn } from '@/lib/haptics';
import { isLoanBill } from '@/lib/ledger-link';
import { logoDomainOf } from '@/lib/logo-domain';
import { billStopped } from '@/lib/plan-stop';
import { useToday } from '@/lib/use-today';
import { useDialog } from '@/providers/dialog-provider';
import { useToast } from '@/providers/toast-context';

const asDate = (iso: string) => formatFullDate(new Date(`${iso}T00:00:00`));

/**
 * One bill: its details, its paid and upcoming charges, and the pencil to edit it. A loan's bill
 * goes on to the loan's own page, so a reminder's tap or an old link lands there too. A stopped bill
 * is final: no pencil, and Delete on the page.
 */
export default function BillDetailScreen() {
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const { today } = useToday();
  const bills = useBills();
  const loan = useLoanDetail(id || undefined);
  const { sources } = usePaymentSources();
  const pastCharges = usePastCharges('bill', id || undefined);
  const deleteBill = useDeleteBill();
  const ask = useDialog();
  const toast = useToast();
  // Held from the press until the bill is gone: the page leaves once the list no longer has it.
  const [deleting, setDeleting] = useState(false);

  const bill = bills.data ? (bills.data.find((row) => row.id === id) ?? null) : undefined;
  const stopped = bill ? billStopped(bill, today) : false;

  const remove = async () => {
    if (!bill || deleting) return;
    // The question counts the charges, so it waits for them.
    if (!pastCharges.ready) {
      pastCharges.retry();
      warn();
      await ask({ title: failureText() });
      return;
    }
    const choice = await pastCharges.chooseDelete(bill.name || categoryOf(bill.category_id), {
      stopped: true,
    });
    if (choice !== 'everything') return;
    setDeleting(true);
    try {
      await deleteBill.mutateAsync(id);
      toast('toast.bill.deleted', 'deleted');
    } catch (thrown) {
      setDeleting(false);
      warn();
      await ask({ title: failureMessage(thrown) });
    }
  };

  const details: PlanDetailRow[] = [];
  if (bill) {
    const source = sources.find((option) => option.id === (bill.card_id ?? bill.bank_account_id));
    if (!stopped) {
      details.push({
        label: t('bills.detail.nextDue'),
        value: bill.next_due_on ? asDate(bill.next_due_on) : t('bills.detail.nothingDue'),
      });
    }
    details.push({
      label: t('bills.detail.paidFrom'),
      value: source?.label ?? t('bills.noPaymentMethod'),
    });
    details.push({ label: t('bills.field.category'), value: categoryOf(bill.category_id) });
    if (bill.starts_on) {
      details.push({ label: t('bills.detail.started'), value: asDate(bill.starts_on) });
    }
    // A stopped bill's end is the date it stopped, said under its amount.
    if (bill.ends_on && !stopped) {
      details.push({ label: t('bills.detail.ends'), value: asDate(bill.ends_on) });
    }
    if (bill.note?.trim()) details.push({ label: t('bills.field.note'), value: bill.note.trim() });
  }

  // Only a read that found the loan sends it on, and the loan page sends a bill with none back here
  // on the same read, so the two cannot pass it between them. A failed read shows the bill.
  if (loan.data?.kind === 'loan') {
    return <Redirect href={{ pathname: '/loan/[id]', params: { id } }} />;
  }
  const loanUnread = Boolean(bill && isLoanBill(bill.category_id)) && loan.isPending;

  return (
    <PlanDetail
      kind="bill"
      id={id}
      plan={bill}
      isLoading={bills.isPending || loanUnread}
      isError={bills.isError}
      onRetry={() => void bills.refetch()}
      mark={
        bill ? (
          <ChangeLogoButton kind="bill" id={id} name={bill.name}>
            <BillMark
              categoryId={bill.category_id}
              iconId={bill.icon_id}
              domain={logoDomainOf(bill)}
              name={bill.name}
              size={52}
            />
          </ChangeLogoButton>
        ) : null
      }
      frequency={
        !bill
          ? ''
          : !stopped
            ? recurrenceLabel(bill.recurrence)
            : bill.ends_on
              ? t('bills.stoppedOn', { date: asDate(bill.ends_on) })
              : t('bills.stopped')
      }
      details={details}
      editHref={`/add-bill?id=${id}`}
      stopped={
        stopped
          ? {
              label: deleting ? t('bills.add.deleting') : t('bills.add.deleteBill'),
              busy: deleting,
              onDelete: () => void remove(),
            }
          : undefined
      }
    />
  );
}

function categoryOf(categoryId: string): string {
  return billCategoryLabel(
    categoryId,
    getBillCategory(categoryId)?.label ?? t('bills.detail.otherCategory'),
  );
}
