import { router } from 'expo-router';
import { useMemo } from 'react';

import { usePaymentSources, useSubscriptions } from '@/api/queries';
import { SetupCollection } from '@/components/setup/setup-collection';
import { t } from '@/i18n';
import { SubscriptionRow } from '@/components/subscriptions/subscription-row';
import { logoDomainOf } from '@/lib/logo-domain';

/** The subscriptions step of the setup walk-in: add as many as there are, then Done. */
export default function SetupSubscriptionsScreen() {
  const query = useSubscriptions();
  const { sources } = usePaymentSources();

  const sourceLabels = useMemo(
    () => new Map(sources.map((source) => [source.id, source.label])),
    [sources],
  );

  const subscriptions = query.data ?? [];

  return (
    <SetupCollection
      title={t('onboarding.subscriptions.title')}
      subtitle={t('onboarding.subscriptions.subtitle')}
      emptyText={t('onboarding.subscriptions.empty')}
      addLabel={t('onboarding.subscriptions.add')}
      addAnotherLabel={t('onboarding.subscriptions.addAnother')}
      addHref="/add-subscription"
      count={subscriptions.length}
      isPending={query.isPending}
      isError={query.isError}
      onRetry={() => void query.refetch()}
    >
      {subscriptions.map((subscription) => (
        <SubscriptionRow
          key={subscription.id}
          name={subscription.name}
          amount={subscription.amount}
          cycle={subscription.cycle}
          renewsOn={subscription.next_renewal_on}
          domain={logoDomainOf(subscription)}
          logoHidden={subscription.logo_hidden}
          active={subscription.active}
          sourceLabel={
            sourceLabels.get(subscription.card_id ?? subscription.bank_account_id ?? '') ?? ''
          }
          onPress={() => router.push(`/add-subscription?id=${subscription.id}`)}
        />
      ))}
    </SetupCollection>
  );
}
