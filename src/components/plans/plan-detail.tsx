import { router } from 'expo-router';
import { Pencil } from 'lucide-react-native';
import { Fragment, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Text, View } from 'react-native';

import { useLedger, type LedgerEntry } from '@/api/queries';
import { goBack } from '@/components/ui/back-button';
import { ChoiceChips } from '@/components/ui/choice-chips';
import { PageState } from '@/components/ui/page-state';
import { Screen } from '@/components/ui/screen';
import { SkeletonList } from '@/components/ui/skeleton';
import { SectionHeading } from '@/components/ui/typography';
import { formatFullDate, toIsoDate } from '@/lib/date';
import { FAILURE_MESSAGE } from '@/lib/failure';
import { formatCurrency } from '@/lib/format';
import { rangeFor } from '@/lib/range';
import { useMoneyColor } from '@/providers/theme-provider';
import { useArtwork } from '@/theme/artwork';

type Window = 'month' | 'year';

/**
 * Whole calendar months and years, so each runs forward as well as back: this
 * page is as much "what is coming" as "what went". No All (Founder,
 * 2026-10-03) — a plan's whole history is a list nobody reads to the end.
 */
const WINDOWS = [
  { value: 'month', label: 'Month' },
  { value: 'year', label: 'Year' },
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
  /** "Monthly", "Every 3 months", "Cancelled". */
  frequency: string;
  details: PlanDetailRow[];
  editHref: string;
};

/**
 * One bill or subscription, whole: what it is, what it has cost and what is
 * still to come (the Founder's design, 2026-10-03). The charges on Monthly
 * bills and Subscriptions open here, and so do the lists in Settings, so a
 * plan reads the same wherever it is tapped. Changing it is the pencil in the
 * header, which opens the same edit flow as before — Delete included.
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
  // One timeline, oldest at the top: Paid, then Upcoming (Founder,
  // 2026-10-03), so today falls where the two lists meet.
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

  const noun = kind === 'bill' ? 'bill' : 'subscription';

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
          title={FAILURE_MESSAGE}
          actionLabel="Try again"
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
        { icon: Pencil, label: `Edit ${plan.name}`, onPress: () => router.push(editHref as never) },
      ]}
    >
      {/* What it is: the mark, what it costs and how often, then the facts. */}
      <View className="mt-3 w-full items-center rounded-[16px] border border-line bg-card px-5 pb-2 pt-5">
        {mark}
        <Text
          className="mt-3 font-poppins-bold text-[28px] text-ink"
          numberOfLines={1}
          adjustsFontSizeToFit
          maxFontSizeMultiplier={1.2}
        >
          {formatCurrency(Math.abs(plan.amount))}
        </Text>
        <Text className="font-poppins text-[14px] text-muted" maxFontSizeMultiplier={1.3}>
          {frequency}
        </Text>

        <View className="mt-4 w-full">
          {details.map((row, index) => (
            <View
              key={row.label}
              className={`w-full flex-row items-start justify-between gap-4 py-3 ${index > 0 ? 'border-t border-line/60' : ''}`}
            >
              <Text className="font-poppins text-[14px] text-muted" maxFontSizeMultiplier={1.3}>
                {row.label}
              </Text>
              <Text
                className="min-w-0 flex-1 text-right font-poppins-medium text-[14px] text-ink"
                maxFontSizeMultiplier={1.3}
              >
                {row.value}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <View className="mt-7 w-full">
        <ChoiceChips options={WINDOWS} value={windowKey} onChange={setWindowKey} />
      </View>

      {ledger.isLoading ? <SkeletonList rows={4} /> : null}

      {ledger.isError ? (
        <PageState
          art={artwork.error}
          title={FAILURE_MESSAGE}
          actionLabel="Try again"
          onAction={ledger.refetch}
        />
      ) : null}

      {!ledger.isLoading && !ledger.isError && charges.length === 0 ? (
        <Text
          className="mt-6 w-full text-center font-poppins text-[14px] text-muted"
          maxFontSizeMultiplier={1.4}
        >
          No charges for this {noun} in this window.
        </Text>
      ) : null}

      {!ledger.isLoading && !ledger.isError ? (
        <View className="w-full pb-10">
          <ChargeSection title="Paid" entries={paid} moneyColor={moneyColor} />
          <ChargeSection title="Upcoming" entries={upcoming} moneyColor={moneyColor} />
        </View>
      ) : null}
    </Screen>
  );
}

function ChargeSection({
  title,
  entries,
  moneyColor,
}: {
  title: 'Upcoming' | 'Paid';
  entries: LedgerEntry[];
  moneyColor: (amount: number) => string;
}) {
  if (entries.length === 0) return null;
  const total = entries.reduce((sum, entry) => sum + entry.amount, 0);

  return (
    <View className="mt-6 w-full">
      <SectionHeading caption={`${entries.length} · ${formatCurrency(Math.abs(total))}`}>
        {title}
      </SectionHeading>
      <View className="mt-2 w-full overflow-hidden rounded-[16px] border border-line bg-card">
        {entries.map((entry, index) => (
          <Fragment key={entry.id}>
            {index > 0 ? <View className="ml-4 h-px bg-line/60" /> : null}
            <View className="min-h-14 w-full flex-row items-center justify-between gap-3 px-4 py-3">
              <View className="min-w-0 flex-1">
                <Text
                  className="font-poppins-medium text-[15px] text-ink"
                  numberOfLines={1}
                  maxFontSizeMultiplier={1.3}
                >
                  {formatFullDate(new Date(`${entry.date}T00:00:00`))}
                </Text>
                <Text className="font-poppins text-[12px] text-muted" maxFontSizeMultiplier={1.3}>
                  {title === 'Paid' ? 'Paid' : 'Due'}
                </Text>
              </View>
              <Text
                className="font-poppins-semibold text-[15px] text-ink"
                style={{ color: moneyColor(entry.amount) }}
                maxFontSizeMultiplier={1.3}
              >
                {formatCurrency(entry.amount)}
              </Text>
            </View>
          </Fragment>
        ))}
      </View>
    </View>
  );
}
