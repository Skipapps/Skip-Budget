import { router } from 'expo-router';
import { ArrowRight, ChevronRight } from 'lucide-react-native';
import { useMemo, useState, type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import { useSpendCategories } from '@/api/brands';
import {
  useCards,
  useLedger,
  useSalarySources,
  useSourceBalances,
  useSubscriptions,
} from '@/api/queries';
import { useRefreshAll } from '@/api/refresh';
import { BillMark } from '@/components/bills/bill-mark';
import { BrandMark } from '@/components/brands/brand-mark';
import { FlowChart, type FlowBucket } from '@/components/transactions/flow-chart';
import { ActionPill } from '@/components/ui/action-pill';
import { ChoiceChips } from '@/components/ui/choice-chips';
import {
  FitFigure,
  FitGroup,
  FitRows,
  FitText,
  useFitGroup,
  useGroupFits,
} from '@/components/ui/fit-group';
import { useProGate } from '@/components/pro/pro-gate';
import { PageState } from '@/components/ui/page-state';
import { Screen } from '@/components/ui/screen';
import { SkeletonList } from '@/components/ui/skeleton';
import { SectionHeading } from '@/components/ui/typography';
import { BILL_CATEGORIES } from '@/data/bill-categories';
import { t, type MessageKey } from '@/i18n';
import { MESSAGES } from '@/i18n/messages';
import { toIsoDate } from '@/lib/date';
import { formatCurrency } from '@/lib/format';
import { oneOffsInMonth, scheduledPerMonth } from '@/lib/pay';
import { PERIODS, periodBuckets, periodRange, type PeriodKey } from '@/lib/period';
import { useColors } from '@/providers/theme-provider';
import { useArtwork } from '@/theme/artwork';
import { failureText } from '@/lib/failure';
import { TEXT_CAP } from '@/theme/text-scale';

const PERIOD_TOTAL: Record<PeriodKey, MessageKey> = {
  week: 'insights.out.thisWeek',
  month: 'insights.out.thisMonth',
  year: 'insights.out.thisYear',
  all: 'insights.out.allTime',
};

/**
 * A category's name by its stored id. An id the app has no words for (added to the database
 * later) keeps the label it was stored with.
 */
function categoryName(
  prefix: 'receipts.category' | 'insights.billCategory',
  id: string,
  stored: string,
): string {
  const key = `${prefix}.${id}`;
  return key in MESSAGES ? t(key as MessageKey) : stored;
}

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
  const subscriptions = useSubscriptions();
  const categoriesQuery = useSpendCategories();
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
    subscriptions.isError ||
    categoriesQuery.isError ||
    // A failed balance walk falls back to the figure typed when the card was added.
    balancesError;

  const retry = () => {
    ledger.refetch();
    cards.refetch();
    salary.refetch();
    subscriptions.refetch();
    categoriesQuery.refetch();
    refetchBalances();
  };

  const pays = (salary.data ?? []).map((source) => ({
    amount: source.amount,
    frequency: source.frequency,
    payday: source.last_payday,
  }));
  // The schedules every month; one-off pays only in the month they landed.
  const monthlyIncome = scheduledPerMonth(pays);
  const schedules = pays.filter((pay) => pay.frequency !== 'once').length;
  const onceThisMonth = oneOffsInMonth(pays, today);
  const onceTotal = onceThisMonth.reduce((sum, pay) => sum + pay.amount, 0);

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
    for (const category of BILL_CATEGORIES) {
      labels.set(category.id, categoryName('insights.billCategory', category.id, category.label));
    }
    for (const category of spendCategories) {
      labels.set(category.id, categoryName('receipts.category', category.id, category.label));
    }
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
      .map(([id, amount]) => ({
        id,
        label: categoryLabel.get(id) ?? t('receipts.category.other'),
        amount,
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 6);
  }, [entries, categoryLabel]);

  const merchants = useMemo(() => {
    type Merchant = {
      amount: number;
      visits: number;
      domain?: string | null;
      /** Every row in the group chose letters, so no name match may bring a logo back. */
      logoHidden: boolean;
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
        found.logoHidden = found.logoHidden && Boolean(entry.logoHidden);
        found.categoryId = found.categoryId ?? entry.categoryId;
        found.iconId = found.iconId ?? entry.iconId;
      } else {
        byName.set(entry.label, {
          amount: Math.abs(entry.amount),
          visits: 1,
          domain: entry.domain,
          logoHidden: Boolean(entry.logoHidden),
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

  if (isError) {
    return (
      <Screen title={t('insights.title')} showBack onRefresh={refresh} refreshing={refreshing}>
        <PageState
          art={artwork.error}
          title={failureText()}
          actionLabel={t('common.tryAgain')}
          onAction={retry}
        />
      </Screen>
    );
  }

  return (
    <Screen title={t('insights.title')} showBack onRefresh={refresh} refreshing={refreshing}>
      <Heading>{t('insights.in.heading')}</Heading>
      {monthlyIncome > 0 || onceTotal > 0 ? (
        <View
          testID="insights-income"
          className="w-full rounded-[16px] border border-line bg-card px-5 py-5"
        >
          <Text
            className="font-app text-[13px] text-muted"
            maxFontSizeMultiplier={TEXT_CAP.control}
          >
            {monthlyIncome > 0 ? t('insights.in.everyMonth') : t('insights.in.thisMonth')}
          </Text>
          <FitFigure id="income" size={28} className="font-app-bold text-ink" boxClassName="mt-1">
            {formatCurrency(monthlyIncome > 0 ? monthlyIncome : onceTotal)}
          </FitFigure>
          <Text
            className="mt-1 font-app text-[12px] text-muted"
            maxFontSizeMultiplier={TEXT_CAP.reading}
          >
            {monthlyIncome > 0
              ? t('insights.in.sources', { count: schedules })
              : t('insights.in.paidOnce', { count: onceThisMonth.length })}
          </Text>
          {monthlyIncome > 0 && onceTotal > 0 ? (
            <Text
              className="mt-1 font-app text-[12px] text-muted"
              maxFontSizeMultiplier={TEXT_CAP.reading}
            >
              {t('insights.in.onceThisMonth', { amount: formatCurrency(onceTotal) })}
            </Text>
          ) : null}
        </View>
      ) : (
        <Prompt
          title={t('insights.in.emptyTitle')}
          message={t('insights.in.emptyMessage')}
          actionLabel={t('insights.in.setUp')}
          onPress={() => router.push('/salary')}
        />
      )}

      <Heading>{t('insights.out.heading')}</Heading>
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
            <Text
              className="font-app text-[13px] text-muted"
              maxFontSizeMultiplier={TEXT_CAP.control}
            >
              {t(PERIOD_TOTAL[periodKey])}
            </Text>
            <FitFigure id="out" size={30} className="font-app-bold text-ink" boxClassName="mt-1">
              {formatCurrency(totals.out)}
            </FitFigure>
            <View className="mt-4 w-full">
              <FlowChart buckets={chartBuckets} />
            </View>
          </View>

          <FitRows
            className="mt-3 w-full rounded-[16px] border border-line bg-card px-5 py-4"
            testID="insights-kinds"
          >
            <StandRow
              id="receipts"
              label={t('insights.out.receipts')}
              value={-(byKind.get('receipt') ?? 0)}
              plain
            />
            <View className="h-2" />
            <StandRow
              id="bills"
              label={t('insights.out.bills')}
              value={-(byKind.get('bill') ?? 0)}
              plain
            />
            <View className="h-2" />
            <StandRow
              id="subscriptions"
              label={t('insights.out.subscriptions')}
              value={-(byKind.get('subscription') ?? 0)}
              plain
            />
            <View className="my-3 h-px w-full bg-line" />
            <StandRow id="recorded" label={t('insights.out.recorded')} value={totals.out} strong />
          </FitRows>
        </>
      )}

      {categories.length > 0 ? (
        <>
          <Heading>{t('insights.goes.heading')}</Heading>
          <FitRows
            className="w-full rounded-[16px] border border-line bg-card px-5 py-5"
            testID="insights-categories"
          >
            {categories.map((category, index) => (
              <BarRow
                key={category.id}
                id={`category-${index}`}
                first={index === 0}
                mark={<BillMark categoryId={category.id} size={34} />}
                label={category.label}
                amount={category.amount}
                share={biggest > 0 ? category.amount / biggest : 0}
              />
            ))}
          </FitRows>
        </>
      ) : null}

      {merchants.length > 0 ? (
        <>
          <Heading>{t('insights.most.heading')}</Heading>
          <FitRows
            className="w-full rounded-[16px] border border-line bg-card px-5 py-5"
            testID="insights-merchants"
          >
            {merchants.map((merchant, index) => (
              <BarRow
                key={merchant.name}
                id={`merchant-${index}`}
                first={index === 0}
                mark={
                  merchant.kind === 'bill' ? (
                    <BillMark
                      categoryId={merchant.categoryId}
                      iconId={merchant.iconId}
                      domain={merchant.domain}
                      name={merchant.name}
                      size={40}
                    />
                  ) : (
                    <BrandMark
                      name={merchant.name}
                      domain={merchant.domain}
                      // Letters only when no row in the group has a logo to show.
                      hidden={merchant.logoHidden && !merchant.domain}
                      size={40}
                    />
                  )
                }
                label={merchant.name}
                amount={merchant.amount}
                share={busiest > 0 ? merchant.amount / busiest : 0}
                note={t('insights.most.times', { count: merchant.visits })}
              />
            ))}
          </FitRows>
        </>
      ) : null}

      {(cards.data ?? []).length > 0 ? (
        <>
          <Heading>{t('insights.owe.heading')}</Heading>
          <FitRows
            className="w-full rounded-[16px] border border-line bg-card px-5 py-4"
            testID="insights-cards"
          >
            {(cards.data ?? []).map((card, index) => (
              <View key={card.id} className={index > 0 ? 'mt-3' : undefined}>
                <StandRow
                  id={card.id}
                  label={`${card.holder}${card.last4 ? ` ${card.last4}` : ''}`}
                  // A card in credit owes nothing; its credit is not a debt.
                  value={-Math.max(balances.get(card.id) ?? card.balance, 0)}
                  plain
                />
              </View>
            ))}
          </FitRows>
        </>
      ) : null}

      {monthlySubs > 0 ? (
        <>
          <Heading>{t('insights.coming.heading')}</Heading>
          <Row
            label={t('insights.out.subscriptions')}
            value={t('insights.coming.perMonth', { amount: formatCurrency(monthlySubs) })}
            hint={t('insights.coming.overYear', { amount: formatCurrency(monthlySubs * 12) })}
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

/**
 * A label and a signed figure. Money out is tinted, money in is not shouted about. Every row in the
 * card keeps its figure beside its label, or every row puts it underneath.
 */
function StandRow({
  id,
  label,
  value,
  plain = false,
  strong = false,
}: {
  /** Names the fit slots; unique in its card. */
  id: string;
  label: string;
  value: number;
  plain?: boolean;
  /** The card's total line. */
  strong?: boolean;
}) {
  const colors = useColors();
  const stacked = !useGroupFits();
  const negative = value < 0;

  return (
    <View
      className={
        stacked ? 'w-full items-start' : 'w-full flex-row items-center justify-between gap-3'
      }
    >
      <FitText
        id={`${id}-label`}
        role="row"
        size={strong ? 15 : 14}
        className={strong ? 'font-app-semibold text-ink' : 'font-app text-muted'}
        slotClassName={stacked ? 'w-full' : 'min-w-0 flex-1'}
      >
        {label}
      </FitText>
      <FitText
        id={`${id}-value`}
        hug
        role="row"
        size={strong ? 16 : 14}
        className={
          strong
            ? 'font-app-bold text-ink'
            : plain
              ? 'font-app-medium text-ink'
              : 'font-app-semibold text-ink'
        }
        style={negative && !plain && !strong ? { color: colors.moneyOut } : undefined}
        slotClassName={stacked ? 'mt-0.5' : 'shrink-0'}
      >
        {formatCurrency(Math.abs(value))}
      </FitText>
    </View>
  );
}

/** A name, its figure and a bar of its share; stacked with the rest of its card, the figure goes under the name. */
function BarRow({
  id,
  first,
  mark,
  label,
  amount,
  share,
  note,
}: {
  id: string;
  first: boolean;
  mark: ReactNode;
  label: string;
  amount: number;
  /** Of the card's biggest, 0 to 1. */
  share: number;
  note?: string;
}) {
  const stacked = !useGroupFits();
  return (
    <View className={first ? 'flex-row items-center gap-3' : 'mt-4 flex-row items-center gap-3'}>
      {mark}
      <View className="min-w-0 flex-1">
        <View
          className={
            stacked ? 'w-full items-start' : 'w-full flex-row items-baseline justify-between gap-3'
          }
        >
          <FitText
            id={`${id}-label`}
            role="row"
            size={14}
            className="font-app-medium text-ink"
            slotClassName={stacked ? 'w-full' : 'min-w-0 flex-1'}
          >
            {label}
          </FitText>
          <FitText
            id={`${id}-amount`}
            hug
            role="row"
            size={14}
            className="font-app-semibold text-ink"
            slotClassName={stacked ? 'mt-0.5' : 'shrink-0'}
          >
            {formatCurrency(amount)}
          </FitText>
        </View>
        <View className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-ink/5">
          <View className="h-full rounded-full bg-accent" style={{ width: `${share * 100}%` }} />
        </View>
        {note ? (
          <Text
            className="mt-1 font-app text-[12px] text-muted"
            maxFontSizeMultiplier={TEXT_CAP.row}
          >
            {note}
          </Text>
        ) : null}
      </View>
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
  const words = useFitGroup({ mode: 'switch' });
  const stacked = !words.fits;
  const figure = value ? (
    <FitText
      id="value"
      hug
      role="row"
      size={15}
      className="font-app-semibold text-ink"
      slotClassName={stacked ? 'mt-0.5' : 'shrink-0'}
    >
      {value}
    </FitText>
  ) : null;

  return (
    <FitGroup group={words} className="w-full">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}${value ? `, ${value}` : ''}${hint ? `, ${hint}` : ''}`}
        onPress={onPress}
        className="w-full flex-row items-center gap-3 rounded-[16px] border border-line bg-card px-5 py-4 active:bg-ink/5"
      >
        {/* Stacked, the figure follows the name, in the order VoiceOver reads the row. */}
        <View className="min-w-0 flex-1 items-start">
          <FitText
            id="label"
            role="row"
            size={15}
            className="font-app-medium text-ink"
            slotClassName="w-full"
          >
            {label}
          </FitText>
          {stacked ? figure : null}
          {hint ? (
            <Text
              className="mt-0.5 font-app text-[12px] text-muted"
              maxFontSizeMultiplier={TEXT_CAP.row}
            >
              {hint}
            </Text>
          ) : null}
        </View>
        {stacked ? null : figure}
        <ChevronRight size={18} color={colors.muted} strokeWidth={2} />
      </Pressable>
    </FitGroup>
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
        className="font-app-semibold text-[15px] leading-6 text-ink"
        maxFontSizeMultiplier={TEXT_CAP.heading}
      >
        {title}
      </Text>
      <Text
        className="mt-2 font-app text-[13px] leading-[19px] text-muted"
        maxFontSizeMultiplier={TEXT_CAP.reading}
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
