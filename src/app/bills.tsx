import { router } from 'expo-router';
import { ChevronRight, Plus, ReceiptText } from 'lucide-react-native';
import { Fragment, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { useArtwork } from '@/theme/artwork';
import { useBills, useLedger, usePaymentSources } from '@/api/queries';
import { TransactionRow } from '@/components/dashboard/transaction-row';
import { DateGroupHeader } from '@/components/ui/date-group-header';
import { PageState } from '@/components/ui/page-state';
import { RangeDropdown } from '@/components/ui/range-dropdown';
import { Screen } from '@/components/ui/screen';
import { SkeletonList } from '@/components/ui/skeleton';
import { Title } from '@/components/ui/typography';
import { toIsoDate } from '@/lib/date';
import { formatCurrency } from '@/lib/format';
import { groupByDate } from '@/lib/group';
import { rangeFor, type RangeKey } from '@/lib/range';
import { useColors, useMoneyColor } from '@/providers/theme-provider';
import { shadows } from '@/theme/shadows';

/**
 * What the bills have actually cost, over a window you choose.
 *
 * The schedule itself lives one tap away, on its own page. This one answers
 * the question the app exists for — where the money went — so it lists the
 * times a bill landed rather than the bills that produce them. A monthly bill
 * is one line here per month it has run, not one line forever.
 */
export default function BillsScreen() {
  const artwork = useArtwork();
  const moneyColor = useMoneyColor();
  const [rangeKey, setRangeKey] = useState<RangeKey>('month');
  const today = toIsoDate(new Date());
  const range = useMemo(() => rangeFor(rangeKey, new Date()), [rangeKey]);

  const plans = useBills();
  const { entries, isLoading, isError, refetch } = useLedger(range, today);
  const { sources } = usePaymentSources();

  const sourceLabels = useMemo(
    () => new Map(sources.map((source) => [source.id, source.label])),
    [sources],
  );

  const charges = useMemo(() => entries.filter((entry) => entry.kind === 'bill'), [entries]);
  const total = charges.reduce((sum, entry) => sum + entry.amount, 0);

  const groups = useMemo(
    () => groupByDate(charges, (entry) => entry.date, { amountOf: (e) => e.amount }),
    [charges],
  );

  const planCount = plans.data?.length ?? 0;

  return (
    <Screen showBack onRefresh={refetch}>
      <Title align="left" className="mt-1 w-full">
        Monthly bills
      </Title>

      <View className="mt-5 w-full flex-row gap-3">
        <Tile
          icon={ReceiptText}
          title="Your bills"
          caption={planCount === 1 ? '1 recurring' : `${planCount} recurring`}
          onPress={() => router.push('/bill-plans')}
          showChevron
        />
        <Tile
          icon={Plus}
          title="Add bill"
          caption="Set up a new one"
          onPress={() => router.push('/add-bill')}
        />
      </View>

      {/* One number, and the window it belongs to, side by side — the figure is
          meaningless without knowing which stretch of time it covers. */}
      <View className="mt-4 w-full rounded-[16px] bg-ink/[0.035] px-4 py-4">
        <View className="w-full flex-row items-start justify-between gap-3">
          <View className="min-w-0 flex-1">
            <Text className="font-poppins text-[13px] text-muted" maxFontSizeMultiplier={1.3}>
              Bills charged
            </Text>
            <Text
              className="mt-0.5 font-poppins-bold text-[26px]"
              style={{ color: moneyColor(total) }}
              numberOfLines={1}
              adjustsFontSizeToFit
              maxFontSizeMultiplier={1.2}
            >
              {formatCurrency(total)}
            </Text>
          </View>
          <RangeDropdown value={rangeKey} onChange={setRangeKey} />
        </View>

        <Text className="mt-2 font-poppins text-[12px] text-muted" maxFontSizeMultiplier={1.2}>
          {charges.length === 0
            ? 'Nothing in this window'
            : `${charges.length} ${charges.length === 1 ? 'charge' : 'charges'}`}
        </Text>
      </View>

      {isLoading ? <SkeletonList rows={5} /> : null}

      {isError ? (
        <PageState
          art={artwork.error}
          title="Could not load your bills"
          message="Check your connection and try again. Nothing has been lost."
          actionLabel="Try again"
          onAction={refetch}
        />
      ) : null}

      {!isLoading && !isError && charges.length === 0 ? (
        <PageState
          art={artwork.emptyBills}
          title={planCount === 0 ? 'No bills yet' : 'Nothing in this window'}
          message={
            planCount === 0
              ? 'Add the ones that repeat — rent, power, phone — and each time one lands it shows up here.'
              : 'Your bills have not landed in this stretch of time. Try a wider window.'
          }
          actionLabel={planCount === 0 ? 'Add a bill' : undefined}
          onAction={planCount === 0 ? () => router.push('/add-bill') : undefined}
        />
      ) : null}

      {!isLoading && !isError && charges.length > 0 ? (
        <View className="w-full pb-10">
          {groups.map((group) => (
            <View key={group.date || 'undated'} className="w-full">
              <DateGroupHeader date={group.date} today={today} total={group.total} />
              {group.items.map((entry, index) => (
                <Fragment key={entry.id}>
                  {index > 0 ? <View className="ml-13 h-px bg-line/60" /> : null}
                  <TransactionRow
                    label={entry.label}
                    amount={entry.amount}
                    kindLabel={sourceLabels.get(entry.sourceId) ?? 'No payment method'}
                    kind="bill"
                    categoryId={entry.categoryId}
                    iconId={entry.iconId}
                  />
                </Fragment>
              ))}
            </View>
          ))}
        </View>
      ) : null}
    </Screen>
  );
}

type TileProps = {
  icon: typeof Plus;
  title: string;
  caption: string;
  onPress: () => void;
  showChevron?: boolean;
};

/** Compact pair at the top: the schedule behind this page, and a way to add. */
function Tile({ icon: Icon, title, caption, onPress, showChevron }: TileProps) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${caption}.`}
      onPress={onPress}
      style={shadows.raised}
      className="flex-1 rounded-[16px] bg-card p-4 active:opacity-70"
    >
      <View className="w-full flex-row items-center justify-between gap-2">
        <View className="h-9 w-9 items-center justify-center rounded-full bg-ink/5">
          <Icon size={18} color={colors.ink} strokeWidth={2} />
        </View>
        {showChevron ? <ChevronRight size={18} color={colors.muted} strokeWidth={2} /> : null}
      </View>

      <Text
        className="mt-3 font-poppins-medium text-[15px] text-ink"
        numberOfLines={1}
        maxFontSizeMultiplier={1.2}
      >
        {title}
      </Text>
      <Text
        className="mt-0.5 font-poppins text-[12px] text-muted"
        numberOfLines={1}
        maxFontSizeMultiplier={1.2}
      >
        {caption}
      </Text>
    </Pressable>
  );
}
