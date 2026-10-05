import { router } from 'expo-router';
import { ArrowRight, ChevronRight } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { useSpendCategories } from '@/api/brands';
import {
  savedFor,
  useCards,
  useLedger,
  useMonthlySavings,
  useSalarySources,
  useSourceBalances,
  useSubscriptions,
} from '@/api/queries';
import { useRefreshAll } from '@/api/refresh';
import { useMyBalances } from '@/api/splits';
import { BillMark } from '@/components/bills/bill-mark';
import { BrandMark } from '@/components/brands/brand-mark';
import { FlowChart, type FlowBucket } from '@/components/transactions/flow-chart';
import { ActionPill } from '@/components/ui/action-pill';
import { ChoiceChips } from '@/components/ui/choice-chips';
import { useProGate } from '@/components/pro/pro-gate';
import { PageState } from '@/components/ui/page-state';
import { Screen } from '@/components/ui/screen';
import { SkeletonList } from '@/components/ui/skeleton';
import { SectionHeading } from '@/components/ui/typography';
import { BILL_CATEGORIES } from '@/data/bills-mock';
import { toIsoDate } from '@/lib/date';
import { formatCurrency } from '@/lib/format';
import { sortByDateAscending } from '@/lib/group';
import { PERIODS, periodBuckets, periodRange, type PeriodKey } from '@/lib/period';
import { useColors } from '@/providers/theme-provider';
import { useArtwork } from '@/theme/artwork';
import { FAILURE_MESSAGE } from '@/lib/failure';

const PER_MONTH: Record<string, number> = {
  weekly: 52 / 12,
  biweekly: 26 / 12,
  semimonthly: 2,
  monthly: 1,
};

/**
 * All the figures side by side. It reads rather than computes: every number comes from the same
 * hooks as the screen that owns it, so this page cannot disagree with them.
 */
export default function InsightsScreen() {
  // Wrapper, not inline: an early return above the screen's own hooks would change the hook count
  // when the entitlement answer lands.
  const gate = useProGate('insights');
  if (gate) return gate;
  return <InsightsScreenInner />;
}

function InsightsScreenInner() {
  const colors = useColors();
  const artwork = useArtwork();

  const [periodKey, setPeriodKey] = useState<PeriodKey>('month');
  const anchor = useMemo(() => new Date(), []);
  const today = toIsoDate(anchor);

  // Cut off at today: the page is a record of what happened, not a projection.
  const range = useMemo(() => {
    const period = periodRange(periodKey, anchor);
    return { from: period.from, to: period.to > today ? today : period.to };
  }, [periodKey, anchor, today]);

  const ledger = useLedger(range, today);
  const { entries, totals, isLoading } = ledger;
  const { refresh, refreshing } = useRefreshAll();

  const cards = useCards();
  const salary = useSalarySources();
  const savings = useMonthlySavings();
  const subscriptions = useSubscriptions();
  const groups = useMyBalances();
  const categoriesQuery = useSpendCategories();
  const groupBalances = groups.data;
  const spendCategories = useMemo(() => categoriesQuery.data ?? [], [categoriesQuery.data]);
  const { balances, isError: balancesError, refetch: refetchBalances } = useSourceBalances(today);

  /**
   * Any one failing poisons every total: the figures are differences, so a failed query reads as a
   * smaller number that looks like good news. No figure renders until every source has answered.
   */
  const isError =
    ledger.isError ||
    cards.isError ||
    salary.isError ||
    savings.isError ||
    subscriptions.isError ||
    groups.isError ||
    categoriesQuery.isError ||
    // A failed balance walk falls back to the figure typed when the card was added.
    balancesError;

  const retry = () => {
    ledger.refetch();
    cards.refetch();
    salary.refetch();
    savings.refetch();
    subscriptions.refetch();
    groups.refetch();
    categoriesQuery.refetch();
    refetchBalances();
  };

  const savedTotal = (savings.data ?? []).reduce((sum, month) => sum + savedFor(month), 0);
  const owedOnCards = (cards.data ?? []).reduce(
    (sum, card) => sum + Math.abs(balances.get(card.id) ?? card.balance),
    0,
  );

  // Positive is owed to you, negative is owed by you.
  const splitPosition = useMemo(
    () => [...(groupBalances?.values() ?? [])].reduce((sum, balance) => sum + balance, 0),
    [groupBalances],
  );

  const worth = savedTotal - owedOnCards + splitPosition;

  const monthlyIncome = (salary.data ?? []).reduce(
    (sum, source) => sum + source.amount * (PER_MONTH[source.frequency] ?? 1),
    0,
  );

  const buckets = useMemo(() => periodBuckets(periodKey, anchor), [periodKey, anchor]);

  const chartBuckets = useMemo<FlowBucket[]>(
    () =>
      buckets.map((bucket) => ({
        key: bucket.key,
        label: bucket.label,
        // Spending only, so every bar measures one thing.
        spent: entries
          .filter((entry) => entry.date >= bucket.from && entry.date <= bucket.to)
          .reduce((sum, entry) => sum + (entry.amount < 0 ? Math.abs(entry.amount) : 0), 0),
      })),
    [buckets, entries],
  );

  const byKind = useMemo(() => {
    const out = new Map<string, number>();
    for (const entry of entries) {
      if (entry.amount >= 0) continue;
      out.set(entry.kind, (out.get(entry.kind) ?? 0) + Math.abs(entry.amount));
    }
    return out;
  }, [entries]);

  const categoryLabel = useMemo(() => {
    const labels = new Map<string, string>();
    for (const category of BILL_CATEGORIES) labels.set(category.id, category.label);
    for (const category of spendCategories) labels.set(category.id, category.label);
    return labels;
  }, [spendCategories]);

  const categories = useMemo(() => {
    const totalsByCategory = new Map<string, number>();
    for (const entry of entries) {
      if (entry.amount >= 0) continue;
      const key = entry.categoryId || 'other';
      totalsByCategory.set(key, (totalsByCategory.get(key) ?? 0) + Math.abs(entry.amount));
    }
    return [...totalsByCategory.entries()]
      .map(([id, amount]) => ({ id, label: categoryLabel.get(id) ?? 'Other', amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 6);
  }, [entries, categoryLabel]);

  const merchants = useMemo(() => {
    type Merchant = {
      amount: number;
      visits: number;
      domain?: string | null;
      kind: string;
      categoryId?: string | null;
      iconId?: string | null;
    };

    const byName = new Map<string, Merchant>();
    for (const entry of entries) {
      if (entry.amount >= 0) continue;
      const found = byName.get(entry.label);
      if (found) {
        found.amount += Math.abs(entry.amount);
        found.visits += 1;
        // Any row that knows the brand settles it for the group, not just the first.
        found.domain = found.domain ?? entry.domain;
        found.categoryId = found.categoryId ?? entry.categoryId;
        found.iconId = found.iconId ?? entry.iconId;
      } else {
        byName.set(entry.label, {
          amount: Math.abs(entry.amount),
          visits: 1,
          domain: entry.domain,
          kind: entry.kind,
          categoryId: entry.categoryId,
          iconId: entry.iconId,
        });
      }
    }

    return [...byName.entries()]
      .map(([name, value]) => ({ name, ...value }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }, [entries]);

  const biggest = categories[0]?.amount ?? 0;
  const busiest = merchants[0]?.amount ?? 0;

  const monthlySubs = (subscriptions.data ?? [])
    .filter((subscription) => subscription.active)
    .reduce((sum, subscription) => sum + subscription.amount, 0);

  /** The three most recent months, oldest first. Sorted by date, not by query order. */
  const recentMonths = useMemo(
    () =>
      sortByDateAscending(
        savings.data ?? [],
        (month) => month.month,
        (month) => month.month,
      ).slice(-3),
    [savings.data],
  );

  if (isError) {
    return (
      <Screen title="Insights" showBack onRefresh={refresh} refreshing={refreshing}>
        <PageState
          art={artwork.error}
          title={FAILURE_MESSAGE}
          actionLabel="Try again"
          onAction={retry}
        />
      </Screen>
    );
  }

  return (
    <Screen title="Insights" showBack onRefresh={refresh} refreshing={refreshing}>
      <Heading>Where you stand</Heading>
      <View className="w-full rounded-[16px] border border-line bg-card px-5 py-5">
        <Text className="font-poppins text-[13px] text-muted" maxFontSizeMultiplier={1.3}>
          Saved, less what you owe
        </Text>
        <Text
          className="mt-1 font-poppins-bold text-[34px] text-ink"
          numberOfLines={1}
          adjustsFontSizeToFit
          maxFontSizeMultiplier={1.2}
          style={worth < 0 ? { color: colors.moneyOut } : undefined}
        >
          {formatCurrency(worth)}
        </Text>

        <View className="mt-4 w-full gap-2.5">
          <StandRow label="Put aside" value={savedTotal} />
          <StandRow label="Owed on credit cards" value={-owedOnCards} />
          {splitPosition !== 0 ? (
            <StandRow
              label={splitPosition > 0 ? 'Owed to you by friends' : 'You owe friends'}
              value={splitPosition}
            />
          ) : null}
        </View>
      </View>

      <Heading>What comes in</Heading>
      {monthlyIncome > 0 ? (
        <View className="w-full rounded-[16px] border border-line bg-card px-5 py-5">
          <Text className="font-poppins text-[13px] text-muted" maxFontSizeMultiplier={1.3}>
            Every month
          </Text>
          <Text
            className="mt-1 font-poppins-bold text-[28px] text-ink"
            numberOfLines={1}
            adjustsFontSizeToFit
            maxFontSizeMultiplier={1.2}
          >
            {formatCurrency(monthlyIncome)}
          </Text>
          <Text className="mt-1 font-poppins text-[12px] text-muted" maxFontSizeMultiplier={1.3}>
            from {(salary.data ?? []).length}{' '}
            {(salary.data ?? []).length === 1 ? 'source' : 'sources'}
          </Text>
        </View>
      ) : (
        <Prompt
          title="Skip does not know what you earn yet"
          message="Adding your pay is what turns this page from a record of what you spent into a picture of what you can afford."
          actionLabel="Set up payday"
          onPress={() => router.push('/salary')}
        />
      )}

      <Heading>What goes out</Heading>
      <ChoiceChips
        options={PERIODS.map((period) => ({ value: period.value, label: period.label }))}
        value={periodKey}
        onChange={(next) => setPeriodKey(next as PeriodKey)}
      />

      {isLoading ? (
        <SkeletonList rows={3} />
      ) : (
        <>
          <View className="mt-4 w-full rounded-[16px] border border-line bg-card px-5 py-5">
            <Text className="font-poppins text-[13px] text-muted" maxFontSizeMultiplier={1.3}>
              {periodKey === 'all' ? 'All time' : `This ${periodKey}`}
            </Text>
            <Text
              className="mt-1 font-poppins-bold text-[30px] text-ink"
              numberOfLines={1}
              adjustsFontSizeToFit
              maxFontSizeMultiplier={1.2}
            >
              {formatCurrency(totals.out)}
            </Text>
            <View className="mt-4 w-full">
              <FlowChart buckets={chartBuckets} />
            </View>
          </View>

          <View className="mt-3 w-full rounded-[16px] border border-line bg-card px-5 py-4">
            <StandRow label="Shop receipts" value={-(byKind.get('receipt') ?? 0)} plain />
            <View className="h-2" />
            <StandRow label="Bills" value={-(byKind.get('bill') ?? 0)} plain />
            <View className="h-2" />
            <StandRow label="Subscriptions" value={-(byKind.get('subscription') ?? 0)} plain />
            <View className="my-3 h-px w-full bg-line" />
            <View className="w-full flex-row items-center justify-between gap-3">
              <Text
                className="font-poppins-semibold text-[15px] text-ink"
                maxFontSizeMultiplier={1.3}
              >
                Recorded in this period
              </Text>
              <Text className="font-poppins-bold text-[16px] text-ink" maxFontSizeMultiplier={1.3}>
                {formatCurrency(totals.out)}
              </Text>
            </View>
          </View>
        </>
      )}

      {categories.length > 0 ? (
        <>
          <Heading>Where it goes</Heading>
          <View className="w-full rounded-[16px] border border-line bg-card px-5 py-5">
            {categories.map((category, index) => (
              <View
                key={category.id}
                className={
                  index > 0 ? 'mt-4 flex-row items-center gap-3' : 'flex-row items-center gap-3'
                }
              >
                <BillMark categoryId={category.id} size={34} />
                <View className="min-w-0 flex-1">
                  <View className="w-full flex-row items-baseline justify-between gap-3">
                    <Text
                      className="min-w-0 flex-1 font-poppins-medium text-[14px] text-ink"
                      numberOfLines={1}
                      maxFontSizeMultiplier={1.3}
                    >
                      {category.label}
                    </Text>
                    <Text
                      className="font-poppins-semibold text-[14px] text-ink"
                      maxFontSizeMultiplier={1.3}
                    >
                      {formatCurrency(category.amount)}
                    </Text>
                  </View>
                  <View className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-ink/5">
                    <View
                      className="h-full rounded-full bg-accent"
                      style={{ width: `${biggest > 0 ? (category.amount / biggest) * 100 : 0}%` }}
                    />
                  </View>
                </View>
              </View>
            ))}
          </View>
        </>
      ) : null}

      {merchants.length > 0 ? (
        <>
          <Heading>Where you spend most</Heading>
          <View className="w-full rounded-[16px] border border-line bg-card px-5 py-5">
            {merchants.map((merchant, index) => (
              <View
                key={merchant.name}
                className={
                  index > 0 ? 'mt-4 flex-row items-center gap-3' : 'flex-row items-center gap-3'
                }
              >
                {merchant.kind === 'bill' ? (
                  <BillMark
                    categoryId={merchant.categoryId}
                    iconId={merchant.iconId}
                    domain={merchant.domain}
                    name={merchant.name}
                    size={40}
                  />
                ) : (
                  <BrandMark name={merchant.name} domain={merchant.domain} size={40} />
                )}
                <View className="min-w-0 flex-1">
                  <View className="w-full flex-row items-baseline justify-between gap-3">
                    <Text
                      className="min-w-0 flex-1 font-poppins-medium text-[14px] text-ink"
                      numberOfLines={1}
                      maxFontSizeMultiplier={1.3}
                    >
                      {merchant.name}
                    </Text>
                    <Text
                      className="font-poppins-semibold text-[14px] text-ink"
                      maxFontSizeMultiplier={1.3}
                    >
                      {formatCurrency(merchant.amount)}
                    </Text>
                  </View>
                  <View className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-ink/5">
                    <View
                      className="h-full rounded-full bg-accent"
                      style={{ width: `${busiest > 0 ? (merchant.amount / busiest) * 100 : 0}%` }}
                    />
                  </View>
                  <Text
                    className="mt-1 font-poppins text-[12px] text-muted"
                    maxFontSizeMultiplier={1.3}
                  >
                    {merchant.visits} {merchant.visits === 1 ? 'time' : 'times'}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </>
      ) : null}

      <Heading>Shared with others</Heading>
      <Row
        label={
          splitPosition === 0
            ? 'All settled up'
            : splitPosition > 0
              ? 'Friends owe you'
              : 'You owe friends'
        }
        value={splitPosition === 0 ? undefined : formatCurrency(Math.abs(splitPosition))}
        hint={`across ${groupBalances?.size ?? 0} ${(groupBalances?.size ?? 0) === 1 ? 'group' : 'groups'}`}
        onPress={() => router.push('/splits')}
      />

      <Heading>What you keep</Heading>
      {recentMonths.length > 0 ? (
        <View className="w-full rounded-[16px] border border-line bg-card px-5 py-4">
          {recentMonths.map((month, index) => (
            <View key={month.month} className={index > 0 ? 'mt-3' : undefined}>
              <StandRow
                label={new Date(`${month.month}T00:00:00`).toLocaleDateString(undefined, {
                  month: 'long',
                  year: 'numeric',
                })}
                value={savedFor(month)}
                plain
              />
            </View>
          ))}
          <View className="my-3 h-px w-full bg-line" />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="See every month"
            onPress={() => router.push('/savings')}
            className="min-h-11 w-full flex-row items-center justify-between active:opacity-70"
          >
            <Text className="font-poppins-medium text-[14px] text-ink" maxFontSizeMultiplier={1.3}>
              Every month
            </Text>
            <ChevronRight size={18} color={colors.muted} strokeWidth={2} />
          </Pressable>
        </View>
      ) : (
        <Prompt
          title="No finished months yet"
          message="When a month ends, whatever is left of it is added to your savings and shows up here."
          actionLabel="See savings"
          onPress={() => router.push('/savings')}
        />
      )}

      {(cards.data ?? []).length > 0 ? (
        <>
          <Heading>What you owe</Heading>
          <View className="w-full rounded-[16px] border border-line bg-card px-5 py-4">
            {(cards.data ?? []).map((card, index) => (
              <View key={card.id} className={index > 0 ? 'mt-3' : undefined}>
                <StandRow
                  label={`${card.holder}${card.last4 ? ` ${card.last4}` : ''}`}
                  value={-Math.abs(balances.get(card.id) ?? card.balance)}
                  plain
                />
              </View>
            ))}
          </View>
        </>
      ) : null}

      {monthlySubs > 0 ? (
        <>
          <Heading>Coming up</Heading>
          <Row
            label="Subscriptions"
            value={`${formatCurrency(monthlySubs)}/mo`}
            hint={`${formatCurrency(monthlySubs * 12)} over a year`}
            onPress={() => router.push('/subscriptions')}
          />
        </>
      ) : null}

      <View className="h-10 w-full" />
    </Screen>
  );
}

function Heading({ children }: { children: string }) {
  return <SectionHeading className="mb-3 mt-8">{children}</SectionHeading>;
}

/** A label and a signed figure. Money out is tinted, money in is not shouted about. */
function StandRow({
  label,
  value,
  plain = false,
}: {
  label: string;
  value: number;
  plain?: boolean;
}) {
  const colors = useColors();
  const negative = value < 0;

  return (
    <View className="w-full flex-row items-center justify-between gap-3">
      <Text
        className="min-w-0 flex-1 font-poppins text-[14px] text-muted"
        numberOfLines={1}
        maxFontSizeMultiplier={1.3}
      >
        {label}
      </Text>
      <Text
        className={
          plain
            ? 'font-poppins-medium text-[14px] text-ink'
            : 'font-poppins-semibold text-[14px] text-ink'
        }
        maxFontSizeMultiplier={1.3}
        style={negative && !plain ? { color: colors.moneyOut } : undefined}
      >
        {formatCurrency(Math.abs(value))}
      </Text>
    </View>
  );
}

function Row({
  label,
  value,
  hint,
  onPress,
}: {
  label: string;
  value?: string;
  hint?: string;
  onPress: () => void;
}) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}${value ? `, ${value}` : ''}${hint ? `, ${hint}` : ''}`}
      onPress={onPress}
      className="w-full flex-row items-center gap-3 rounded-[16px] border border-line bg-card px-5 py-4 active:bg-ink/5"
    >
      <View className="min-w-0 flex-1">
        <Text
          className="font-poppins-medium text-[15px] text-ink"
          numberOfLines={1}
          maxFontSizeMultiplier={1.3}
        >
          {label}
        </Text>
        {hint ? (
          <Text className="mt-0.5 font-poppins text-[12px] text-muted" maxFontSizeMultiplier={1.3}>
            {hint}
          </Text>
        ) : null}
      </View>
      {value ? (
        <Text className="font-poppins-semibold text-[15px] text-ink" maxFontSizeMultiplier={1.3}>
          {value}
        </Text>
      ) : null}
      <ChevronRight size={18} color={colors.muted} strokeWidth={2} />
    </Pressable>
  );
}

function Prompt({
  title,
  message,
  actionLabel,
  onPress,
}: {
  title: string;
  message: string;
  actionLabel: string;
  onPress: () => void;
}) {
  return (
    <View className="w-full rounded-[16px] border border-line bg-card px-5 py-5">
      <Text
        className="font-poppins-semibold text-[15px] leading-6 text-ink"
        maxFontSizeMultiplier={1.3}
      >
        {title}
      </Text>
      <Text
        className="mt-2 font-poppins text-[13px] leading-[19px] text-muted"
        maxFontSizeMultiplier={1.4}
      >
        {message}
      </Text>
      <ActionPill
        className="mt-4 self-start"
        icon={ArrowRight}
        label={actionLabel}
        onPress={onPress}
      />
    </View>
  );
}
