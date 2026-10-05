import { useLocalSearchParams } from 'expo-router';

import { usePaymentSources, useSubscriptions } from '@/api/queries';
import { BrandMark } from '@/components/brands/brand-mark';
import { PlanDetail, type PlanDetailRow } from '@/components/plans/plan-detail';
import { CYCLE_LABELS } from '@/components/subscriptions/subscription-row';
import { formatFullDate } from '@/lib/date';

const asDate = (iso: string) => formatFullDate(new Date(`${iso}T00:00:00`));

export default function SubscriptionDetailScreen() {
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const subscriptions = useSubscriptions();
  const { sources } = usePaymentSources();

  const subscription = subscriptions.data
    ? (subscriptions.data.find((row) => row.id === id) ?? null)
    : undefined;

  const details: PlanDetailRow[] = [];
  if (subscription) {
    const source = sources.find(
      (option) => option.id === (subscription.card_id ?? subscription.bank_account_id),
    );
    details.push({
      label: subscription.active ? 'Next renewal' : 'Status',
      value: !subscription.active
        ? 'Cancelled'
        : subscription.next_renewal_on
          ? asDate(subscription.next_renewal_on)
          : 'No date yet',
    });
    details.push({ label: 'Paid from', value: source?.label ?? 'No payment method' });
    if (subscription.started_on) {
      details.push({ label: 'Started', value: asDate(subscription.started_on) });
    }
    if (subscription.note?.trim()) details.push({ label: 'Note', value: subscription.note.trim() });
  }

  return (
    <PlanDetail
      kind="subscription"
      id={id}
      plan={subscription}
      isLoading={subscriptions.isPending}
      isError={subscriptions.isError}
      onRetry={() => void subscriptions.refetch()}
      mark={
        subscription ? (
          <BrandMark name={subscription.name} domain={subscription.brands?.domain} size={52} />
        ) : null
      }
      frequency={
        subscription
          ? subscription.active
            ? (CYCLE_LABELS[subscription.cycle] ?? subscription.cycle)
            : 'Cancelled'
          : ''
      }
      details={details}
      editHref={`/add-subscription?id=${id}`}
    />
  );
}
