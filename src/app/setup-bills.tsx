import { router } from 'expo-router';
import { useMemo } from 'react';

import { usePaymentLabels } from '@/api/payment-labels';
import { useBills } from '@/api/queries';
import { BillRow } from '@/components/bills/bill-row';
import { SetupCollection } from '@/components/setup/setup-collection';
import { t } from '@/i18n';
import { countsInSpending } from '@/lib/bill-spending';
import { billPageHref, isLoanBill } from '@/lib/ledger-link';
import { logoDomainOf } from '@/lib/logo-domain';
import { billStopped } from '@/lib/plan-stop';
import { useToday } from '@/lib/use-today';

/** The bills step of the setup walk-in: add as many as there are, then Done. */
export default function SetupBillsScreen() {
  const query = useBills();
  // Every card and account, a locked one too: each bill names what it is paid with on any plan.
  const { labelOf } = usePaymentLabels();
  const { today } = useToday();

  // The DB stores positive magnitudes; the UI shows outgoings as negative.
  const bills = useMemo(
    () =>
      (query.data ?? []).filter(countsInSpending).map((row) => ({
        id: row.id,
        name: row.name,
        amount: -row.amount,
        dueDate: row.next_due_on ?? '',
        domain: logoDomainOf(row),
        recurrence: row.recurrence,
        categoryId: row.category_id,
        iconId: row.icon_id ?? undefined,
        sourceId: row.card_id ?? row.bank_account_id ?? '',
        stopped: billStopped(row, today),
      })),
    [query.data, today],
  );

  return (
    <SetupCollection
      title={t('onboarding.bills.title')}
      subtitle={t('onboarding.bills.subtitle')}
      emptyText={t('onboarding.bills.empty')}
      addLabel={t('onboarding.bills.add')}
      addAnotherLabel={t('onboarding.bills.addAnother')}
      addHref="/add-bill"
      count={bills.length}
      isPending={query.isPending}
      isError={query.isError}
      onRetry={() => void query.refetch()}
    >
      {bills.map((bill) => (
        <BillRow
          key={bill.id}
          bill={bill}
          sourceLabel={labelOf(bill.sourceId) ?? ''}
          // A loan is changed from its own page, which its pencil leads on from; a stopped bill is
          // final, so it opens on its page, never its edit form.
          onPress={() =>
            router.push(
              isLoanBill(bill.categoryId) || bill.stopped
                ? billPageHref(bill.id, bill.categoryId)
                : `/add-bill?id=${bill.id}`,
            )
          }
        />
      ))}
    </SetupCollection>
  );
}
