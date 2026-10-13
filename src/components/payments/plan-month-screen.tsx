import { router } from 'expo-router';
import { ChevronRight, Plus, Search } from 'lucide-react-native';
import { useEffect, useId, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { loanTermsOf, useLoans } from '@/api/loans';
import { usePlanMonth, type PlanMonthData } from '@/api/payment-ledger';
import { useRefreshAll } from '@/api/refresh';
import { endingOfTerms } from '@/components/loans/loan-ending';
import { ComingUpRow } from '@/components/payments/coming-up-row';
import { MonthCard } from '@/components/payments/month-card';
import { PlanMonthRow } from '@/components/payments/plan-month-row';
import { SectionCard } from '@/components/payments/section-card';
import { StoppedRow, type LoanEndingInfo } from '@/components/payments/stopped-row';
import { PageState } from '@/components/ui/page-state';
import { RefreshNote } from '@/components/ui/refresh-note';
import { Screen } from '@/components/ui/screen';
import { Skeleton, SkeletonList } from '@/components/ui/skeleton';
import { t } from '@/i18n';
import { monthOf, type MonthPlanRow, type PlanKind } from '@/lib/bill-month';
import { failureText } from '@/lib/failure';
import { isLoanBill } from '@/lib/ledger-link';
import { onPaymentPicked } from '@/lib/payment-pick';
import { failedEmpty } from '@/lib/query-state';
import { withTap } from '@/lib/press';
import { useToday } from '@/lib/use-today';
import { useColors } from '@/providers/theme-provider';
import { useArtwork } from '@/theme/artwork';
import { TEXT_CAP } from '@/theme/text-scale';

export type PlanMonthLinks = {
  onSearch: () => void;
  onChooseMonth: () => void;
  onSeeHistory: () => void;
};

/** What a pull to refresh runs, and whether it is still running. */
export type PlanMonthPull = { onPull: () => void; pulling: boolean };

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

const NO_LOANS: ReadonlyMap<string, LoanEndingInfo> = new Map();

type PlanMarkFields = 'kind' | 'categoryId' | 'iconId' | 'domain' | 'logoHidden';

/** How every finished loan ended, by its bill, read the way the Loans page reads it. */
function useLoanEndings(today: string) {
  const { loans, isPending, isError, refreshFailed, refetch } = useLoans(today);
  const endings = useMemo(() => {
    const found = new Map<string, LoanEndingInfo>();
    for (const row of loans) {
      const terms = loanTermsOf(row);
      if (terms) found.set(row.bill.id, endingOfTerms(terms, row.bill, today));
    }
    return found;
  }, [loans, today]);
  return { endings, isPending, isError, refreshFailed, refetch };
}

/** What both pages share: the day, the month shown and its read, the pull and the links. */
function useMonthPage(kind: PlanKind, month: string | undefined) {
  const { today } = useToday();
  const owner = useId();
  const [picked, setPicked] = useState<string | null>(null);
  const shown = picked ?? (month && MONTH.test(month) ? month : monthOf(today));

  useEffect(() => onPaymentPicked(owner, 'month', (pick) => setPicked(pick.month)), [owner]);

  const data = usePlanMonth(kind, shown, today);
  // The app's own refresh rather than a re-read: it runs the sweep, which records a due the app
  // left open across midnight still owes, so history and Home catch up with this page.
  const { refresh, refreshing } = useRefreshAll();

  const links: PlanMonthLinks = {
    onSearch: () => router.push({ pathname: '/payment-search', params: { kind } }),
    onChooseMonth: () =>
      router.push({ pathname: '/payment-month', params: { kind, owner, selected: shown } }),
    onSeeHistory: () => router.push({ pathname: '/payment-history', params: { kind } }),
  };
  const pull: PlanMonthPull = { onPull: () => void refresh(), pulling: refreshing };
  return { today, data, links, pull };
}

/**
 * Monthly bills or Subscriptions for one month. A month picked on the month page comes back by this
 * page's id. Each kind is a component of its own, so the Subscriptions page never reads the loans.
 */
export function PlanMonthScreen({
  kind,
  month,
}: {
  kind: PlanKind;
  /** yyyy-mm from the route; anything else shows this month. */
  month?: string;
}) {
  return kind === 'bill' ? <BillsMonth month={month} /> : <SubscriptionsMonth month={month} />;
}

/**
 * A stopped loan's row needs the loans read to say whether it was paid off, so that read only holds
 * the page up, or fails it, when such a row is shown.
 */
function BillsMonth({ month }: { month?: string }) {
  const { today, data, links, pull } = useMonthPage('bill', month);
  const loans = useLoanEndings(today);
  const needsLoans = data.view.stopped.some((row) => isLoanBill(row.categoryId));

  return (
    <PlanMonthPage
      kind="bill"
      today={today}
      data={{
        ...data,
        isLoading: data.isLoading || (needsLoans && loans.isPending),
        // Loans that failed to read with nothing to show leave a stopped loan unnamed; a reload
        // that failed behind loans already read only adds to the note.
        isError: data.isError || (needsLoans && failedEmpty(loans)),
        refreshFailed: data.refreshFailed || (needsLoans && loans.refreshFailed),
        refetch: () => {
          data.refetch();
          if (needsLoans) loans.refetch();
        },
      }}
      loanEndings={loans.endings}
      links={links}
      pull={pull}
    />
  );
}

function SubscriptionsMonth({ month }: { month?: string }) {
  const { today, data, links, pull } = useMonthPage('subscription', month);
  return (
    <PlanMonthPage
      kind="subscription"
      today={today}
      data={data}
      loanEndings={NO_LOANS}
      links={links}
      pull={pull}
    />
  );
}

type PlanMonthPageProps = {
  kind: PlanKind;
  today: string;
  data: PlanMonthData;
  /** By bill id; a loan not in it reads as a stopped bill. */
  loanEndings: ReadonlyMap<string, LoanEndingInfo>;
  links: PlanMonthLinks;
  /** Pull to refresh; a plain re-read of the month when left out. */
  pull?: PlanMonthPull;
};

/** The page drawn from a month's data: the card, Coming up, All bills, Stopped, history. */
export function PlanMonthPage({ kind, today, data, loanEndings, links, pull }: PlanMonthPageProps) {
  const artwork = useArtwork();
  const bill = kind === 'bill';
  const add = () => router.push(bill ? '/add-bill' : '/add-subscription');

  return (
    <Screen
      title={t(bill ? 'payments.month.title.bill' : 'payments.month.title.subscription')}
      showBack
      onRefresh={pull?.onPull ?? data.refetch}
      refreshing={pull?.pulling ?? false}
      headerActions={[
        { icon: Search, label: t('payments.month.search'), onPress: links.onSearch, tone: 'plain' },
        {
          icon: Plus,
          label: t(bill ? 'bills.addBill' : 'subscriptions.addSubscription'),
          onPress: add,
        },
      ]}
    >
      {data.isError ? (
        // A month that could not be read is never shown as nothing due.
        <PageState
          art={artwork.error}
          title={failureText()}
          actionLabel={t('common.tryAgain')}
          onAction={data.refetch}
        />
      ) : data.isLoading ? (
        <View testID="plan-month-loading" className="w-full">
          <Skeleton className="mt-3 h-[150px] w-full rounded-[22px]" />
          <View className="mt-6 w-full">
            <SkeletonList rows={4} />
          </View>
        </View>
      ) : !data.hasPlans ? (
        <PageState
          art={bill ? artwork.emptyBills : artwork.emptySubscriptions}
          title={t(bill ? 'bills.noBillsYet' : 'subscriptions.noSubscriptionsYet')}
          message={t(bill ? 'bills.plans.emptyMessage' : 'subscriptions.plans.emptyMessage')}
          actionLabel={t(bill ? 'bills.addABill' : 'subscriptions.addASubscription')}
          onAction={add}
        />
      ) : (
        <MonthBody
          kind={kind}
          today={today}
          view={data.view}
          labelOf={data.labelOf}
          refreshFailed={data.refreshFailed}
          loanEndings={loanEndings}
          links={links}
        />
      )}
    </Screen>
  );
}

function MonthBody({
  kind,
  today,
  view,
  labelOf,
  refreshFailed,
  loanEndings,
  links,
}: Omit<PlanMonthPageProps, 'data' | 'pull'> &
  Pick<PlanMonthData, 'view' | 'labelOf' | 'refreshFailed'>) {
  const colors = useColors();
  // A running plan wins over a stopped one of the same id.
  const planById = new Map<string, Pick<MonthPlanRow, PlanMarkFields | 'href'>>(
    [...view.stopped, ...view.rows].map((row) => [row.planId, row]),
  );
  const sourceOf = (id: string) => (id ? labelOf(id) : null);

  return (
    <View className="mb-6 w-full">
      <View className="mt-3 w-full">
        <MonthCard kind={kind} view={view} onChooseMonth={links.onChooseMonth} />
      </View>
      <RefreshNote show={refreshFailed} />

      {view.comingUp.length > 0 ? (
        <SectionCard
          testID="coming-up"
          className="mt-7"
          title={t('payments.month.comingUp')}
          caption={String(view.comingUp.length)}
        >
          {view.comingUp.map((occurrence) => {
            const plan = planById.get(occurrence.planId);
            return (
              <ComingUpRow
                key={occurrence.id}
                occurrence={occurrence}
                plan={
                  plan ?? {
                    kind,
                    categoryId: null,
                    iconId: null,
                    domain: null,
                    logoHidden: false,
                  }
                }
                sourceLabel={sourceOf(occurrence.sourceId)}
                today={today}
                // With no plan behind it there is no page to open, so it is no button.
                onOpen={plan ? () => router.push(plan.href) : undefined}
              />
            );
          })}
        </SectionCard>
      ) : null}

      {view.rows.length > 0 ? (
        <SectionCard
          testID="all-plans"
          className="mt-7"
          title={t(kind === 'bill' ? 'payments.month.allBills' : 'payments.month.allSubscriptions')}
          caption={String(view.rows.length)}
        >
          {view.rows.map((row) => (
            <PlanMonthRow
              key={row.planId}
              row={row}
              sourceLabel={sourceOf(row.sourceId)}
              onOpen={() => router.push(row.href)}
              onAddCard={() => router.push(row.editHref)}
            />
          ))}
        </SectionCard>
      ) : null}

      {view.stopped.length > 0 ? (
        <SectionCard
          testID="stopped-plans"
          className="mt-7"
          title={t(kind === 'bill' ? 'payments.month.stopped' : 'payments.month.cancelled')}
          caption={String(view.stopped.length)}
        >
          {view.stopped.map((row) => (
            <StoppedRow
              key={row.planId}
              row={row}
              sourceLabel={sourceOf(row.sourceId)}
              loan={
                row.kind === 'bill' && isLoanBill(row.categoryId)
                  ? loanEndings.get(row.planId)
                  : null
              }
              onOpen={() => router.push(row.href)}
            />
          ))}
        </SectionCard>
      ) : null}

      <SectionCard className="mt-6">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('payments.month.seeHistory')}
          onPress={withTap(links.onSeeHistory)}
          testID="see-history"
          className="min-h-[52px] w-full flex-row items-center justify-between gap-3 px-[16px] py-[16px] active:bg-ink/5"
        >
          <Text
            className="shrink font-app-medium text-[15px] text-ink"
            maxFontSizeMultiplier={TEXT_CAP.row}
          >
            {t('payments.month.seeHistory')}
          </Text>
          <ChevronRight size={18} color={colors.muted} strokeWidth={2} />
        </Pressable>
      </SectionCard>
    </View>
  );
}
