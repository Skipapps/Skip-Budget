import { router } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
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
import { ChoiceChips } from '@/components/ui/choice-chips';
import { useProGate } from '@/components/pro/pro-gate';
import { Screen } from '@/components/ui/screen';
import { SkeletonList } from '@/components/ui/skeleton';
import { Title } from '@/components/ui/typography';
import { BILL_CATEGORIES } from '@/data/bills-mock';
import { toIsoDate } from '@/lib/date';
import { formatCurrency } from '@/lib/format';
import { PERIODS, periodBuckets, periodRange, type PeriodKey } from '@/lib/period';
import { useColors } from '@/providers/theme-provider';

const PER_MONTH: Record<string, number> = {
  weekly: 52 / 12,
  biweekly: 26 / 12,
  semimonthly: 2,
  monthly: 1,
};

/**
 * The whole picture, in the order people ask for it.
 *
 * Every other screen answers one question — what did I spend, what is due, who
 * owes me. This is the one that puts them beside each other, and the order is
 * the argument: where you stand, what comes in, what goes out, where it went,
 * what is shared, what you kept, what you owe, and what is coming.
 *
 * It reads rather than computes. Every figure here comes from the same hooks
 * the screen that owns it uses, so a number cannot disagree with the page it
 * came from — which is the failure that makes a summary screen worse than
 * having none.
 */
export default function InsightsScreen() {
  // Wrapper, not inline: an early return above the screen's own hooks
  // would change the hook count when the entitlement answer lands.
  const gate = useProGate('insights');
  if (gate) return gate;
  return <InsightsScreenInner />;
}

function InsightsScreenInner() {
  const colors = useColors();

  const [periodKey, setPeriodKey] = useState<PeriodKey>('month');
  const anchor = useMemo(() => new Date(), []);
  const today = toIsoDate(anchor);

  // Cut off at today: this page is a record of what happened, and a month
  // halfway through should show the days that have been, not a projection of
  // the ones still to come. Those get their own section at the bottom.
  const range = useMemo(() => {
    const period = periodRange(periodKey, anchor);
    return { from: period.from, to: period.to > today ? today : period.to };
  }, [periodKey, anchor, today]);

  const { entries, totals, isLoading } = useLedger(range, today);
  const { refresh, refreshing } = useRefreshAll();

  const cards = useCards();
  const salary = useSalarySources();
  const savings = useMonthlySavings();
  const subscriptions = useSubscriptions();
  const { data: groupBalances } = useMyBalances();
  const { data: spendCategories = [] } = useSpendCategories();
  const { balances } = useSourceBalances(today);

  // --- Where you stand ------------------------------------------------------

  const savedTotal = (savings.data ?? []).reduce((sum, month) => sum + savedFor(month), 0);
  const owedOnCards = (cards.data ?? []).reduce(
    (sum, card) => sum + Math.abs(balances.get(card.id) ?? card.balance),
    0,
  );

  // What the groups add up to. Positive is owed to you, negative is owed by you.
  const splitPosition = useMemo(
    () => [...(groupBalances?.values() ?? [])].reduce((sum, balance) => sum + balance, 0),
    [groupBalances],
  );

  const worth = savedTotal - owedOnCards + splitPosition;

  const monthlyIncome = (salary.data ?? []).reduce(
    (sum, source) => sum + source.amount * (PER_MONTH[source.frequency] ?? 1),
    0,
  );

  // --- What goes out --------------------------------------------------------

  const buckets = useMemo(() => periodBuckets(periodKey, anchor), [periodKey, anchor]);

  const chartBuckets = useMemo<FlowBucket[]>(
    () =>
      buckets.map((bucket) => ({
        key: bucket.key,
        label: bucket.label,
        // Spending only, so every bar measures one thing. Income still counts
        // in the totals above it.
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

  // --- Where it goes --------------------------------------------------------

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

  // --- Where you spend most -------------------------------------------------

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
        // Any row that knows the brand settles it for the group. Keeping only
        // the first row's domain loses the logo whenever the earliest entry
        // happened to be the one typed by hand.
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

  const recentMonths = (savings.data ?? []).slice(0, 3);

  return (
    <Screen showBack onRefresh={refresh} refreshing={refreshing}>
      <Title align="left" className="mt-2">
        Insights
      </Title>

      {/* ---- Where you stand ------------------------------------------- */}
      <Heading>Where you stand</Heading>
      <View className="w-full rounded-[14px] border border-line bg-card px-5 py-5">
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
          <StandRow label="Owed on cards" value={-owedOnCards} />
          {splitPosition !== 0 ? (
            <StandRow
              label={splitPosition > 0 ? 'Owed to you by friends' : 'You owe friends'}
              value={splitPosition}
            />
          ) : null}
        </View>
      </View>

      {/* ---- What comes in --------------------------------------------- */}
      <Heading>What comes in</Heading>
      {monthlyIncome > 0 ? (
        <View className="w-full rounded-[14px] border border-line bg-card px-5 py-5">
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

      {/* ---- What goes out --------------------------------------------- */}
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
          <View className="mt-4 w-full rounded-[14px] border border-line bg-card px-5 py-5">
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

          <View className="mt-3 w-full rounded-[14px] border border-line bg-card px-5 py-4">
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

      {/* ---- Where it goes --------------------------------------------- */}
      {categories.length > 0 ? (
        <>
          <Heading>Where it goes</Heading>
          <View className="w-full rounded-[14px] border border-line bg-card px-5 py-5">
            {categories.map((category, index) => (
              <View
                key={category.id}
                className={
                  index > 0 ? 'mt-4 flex-row items-center gap-3' : 'flex-row items-center gap-3'
                }
              >
                {/* The same mark a bill row draws, so a category reads the
                    same way here as it does everywhere else in the app. */}
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
                  {/* Bars are relative to the biggest, not to the total — the
                    question is which category dominates, and against a total
                    every bar on a varied month looks equally short. */}
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

      {/* ---- Where you spend most --------------------------------------- */}
      {merchants.length > 0 ? (
        <>
          <Heading>Where you spend most</Heading>
          <View className="w-full rounded-[14px] border border-line bg-card px-5 py-5">
            {merchants.map((merchant, index) => (
              <View
                key={merchant.name}
                className={
                  index > 0 ? 'mt-4 flex-row items-center gap-3' : 'flex-row items-center gap-3'
                }
              >
                {/* A bill is not a brand. AEP and T-Mobile have logos, but
                    rent and HOA fees have a category and nothing else, and a
                    monogram beside real logos reads as a failed load. BillMark
                    picks whichever the row actually has. */}
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

      {/* ---- Shared with others ---------------------------------------- */}
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

      {/* ---- What you keep --------------------------------------------- */}
      <Heading>What you keep</Heading>
      {recentMonths.length > 0 ? (
        <View className="w-full rounded-[14px] border border-line bg-card px-5 py-4">
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

      {/* ---- What you owe ---------------------------------------------- */}
      {(cards.data ?? []).length > 0 ? (
        <>
          <Heading>What you owe</Heading>
          <View className="w-full rounded-[14px] border border-line bg-card px-5 py-4">
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

      {/* ---- What is coming -------------------------------------------- */}
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
  return (
    <Text
      className="mb-4 mt-9 w-full font-poppins-semibold text-[19px] text-ink"
      maxFontSizeMultiplier={1.3}
    >
      {children}
    </Text>
  );
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
      className="w-full flex-row items-center gap-3 rounded-[14px] border border-line bg-card px-5 py-4 active:bg-ink/5"
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
    <View className="w-full rounded-[14px] border border-line bg-card px-5 py-5">
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
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={actionLabel}
        onPress={onPress}
        className="mt-4 min-h-12 w-full items-center justify-center rounded-[10px] border border-line active:bg-ink/5"
      >
        <Text
          className="font-poppins-medium text-[15px] text-ink"
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.85}
          maxFontSizeMultiplier={1.4}
        >
          {actionLabel}
        </Text>
      </Pressable>
    </View>
  );
}
