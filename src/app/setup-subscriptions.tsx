import { router } from 'expo-router';
import { useMemo } from 'react';

import { usePaymentSources, useSubscriptions } from '@/api/queries';
import { SetupCollection } from '@/components/setup/setup-collection';
import { SubscriptionRow } from '@/components/subscriptions/subscription-row';

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
      title="Add your subscriptions"
      subtitle="Netflix, Spotify, the gym — add every one that renews on its own, one at a time."
      emptyText="Your subscriptions show up here as you add them."
      noun="subscription"
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
          domain={subscription.brands?.domain}
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
