import { useMemo } from 'react';
import { View } from 'react-native';

import { useSpendCategories } from '@/api/brands';
import { useGoals } from '@/api/goals';
import { useHabits, useHabitTaps } from '@/api/habits';
import { useLoans } from '@/api/loans';
import { usePlanMonth } from '@/api/payment-ledger';
import {
  useBills,
  useCards,
  useLedger,
  useReceipts,
  useSalarySources,
  useSourceBalances,
  useSubscriptions,
} from '@/api/queries';
import { useRefreshAll } from '@/api/refresh';
import { useSavingsCore } from '@/api/savings';
import { CategoriesSection, categoryLabels } from '@/components/insights/categories-section';
import { ComingUpSection } from '@/components/insights/coming-up-section';
import { GoalsSection } from '@/components/insights/goals-section';
import { HabitsSection } from '@/components/insights/habits-section';
import { IncomeSection, type IncomeFigures } from '@/components/insights/income-section';
import { InsightsHero } from '@/components/insights/insights-hero';
import { LoansSection, type LoansInsight } from '@/components/insights/loans-section';
import { MerchantsSection } from '@/components/insights/merchants-section';
import { OweSection, type OweRow } from '@/components/insights/owe-section';
import { PeriodSwitch } from '@/components/insights/period-switch';
import { PlansSection, type PlansInsight } from '@/components/insights/plans-section';
import { SavingsSection } from '@/components/insights/savings-section';
import {
  FailedCard,
  HIDDEN,
  LOADING,
  READY,
  Section,
  type SectionState,
} from '@/components/insights/section';
import { SpendCard } from '@/components/insights/spend-card';
import type { SpendBar } from '@/components/insights/spend-chart';
import {
  useInsightsPeriod,
  type PeriodPickerHref,
} from '@/components/insights/use-insights-period';
import { cardOf, loansPageSummary, priceLoans } from '@/components/loans/priced-loans';
import { useProGate } from '@/components/pro/pro-gate';
import { Screen } from '@/components/ui/screen';
import { Skeleton } from '@/components/ui/skeleton';
import { t } from '@/i18n';
import { monthLong, monthShort } from '@/i18n/calendar';
import { monthBounds, monthOf } from '@/lib/bill-month';
import {
  categoryLookups,
  categoryTotals,
  heroFigures,
  insightsBuckets,
  insightsRange,
  isCurrentPeriod,
  merchantTotals,
  shownMonth,
  shownYear,
  spendByBucket,
  spendSummary,
  yearHighlight,
} from '@/lib/insights';
import { habitsSummary, movedThisMonth, nextDue, subscriptionCost } from '@/lib/insights-sections';
import { fromCents, toCents } from '@/lib/money';
import { oneOffsInMonth, scheduledPerMonth } from '@/lib/pay';
import { useToday } from '@/lib/use-today';

/** How many dues the Bills & subscriptions card lists. */
const NEXT_DUE = 2;
/** How many habits the Habits card lists. */
const HABIT_ROWS = 3;

/**
 * A read as a section sees it. `data` is a plain query's; a combined read (the ledger, the
 * balances, the loans) has none and decides `isError` itself.
 */
type Read = { isLoading: boolean; isError: boolean; data?: unknown; refetch: () => unknown };

/**
 * Failed only with nothing to show: TanStack keeps `isError` after a failed background reload while
 * the last good answer stays in `data`, and that answer is still the figure to show.
 */
const failed = (read: Read) => read.isError && read.data === undefined;

/** One state for reads that must all answer: any failure fails them all, and Try again asks each. */
function together(reads: readonly Read[]): SectionState {
  if (reads.some(failed)) {
    return {
      kind: 'failed',
      onRetry: () => {
        for (const read of reads) void read.refetch();
      },
    };
  }
  return reads.some((read) => read.isLoading) ? LOADING : READY;
}

/** "October 2026". */
function monthYear(month: string): string {
  return t('ui.calendar.monthYear', {
    month: monthLong(Number(month.slice(5, 7)) - 1),
    year: Number(month.slice(0, 4)),
  });
}

/**
 * Insights: the figures of every other page side by side. It reads rather than computes: every
 * number comes from the hooks and helpers of the page that owns it, so the two cannot disagree.
 * `periodHref` opens Choose month and Choose year; the route that draws this page supplies it.
 */
export function InsightsScreen({ periodHref }: { periodHref: PeriodPickerHref }) {
  // Wrapper, not inline: an early return above the screen's own hooks would change the hook count
  // when the entitlement answer lands.
  const gate = useProGate('insights');
  if (gate) return gate;
  return <InsightsBody periodHref={periodHref} />;
}

function InsightsBody({ periodHref }: { periodHref: PeriodPickerHref }) {
  const { today } = useToday();
  const { refresh, refreshing } = useRefreshAll();
  const { period, setMode, choose } = useInsightsPeriod(today, periodHref);
  const thisMonth = monthOf(today);

  // Every read is asked for at once, here: none waits on another, and none mounts with a section.
  const heroLedger = useLedger(monthBounds(thisMonth), today);
  const periodLedger = useLedger(insightsRange(period, today), today);
  const receipts = useReceipts();
  const subscriptions = useSubscriptions();
  const bills = useBills();
  const spendCategories = useSpendCategories();
  const salary = useSalarySources();
  const cards = useCards();
  const balances = useSourceBalances(today);
  const loans = useLoans(today);
  const billMonth = usePlanMonth('bill', thisMonth, today);
  const subscriptionMonth = usePlanMonth('subscription', thisMonth, today);
  const habits = useHabits();
  const taps = useHabitTaps();
  const goals = useGoals();
  const savings = useSavingsCore();

  /**
   * The spending figures (the plum card, What goes out, Where it goes, Where you spend most) show
   * nothing until every read behind them has answered: a missing one reads as a smaller number that
   * looks like good news.
   */
  const spendState = together([heroLedger, periodLedger, receipts, subscriptions, spendCategories]);
  const spendReady = spendState.kind === 'ready';

  const hero = useMemo(
    () => heroFigures(heroLedger.allEntries, today),
    [heroLedger.allEntries, today],
  );
  const kinds = useMemo(() => spendSummary(periodLedger.allEntries), [periodLedger.allEntries]);
  const highlight = period.mode === 'year' ? yearHighlight(period, today) : null;
  const bars = useMemo<SpendBar[]>(
    () =>
      spendByBucket(periodLedger.allEntries, insightsBuckets(period, today)).map(
        (bucket, index) => ({
          key: bucket.key,
          label: bucket.label,
          spoken: period.mode === 'year' ? monthLong(index) : bucket.label,
          amount: bucket.amount,
          highlight: index === highlight,
        }),
      ),
    [periodLedger.allEntries, period, today, highlight],
  );
  const lookups = useMemo(
    () => categoryLookups(receipts.data ?? [], subscriptions.data ?? []),
    [receipts.data, subscriptions.data],
  );
  const categories = useMemo(
    () => categoryTotals(periodLedger.allEntries, lookups),
    [periodLedger.allEntries, lookups],
  );
  const merchants = useMemo(
    () => merchantTotals(periodLedger.allEntries),
    [periodLedger.allEntries],
  );
  const labels = categoryLabels(spendCategories.data ?? []);

  const income = useMemo<IncomeFigures>(() => {
    const pays = (salary.data ?? []).map((source) => ({
      amount: source.amount,
      frequency: source.frequency,
      payday: source.last_payday,
    }));
    const once = oneOffsInMonth(pays, today);
    return {
      monthly: scheduledPerMonth(pays),
      schedules: pays.filter((pay) => pay.frequency !== 'once').length,
      onceTotal: fromCents(once.reduce((cents, pay) => cents + toCents(pay.amount), 0)),
      onceCount: once.length,
    };
  }, [salary.data, today]);

  const owe = useMemo<OweRow[]>(
    () =>
      (cards.data ?? []).map((card) => ({
        id: card.id,
        label: `${card.holder}${card.last4 ? ` ${card.last4}` : ''}`,
        holder: card.holder,
        color: card.color,
        // A card in credit owes nothing; its credit is not a debt.
        owed: Math.max(balances.balances.get(card.id) ?? card.balance, 0),
      })),
    [cards.data, balances.balances],
  );
  // The typed opening figure is never a stand-in for a balance that failed to read, nor for one
  // still being walked: the walk reads what the ledger reads.
  const oweState: SectionState =
    failed(cards) || (balances.isError && (cards.data ?? []).length > 0)
      ? {
          kind: 'failed',
          onRetry: () => {
            void cards.refetch();
            balances.refetch();
          },
        }
      : cards.isLoading || heroLedger.isLoading
        ? LOADING
        : READY;

  const priced = useMemo(() => priceLoans(loans.loans, today), [loans.loans, today]);
  const loansInsight = useMemo<LoansInsight>(() => {
    const summary = loansPageSummary(priced);
    return {
      owed: summary.owed,
      count: summary.count,
      finished: priced.filter((loan) => loan.ending !== null).length,
      percentPaid: summary.percentPaid,
      monthly: summary.monthly,
      rows: priced
        .filter((loan) => loan.ending === null)
        .map(cardOf)
        .map((card) => ({
          billId: card.billId,
          name: card.name,
          iconId: card.iconId,
          nextOn: card.nextOn,
          payment: card.monthly,
        })),
    };
  }, [priced]);
  const loansState = together([
    { isLoading: loans.isPending, isError: loans.isError, refetch: loans.refetch },
  ]);

  const plans = useMemo<PlansInsight>(
    () => ({
      bills: { count: billMonth.view.planCount, total: billMonth.view.total },
      subscriptions: {
        count: subscriptionMonth.view.planCount,
        total: subscriptionMonth.view.total,
      },
      next: nextDue(
        {
          bills: billMonth.view,
          subscriptions: subscriptionMonth.view,
          billRows: bills.data ?? [],
          subscriptionRows: subscriptions.data ?? [],
          today,
        },
        NEXT_DUE,
      ),
    }),
    [billMonth.view, subscriptionMonth.view, bills.data, subscriptions.data, today],
  );
  const plansState = together([billMonth, subscriptionMonth, bills, subscriptions]);

  const cost = useMemo(() => subscriptionCost(subscriptions.data ?? []), [subscriptions.data]);

  const habitSummary = useMemo(
    () => habitsSummary(habits.data ?? [], taps.data ?? [], today, HABIT_ROWS),
    [habits.data, taps.data, today],
  );

  const moved = useMemo(
    // The share waits for the month's income; until then the line is left off.
    () => movedThisMonth(savings.summary.pots, spendReady ? hero.in : 0, today),
    [savings.summary.pots, spendReady, hero.in, today],
  );

  const current = isCurrentPeriod(period, today);
  const month = shownMonth(period, today);
  const year = shownYear(period, today);
  const cardLabel =
    period.mode === 'month'
      ? current
        ? t('insights.out.thisMonth')
        : monthYear(month)
      : current
        ? t('insights.out.thisYear')
        : String(year);

  return (
    <Screen title={t('insights.title')} showBack onRefresh={refresh} refreshing={refreshing}>
      <View className="mt-2 w-full">
        {spendState.kind === 'failed' ? (
          <FailedCard onRetry={spendState.onRetry} testID="insights-hero-failed" />
        ) : spendState.kind === 'loading' ? (
          <Skeleton className="h-[150px] w-full rounded-[22px]" />
        ) : (
          <InsightsHero figures={hero} />
        )}
      </View>

      <IncomeSection state={together([salary])} figures={income} />

      <Section
        id="out"
        title={t('insights.out.heading')}
        subtitle={t('insights.out.subtitle')}
        seeAll="/transactions"
        state={spendState}
        lead={
          <PeriodSwitch
            mode={period.mode}
            shown={
              period.mode === 'month'
                ? t('ui.calendar.monthYearShort', {
                    month: monthShort(Number(month.slice(5, 7)) - 1),
                    year: Number(month.slice(0, 4)),
                  })
                : String(year)
            }
            shownA11y={
              period.mode === 'month'
                ? t('insights.period.chooseMonthA11y', { month: monthYear(month) })
                : t('insights.period.chooseYearA11y', { year })
            }
            onChoose={choose}
            onMode={setMode}
          />
        }
      >
        <SpendCard
          label={cardLabel}
          total={kinds.total}
          bars={bars}
          mode={period.mode}
          kinds={kinds}
        />
      </Section>

      {/* The plum card's place and What goes out already say it failed; these would repeat it. */}
      <CategoriesSection
        state={spendState.kind === 'failed' ? HIDDEN : spendState}
        rows={categories}
        labels={labels}
      />
      <MerchantsSection
        state={spendState.kind === 'failed' ? HIDDEN : spendState}
        rows={merchants}
      />

      <OweSection state={oweState} rows={owe} />
      <LoansSection state={loansState} loans={loansInsight} />
      <PlansSection state={plansState} plans={plans} />
      <ComingUpSection state={together([subscriptions])} cost={cost} />
      <HabitsSection state={together([habits, taps])} summary={habitSummary} />
      <GoalsSection
        state={together([
          { isLoading: goals.isPending, isError: goals.isError, refetch: goals.refetch },
        ])}
        goals={{
          saved: goals.summary.saved,
          target: goals.summary.target,
          active: goals.summary.active,
          reached: goals.summary.done.length,
        }}
      />
      <SavingsSection
        state={together([
          { isLoading: savings.isPending, isError: savings.isError, refetch: savings.refetch },
        ])}
        savings={{
          moved: moved.moved,
          total: savings.summary.readyToUse,
          incomeShare: moved.incomeShare,
          belowOnePercent: moved.belowOnePercent,
        }}
      />

      <View className="h-10 w-full" />
    </Screen>
  );
}
