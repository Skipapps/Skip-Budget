import { router } from 'expo-router';
import { useMemo } from 'react';

import { useBills, usePaymentSources } from '@/api/queries';
import { BillRow } from '@/components/bills/bill-row';
import { SetupCollection } from '@/components/setup/setup-collection';
import { t } from '@/i18n';
import { logoDomainOf } from '@/lib/logo-domain';

/** The bills step of the setup walk-in: add as many as there are, then Done. */
export default function SetupBillsScreen() {
  const query = useBills();
  const { sources } = usePaymentSources();

  const sourceLabels = useMemo(
    () => new Map(sources.map((source) => [source.id, source.label])),
    [sources],
  );

  // The DB stores positive magnitudes; the UI shows outgoings as negative.
  const bills = useMemo(
    () =>
      (query.data ?? []).map((row) => ({
        id: row.id,
        name: row.name,
        amount: -row.amount,
        dueDate: row.next_due_on ?? '',
        domain: logoDomainOf(row),
        recurrence: row.recurrence,
        categoryId: row.category_id,
        iconId: row.icon_id ?? undefined,
        sourceId: row.card_id ?? row.bank_account_id ?? '',
      })),
    [query.data],
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
          sourceLabel={sourceLabels.get(bill.sourceId) ?? ''}
          onPress={() => router.push(`/add-bill?id=${bill.id}`)}
        />
      ))}
    </SetupCollection>
  );
}
