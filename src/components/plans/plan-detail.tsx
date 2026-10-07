import { router } from 'expo-router';
import { Pencil } from 'lucide-react-native';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Text, View } from 'react-native';

import { useLedger, type LedgerEntry } from '@/api/queries';
import { hidOlder } from '@/lib/allowance';
import { ChargeSection, DetailCard, type PlanDetailRow } from '@/components/plans/detail-parts';
import { HistoryNotice } from '@/components/pro/history-notice';
import { goBack } from '@/components/ui/back-button';
import { ChoiceChips } from '@/components/ui/choice-chips';
import { PageState } from '@/components/ui/page-state';
import { Screen } from '@/components/ui/screen';
import { SkeletonList } from '@/components/ui/skeleton';
import { t } from '@/i18n';
import { toIsoDate } from '@/lib/date';
import { failureText } from '@/lib/failure';
import { formatCurrency } from '@/lib/format';
import { rangeFor } from '@/lib/range';
import { useMoneyColor } from '@/providers/theme-provider';
import { useArtwork } from '@/theme/artwork';
import { TEXT_CAP } from '@/theme/text-scale';

type Window = 'month' | 'year';

/**
 * Whole calendar months and years, so each runs forward as well as back: this page is as much "what
 * is coming" as "what went". No All, since a plan's whole history is a list nobody reads to the
 * end.
 */
const WINDOWS = [
  {
    value: 'month',
    get label() {
      return t('dates.month');
    },
  },
  {
    value: 'year',
    get label() {
      return t('dates.year');
    },
  },
] as const;

export type { PlanDetailRow };

type PlanDetailProps = {
  kind: 'bill' | 'subscription';
  id: string;
  /** The plan, once loaded; null when the id matches nothing (deleted). */
  plan: { name: string; amount: number } | null | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  /** The bill's icon or the subscription's logo. */
  mark: ReactNode;
  /** "Monthly", "Every 3 months", "Cancelled", already in the language on screen. */
  frequency: string;
  details: PlanDetailRow[];
  editHref: string;
};

/**
 * One bill or subscription, whole: what it is, what it has cost and what is still to come. The
 * charges on Monthly bills and Subscriptions open here, and so do the lists in Settings. The header
 * pencil opens the edit flow, Delete included.
 */
export function PlanDetail({
  kind,
  id,
  plan,
  isLoading,
  isError,
  onRetry,
  mark,
  frequency,
  details,
  editHref,
}: PlanDetailProps) {
  const artwork = useArtwork();
  const moneyColor = useMoneyColor();
  const [windowKey, setWindowKey] = useState<Window>('year');

  const today = toIsoDate(new Date());
  // Keyed on the day, not the Date, so the window is not rebuilt every render.
  const range = useMemo(
    () => rangeFor(windowKey, new Date(`${today}T00:00:00`)),
    [windowKey, today],
  );
  const ledger = useLedger(range, today);
  // Free lists 90 days back: say this plan's older charges are kept rather than look like none.
  const hiddenOlder = hidOlder(ledger.hidden, kind, id);

  const charges = useMemo(
    () => ledger.entries.filter((entry) => entry.kind === kind && entry.planId === id),
    [ledger.entries, kind, id],
  );
  // One timeline, oldest at the top: Paid, then Upcoming, so today falls where the two lists meet.
  const byDate = (a: LedgerEntry, b: LedgerEntry) => a.date.localeCompare(b.date);
  const paid = useMemo(() => charges.filter((c) => c.date <= today).sort(byDate), [charges, today]);
  const upcoming = useMemo(
    () => charges.filter((c) => c.date > today).sort(byDate),
    [charges, today],
  );

  // Deleted from its own edit flow: that flow steps back to here, and there is
  // nothing left to show, so take one more step back to the list it came from.
  const gone = !isLoading && !isError && plan === null;
  useEffect(() => {
    if (gone) goBack();
  }, [gone]);

  if (isLoading || gone) {
    return (
      <Screen showBack>
        <SkeletonList rows={4} />
      </Screen>
    );
  }

  if (isError || !plan) {
    return (
      <Screen showBack>
        <PageState
          art={artwork.error}
          title={failureText()}
          actionLabel={t('common.tryAgain')}
          onAction={onRetry}
        />
      </Screen>
    );
  }

  return (
    <Screen
      title={plan.name}
      showBack
      onRefresh={() => {
        onRetry();
        ledger.refetch();
      }}
      headerActions={[
        {
          icon: Pencil,
          label: t('bills.planDetail.edit', { name: plan.name }),
          onPress: () => router.push(editHref as never),
        },
      ]}
    >
      <DetailCard
        mark={mark}
        amount={formatCurrency(Math.abs(plan.amount))}
        subtitle={frequency}
        rows={details}
      />

      <View className="mt-7 w-full">
        <ChoiceChips options={WINDOWS} value={windowKey} onChange={setWindowKey} />
      </View>

      {ledger.isLoading ? <SkeletonList rows={4} /> : null}

      {ledger.isError ? (
        <PageState
          art={artwork.error}
          title={failureText()}
          actionLabel={t('common.tryAgain')}
          onAction={ledger.refetch}
        />
      ) : null}

      {!ledger.isLoading && !ledger.isError && hiddenOlder ? (
        <HistoryNotice className="mt-6" />
      ) : null}

      {!ledger.isLoading && !ledger.isError && charges.length === 0 && !hiddenOlder ? (
        <Text
          className="mt-6 w-full text-center font-app text-[14px] text-muted"
          maxFontSizeMultiplier={TEXT_CAP.reading}
        >
          {t(
            kind === 'bill'
              ? 'bills.planDetail.noChargesBill'
              : 'bills.planDetail.noChargesSubscription',
          )}
        </Text>
      ) : null}

      {!ledger.isLoading && !ledger.isError ? (
        <View className="w-full pb-10">
          <ChargeSection
            title={t('bills.planDetail.paid')}
            entries={paid}
            status={() => t('bills.planDetail.paidRow')}
            moneyColor={moneyColor}
            testID="charges-paid"
          />
          <ChargeSection
            title={t('bills.planDetail.upcoming')}
            entries={upcoming}
            status={() => t('bills.planDetail.due')}
            moneyColor={moneyColor}
            testID="charges-upcoming"
          />
        </View>
      ) : null}
    </Screen>
  );
}
