import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { useDeleteSubscription } from '@/api/mutations';
import { usePastCharges, type PastRead } from '@/api/past-charges';
import { usePaymentSources, useSubscriptions } from '@/api/queries';
import { BrandMark } from '@/components/brands/brand-mark';
import { ChangeLogoButton } from '@/components/brands/change-logo-button';
import { PlanDetail, type PlanDetailRow } from '@/components/plans/plan-detail';
import { cycleLabel } from '@/components/subscriptions/subscription-row';
import { t } from '@/i18n';
import { formatFullDate } from '@/lib/date';
import { failureMessage } from '@/lib/failure';
import { warn } from '@/lib/haptics';
import { logoDomainOf } from '@/lib/logo-domain';
import { useDialog } from '@/providers/dialog-provider';
import { useToast } from '@/providers/toast-context';

const asDate = (iso: string) => formatFullDate(new Date(`${iso}T00:00:00`));

/**
 * One subscription: its details, its paid and upcoming renewals, and the pencil to edit it. A
 * cancelled one is final: no pencil, and Delete on the page.
 */
export default function SubscriptionDetailScreen() {
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const subscriptions = useSubscriptions();
  const { sources } = usePaymentSources();
  const pastCharges = usePastCharges('subscription', id || undefined);
  const deleteSubscription = useDeleteSubscription();
  const ask = useDialog();
  const toast = useToast();
  // Held from the press until the subscription is gone: the page leaves once the list lacks it.
  const [deleting, setDeleting] = useState(false);
  // While the charges are read before the question: Delete waits.
  const [readingPast, setReadingPast] = useState(false);

  const subscription = subscriptions.data
    ? (subscriptions.data.find((row) => row.id === id) ?? null)
    : undefined;
  const cancelled = subscription ? !subscription.active : false;

  const remove = async () => {
    if (!subscription || deleting || readingPast) return;
    // The question counts the charges, so it waits for them.
    setReadingPast(true);
    let past: PastRead;
    try {
      past = await pastCharges.load();
    } catch (thrown) {
      setReadingPast(false);
      warn();
      await ask({ title: failureMessage(thrown) });
      return;
    }
    setReadingPast(false);
    const choice = await pastCharges.chooseDelete(subscription.name, { stopped: true }, past);
    if (choice !== 'everything') return;
    setDeleting(true);
    try {
      await deleteSubscription.mutateAsync(id);
      toast('toast.subscription.deleted', 'deleted');
    } catch (thrown) {
      setDeleting(false);
      warn();
      await ask({ title: failureMessage(thrown) });
    }
  };

  const details: PlanDetailRow[] = [];
  if (subscription) {
    const source = sources.find(
      (option) => option.id === (subscription.card_id ?? subscription.bank_account_id),
    );
    // A cancelled one says so under its amount, with the last day it charged.
    if (!cancelled) {
      details.push({
        label: t('subscriptions.detail.nextRenewal'),
        value: subscription.next_renewal_on
          ? asDate(subscription.next_renewal_on)
          : t('dates.noDate'),
      });
    }
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
        !subscription
          ? ''
          : !cancelled
            ? cycleLabel(subscription.cycle)
            : pastCharges.lastChargedOn
              ? t('subscriptions.cancelledLastCharged', {
                  date: asDate(pastCharges.lastChargedOn),
                })
              : t('subscriptions.cancelled')
      }
      details={details}
      editHref={`/add-subscription?id=${id}`}
      stopped={
        cancelled
          ? {
              label: deleting
                ? t('subscriptions.add.deleting')
                : t('subscriptions.add.deleteSubscription'),
              busy: deleting || readingPast,
              onDelete: () => void remove(),
            }
          : undefined
      }
    />
  );
}
