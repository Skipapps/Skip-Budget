import { useLocalSearchParams } from 'expo-router';

import { useBills, usePaymentSources } from '@/api/queries';
import { BillMark } from '@/components/bills/bill-mark';
import { ChangeLogoButton } from '@/components/brands/change-logo-button';
import { RECURRENCE_LABELS } from '@/components/bills/bill-row';
import { PlanDetail, type PlanDetailRow } from '@/components/plans/plan-detail';
import { BILL_CATEGORIES } from '@/data/bills-mock';
import { formatFullDate } from '@/lib/date';
import { logoDomainOf } from '@/lib/logo-domain';

const asDate = (iso: string) => formatFullDate(new Date(`${iso}T00:00:00`));

/** One bill: its details, its paid and upcoming charges, and the pencil to edit it. */
export default function BillDetailScreen() {
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const bills = useBills();
  const { sources } = usePaymentSources();

  const bill = bills.data ? (bills.data.find((row) => row.id === id) ?? null) : undefined;

  const details: PlanDetailRow[] = [];
  if (bill) {
    const source = sources.find((option) => option.id === (bill.card_id ?? bill.bank_account_id));
    details.push({
      label: 'Next due',
      value: bill.next_due_on ? asDate(bill.next_due_on) : 'Nothing due',
    });
    details.push({ label: 'Paid from', value: source?.label ?? 'No payment method' });
    details.push({
      label: 'Category',
      value: BILL_CATEGORIES.find((category) => category.id === bill.category_id)?.label ?? 'Other',
    });
    if (bill.starts_on) details.push({ label: 'Started', value: asDate(bill.starts_on) });
    if (bill.ends_on) details.push({ label: 'Ends', value: asDate(bill.ends_on) });
    if (bill.note?.trim()) details.push({ label: 'Note', value: bill.note.trim() });
  }

  return (
    <PlanDetail
      kind="bill"
      id={id}
      plan={bill}
      isLoading={bills.isPending}
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
      frequency={bill ? (RECURRENCE_LABELS[bill.recurrence] ?? bill.recurrence) : ''}
      details={details}
      editHref={`/add-bill?id=${id}`}
    />
  );
}
