import { router } from 'expo-router';
import { ChevronRight, Plus, Repeat } from 'lucide-react-native';
import { Fragment, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { useArtwork } from '@/theme/artwork';
import { useLedger, usePaymentSources, useSubscriptions } from '@/api/queries';
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
 * What the subscriptions have actually cost, over a window you choose.
 *
 * Same shape as the bills page, for the same reason: the plans live one tap
 * away and this lists the times each one renewed. A plan cancelled in March
 * still shows the months it ran, which is the whole point of looking back.
 */
export default function SubscriptionsScreen() {
  const artwork = useArtwork();
  const moneyColor = useMoneyColor();
  const [rangeKey, setRangeKey] = useState<RangeKey>('month');
  const today = toIsoDate(new Date());
  const range = useMemo(() => rangeFor(rangeKey, new Date()), [rangeKey]);

  const plans = useSubscriptions();
  const { entries, isLoading, isError, refetch } = useLedger(range, today);
  const { sources } = usePaymentSources();

  const sourceLabels = useMemo(
    () => new Map(sources.map((source) => [source.id, source.label])),
    [sources],
  );

  const charges = useMemo(
    () => entries.filter((entry) => entry.kind === 'subscription'),
    [entries],
  );
  const total = charges.reduce((sum, entry) => sum + entry.amount, 0);

  const groups = useMemo(
    () => groupByDate(charges, (entry) => entry.date, { amountOf: (e) => e.amount }),
    [charges],
  );

  const planCount = plans.data?.length ?? 0;

  return (
    <Screen showBack onRefresh={refetch}>
      <Title align="left" className="mt-1 w-full">
        Subscriptions
      </Title>

      <View className="mt-5 w-full flex-row gap-3">
        <Tile
          icon={Repeat}
          title="Your plans"
          caption={planCount === 1 ? '1 subscription' : `${planCount} subscriptions`}
          onPress={() => router.push('/subscription-plans')}
          showChevron
        />
        <Tile
          icon={Plus}
          title="Add plan"
          caption="Track a new one"
          onPress={() => router.push('/add-subscription')}
        />
      </View>

      {/* One number, and the window it belongs to, side by side — the figure is
          meaningless without knowing which stretch of time it covers. */}
      <View className="mt-4 w-full rounded-[16px] bg-ink/[0.035] px-4 py-4">
        <View className="w-full flex-row items-start justify-between gap-3">
          <View className="min-w-0 flex-1">
            <Text className="font-poppins text-[13px] text-muted" maxFontSizeMultiplier={1.3}>
              Renewals charged
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
          title="Could not load your subscriptions"
          message="Check your connection and try again. Nothing has been lost."
          actionLabel="Try again"
          onAction={refetch}
        />
      ) : null}

      {!isLoading && !isError && charges.length === 0 ? (
        <PageState
          art={artwork.emptySubscriptions}
          title={planCount === 0 ? 'No subscriptions yet' : 'Nothing in this window'}
          message={
            planCount === 0
              ? 'Add the ones you pay for and every renewal shows up here as it happens.'
              : 'Nothing renewed in this stretch of time. Try a wider window.'
          }
          actionLabel={planCount === 0 ? 'Add a subscription' : undefined}
          onAction={planCount === 0 ? () => router.push('/add-subscription') : undefined}
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
                    kind="subscription"
                    domain={entry.domain}
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

/** Compact pair at the top: the plans behind this page, and a way to add. */
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
