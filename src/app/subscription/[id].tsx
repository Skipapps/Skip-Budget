import { useLocalSearchParams } from 'expo-router';

import { usePaymentSources, useSubscriptions } from '@/api/queries';
import { BrandMark } from '@/components/brands/brand-mark';
import { ChangeLogoButton } from '@/components/brands/change-logo-button';
import { PlanDetail, type PlanDetailRow } from '@/components/plans/plan-detail';
import { cycleLabel } from '@/components/subscriptions/subscription-row';
import { t } from '@/i18n';
import { formatFullDate } from '@/lib/date';
import { logoDomainOf } from '@/lib/logo-domain';

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
      label: subscription.active
        ? t('subscriptions.detail.nextRenewal')
        : t('subscriptions.field.status'),
      value: !subscription.active
        ? t('subscriptions.cancelled')
        : subscription.next_renewal_on
          ? asDate(subscription.next_renewal_on)
          : t('dates.noDate'),
    });
    details.push({
      label: t('subscriptions.detail.paidFrom'),
      value: source?.label ?? t('subscriptions.noPaymentMethod'),
    });
    if (subscription.started_on) {
      details.push({
        label: t('subscriptions.detail.started'),
        value: asDate(subscription.started_on),
      });
    }
    if (subscription.note?.trim()) {
      details.push({ label: t('subscriptions.field.note'), value: subscription.note.trim() });
    }
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
          <ChangeLogoButton kind="subscription" id={id} name={subscription.name}>
            <BrandMark
              name={subscription.name}
              domain={logoDomainOf(subscription)}
              hidden={subscription.logo_hidden}
              size={52}
            />
          </ChangeLogoButton>
        ) : null
      }
      frequency={
        subscription
          ? subscription.active
            ? cycleLabel(subscription.cycle)
            : t('subscriptions.cancelled')
          : ''
      }
      details={details}
      editHref={`/add-subscription?id=${id}`}
    />
  );
}
