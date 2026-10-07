import { router } from 'expo-router';
import { Pencil } from 'lucide-react-native';
import { Fragment, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Text, View } from 'react-native';

import { useLedger, type LedgerEntry } from '@/api/queries';
import { goBack } from '@/components/ui/back-button';
import { ChoiceChips } from '@/components/ui/choice-chips';
import { FitFigure, FitRows, FitText, useGroupFits } from '@/components/ui/fit-group';
import { PageState } from '@/components/ui/page-state';
import { Screen } from '@/components/ui/screen';
import { SkeletonList } from '@/components/ui/skeleton';
import { SectionHeading } from '@/components/ui/typography';
import { t } from '@/i18n';
import { cn } from '@/lib/cn';
import { formatFullDate, toIsoDate } from '@/lib/date';
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

export type PlanDetailRow = { label: string; value: string };

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
      <View className="mt-3 w-full items-center rounded-[16px] border border-line bg-card px-5 pb-2 pt-5">
        {mark}
        <FitFigure
          id="plan-amount"
          size={28}
          className="text-center font-app-bold text-ink"
          boxClassName="mt-3"
        >
          {formatCurrency(Math.abs(plan.amount))}
        </FitFigure>
        <Text
          className="text-center font-app text-[14px] text-muted"
          maxFontSizeMultiplier={TEXT_CAP.control}
        >
          {frequency}
        </Text>

        <FitRows className="mt-4 w-full" testID="plan-details">
          {details.map((row, index) => (
            <DetailRow key={row.label} id={`detail-${index}`} row={row} divider={index > 0} />
          ))}
        </FitRows>
      </View>

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

      {!ledger.isLoading && !ledger.isError && charges.length === 0 ? (
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
          <ChargeSection when="paid" entries={paid} moneyColor={moneyColor} />
          <ChargeSection when="upcoming" entries={upcoming} moneyColor={moneyColor} />
        </View>
      ) : null}
    </Screen>
  );
}

/**
 * A fact about the plan. Side by side, the label keeps its own width and the value wraps in the rest;
 * once a word of either cannot fit, every row in the card puts its value under its label.
 */
function DetailRow({ id, row, divider }: { id: string; row: PlanDetailRow; divider: boolean }) {
  const stacked = !useGroupFits();
  return (
    <View
      className={cn(
        'w-full py-3',
        divider && 'border-t border-line/60',
        stacked ? 'items-start' : 'flex-row items-start justify-between gap-4',
      )}
    >
      <FitText
        id={`${id}-label`}
        role="row"
        size={14}
        className="font-app text-muted"
        slotClassName={stacked ? 'w-full' : 'shrink'}
      >
        {row.label}
      </FitText>
      <FitText
        id={`${id}-value`}
        role="row"
        size={14}
        className={cn('font-app-medium text-ink', !stacked && 'text-right')}
        slotClassName={stacked ? 'mt-0.5 w-full' : 'min-w-0 flex-1'}
      >
        {row.value}
      </FitText>
    </View>
  );
}

function ChargeSection({
  when,
  entries,
  moneyColor,
}: {
  when: 'paid' | 'upcoming';
  entries: LedgerEntry[];
  moneyColor: (amount: number) => string;
}) {
  if (entries.length === 0) return null;
  const total = entries.reduce((sum, entry) => sum + entry.amount, 0);

  return (
    <View className="mt-6 w-full">
      <SectionHeading caption={`${entries.length} · ${formatCurrency(Math.abs(total))}`}>
        {t(when === 'paid' ? 'bills.planDetail.paid' : 'bills.planDetail.upcoming')}
      </SectionHeading>
      <FitRows
        className="mt-2 w-full overflow-hidden rounded-[16px] border border-line bg-card"
        testID={`charges-${when}`}
      >
        {entries.map((entry, index) => (
          <Fragment key={entry.id}>
            {index > 0 ? <View className="ml-4 h-px bg-line/60" /> : null}
            <ChargeRow
              entry={entry}
              status={t(when === 'paid' ? 'bills.planDetail.paidRow' : 'bills.planDetail.due')}
              color={moneyColor(entry.amount)}
            />
          </Fragment>
        ))}
      </FitRows>
    </View>
  );
}

/** A charge's date and amount; stacked with the rest of its card, the amount goes under the date. */
function ChargeRow({
  entry,
  status,
  color,
}: {
  entry: LedgerEntry;
  status: string;
  color: string;
}) {
  const stacked = !useGroupFits();
  const amount = (
    <FitText
      id={`${entry.id}-amount`}
      hug
      role="row"
      size={15}
      className="font-app-semibold text-ink"
      style={{ color }}
      slotClassName={stacked ? 'mt-0.5' : 'shrink-0'}
    >
      {formatCurrency(entry.amount)}
    </FitText>
  );

  return (
    <View className="min-h-14 w-full flex-row items-center justify-between gap-3 px-4 py-3">
      <View className="min-w-0 flex-1 items-start">
        <FitText
          id={`${entry.id}-date`}
          role="row"
          size={15}
          className="font-app-medium text-ink"
          slotClassName="w-full"
        >
          {formatFullDate(new Date(`${entry.date}T00:00:00`))}
        </FitText>
        {stacked ? amount : null}
        <Text className="font-app text-[12px] text-muted" maxFontSizeMultiplier={TEXT_CAP.row}>
          {status}
        </Text>
      </View>
      {stacked ? null : amount}
    </View>
  );
}
