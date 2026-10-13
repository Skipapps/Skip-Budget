import { useState, type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import type { PaymentSourceRow } from '@/api/queries';
import { localDate } from '@/components/loans/loan-words';
import {
  HISTORY_SHOWN,
  pageDate,
  paidFromSpoken,
  paidFromText,
  spokenDate,
  type HistoryRow,
  type LoanViewHistory,
} from '@/components/loans/view/loan-view-data';
import { t } from '@/i18n';
import { monthShort } from '@/i18n/calendar';
import { cn } from '@/lib/cn';
import { formatCurrency } from '@/lib/format';
import type { LoanPayment } from '@/lib/loan-view';
import { withTap } from '@/lib/press';
import { contrast } from '@/lib/tone';
import { useColors } from '@/providers/theme-provider';
import { TEXT_CAP } from '@/theme/text-scale';

/** Every row's mark sits in a column this wide, so the words line up from card to card. */
const MARK = 44;

/** A swatch this close to the card would vanish into it (as on the Paid from tiles). */
const OUTLINE_BELOW = 1.6;

/** A titled card of payment rows, with its See all on the title's line. */
function ViewSection({
  title,
  seeAll,
  testID,
  children,
}: {
  title: string;
  seeAll?: { onPress: () => void; hint: string };
  testID: string;
  children: ReactNode;
}) {
  return (
    <View className="mt-4 w-full rounded-[20px] border border-line bg-card" testID={testID}>
      {/* At large text See all drops under the title rather than squeezing it. */}
      <View className="w-full flex-row flex-wrap items-center justify-between gap-x-3 px-[16px] pt-[8px]">
        <Text
          accessibilityRole="header"
          className="shrink py-[10px] font-app-semibold text-[16px] text-ink"
          maxFontSizeMultiplier={TEXT_CAP.heading}
        >
          {title}
        </Text>
        {seeAll ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('loanFlow.view.seeAllA11y', { section: title })}
            accessibilityHint={seeAll.hint}
            onPress={withTap(seeAll.onPress)}
            hitSlop={4}
            testID={`${testID}-see-all`}
            className="-mr-2 min-h-[44px] justify-center rounded-full px-2 active:bg-ink/5"
          >
            <Text
              className="font-app-semibold text-[14px] text-accent-ink"
              maxFontSizeMultiplier={TEXT_CAP.row}
            >
              {t('loanFlow.view.seeAll')}
            </Text>
          </Pressable>
        ) : null}
      </View>
      <View className="w-full pb-[4px]">{children}</View>
    </View>
  );
}

/**
 * A mark, a title over a line of detail, and the amount. The amount keeps its own width and the
 * words beside it wrap, so no figure is cut at large text.
 */
function PaymentLine({
  mark,
  title,
  detail,
  amount,
  spoken,
  first,
  testID,
  action,
}: {
  mark: ReactNode;
  title: string;
  detail: string;
  amount: string;
  spoken: string;
  first: boolean;
  testID: string;
  /** A row that can be acted on: a tap and a long press both do it. */
  action?: { onPress: () => void; hint: string };
}) {
  const className = cn(
    'w-full flex-row items-center gap-[12px] px-[16px] py-[12px]',
    first ? undefined : 'border-t border-line',
    action ? 'active:bg-ink/5' : undefined,
  );
  const content = (
    <>
      <View
        style={{ minWidth: MARK }}
        className="items-center justify-center"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {mark}
      </View>
      <View className="min-w-0 flex-1">
        <Text
          className="font-app-semibold text-[15px] text-ink"
          maxFontSizeMultiplier={TEXT_CAP.row}
        >
          {title}
        </Text>
        <Text
          className="mt-0.5 font-app text-[12px] text-muted"
          maxFontSizeMultiplier={TEXT_CAP.row}
        >
          {detail}
        </Text>
      </View>
      <Text
        className="shrink-0 font-app-semibold text-[15px] text-ink"
        maxFontSizeMultiplier={TEXT_CAP.row}
      >
        {amount}
      </Text>
    </>
  );

  if (action) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={spoken}
        accessibilityHint={action.hint}
        onPress={withTap(action.onPress)}
        onLongPress={withTap(action.onPress)}
        testID={testID}
        className={className}
      >
        {content}
      </Pressable>
    );
  }
  return (
    <View accessible accessibilityLabel={spoken} testID={testID} className={className}>
      {content}
    </View>
  );
}

/** The day over its month, on the accent's soft fill. */
function DateTile({ iso }: { iso: string }) {
  const date = localDate(iso);
  return (
    <View
      testID="loan-date-tile"
      style={{ minWidth: MARK, minHeight: MARK }}
      className="items-center justify-center rounded-[12px] bg-tint px-1 py-1"
    >
      <Text
        className="font-app-bold text-[16px] leading-[19px] text-tint-ink"
        maxFontSizeMultiplier={TEXT_CAP.control}
      >
        {date.getDate()}
      </Text>
      <Text
        className="font-app-medium text-[11px] leading-[13px] text-tint-ink"
        maxFontSizeMultiplier={TEXT_CAP.control}
      >
        {monthShort(date.getMonth())}
      </Text>
    </View>
  );
}

/** The card or account's own colour, as its Paid from tile shows it; dashed for none. */
function SourceChip({ source }: { source: PaymentSourceRow | null }) {
  const colors = useColors();
  if (!source) {
    return (
      <View
        testID="loan-source-chip-none"
        className="h-[21px] w-[32px] rounded-[5px] border-[1.5px] border-dashed border-muted"
      />
    );
  }
  const outlined = contrast(source.color, colors.card) < OUTLINE_BELOW;
  return (
    <View
      testID="loan-source-chip"
      style={[
        { backgroundColor: source.color },
        outlined && { borderWidth: 1, borderColor: colors.muted },
      ]}
      className="h-[21px] w-[32px] rounded-[5px]"
    />
  );
}

/** A line inside a card with nothing to list. */
function EmptyLine({ children, testID }: { children: string; testID: string }) {
  return (
    <Text
      testID={testID}
      className="w-full px-[16px] pb-[12px] pt-[2px] font-app text-[14px] leading-5 text-muted"
      maxFontSizeMultiplier={TEXT_CAP.reading}
    >
      {children}
    </Text>
  );
}

/** The next few payments and how each splits, with See all opening the whole schedule. */
export function UpcomingCard({
  payments,
  onSeeAll,
}: {
  payments: readonly LoanPayment[];
  /** Left out when the schedule cannot be opened. */
  onSeeAll?: () => void;
}) {
  return (
    <ViewSection
      title={t('loan.schedule.title')}
      seeAll={onSeeAll ? { onPress: onSeeAll, hint: t('loanFlow.view.scheduleHint') } : undefined}
      testID="loan-upcoming"
    >
      {payments.length === 0 ? (
        <EmptyLine testID="loan-upcoming-none">{t('loanFlow.view.noneLeft')}</EmptyLine>
      ) : (
        payments.map((payment, index) => {
          const figures = {
            payment: formatCurrency(payment.payment),
            principal: formatCurrency(payment.principal),
            interest: formatCurrency(payment.interest),
          };
          return (
            <PaymentLine
              key={payment.number}
              testID={`loan-upcoming-${payment.number}`}
              first={index === 0}
              mark={<DateTile iso={payment.date} />}
              title={t('loan.payment.title', { number: payment.number })}
              detail={t('loan.schedule.rowSplit', {
                principal: figures.principal,
                interest: figures.interest,
              })}
              amount={figures.payment}
              spoken={t('loanFlow.view.upcomingA11y', {
                number: payment.number,
                date: spokenDate(payment.date),
                ...figures,
              })}
            />
          );
        })
      )}
    </ViewSection>
  );
}

/**
 * The payments already made and the money paid off the loan, newest first: the latest few, and
 * every one after See all. Before the first, the day it is due. A payoff can be taken back out.
 */
export function HistoryCard({
  history,
  paidFrom,
  today,
  onRemovePayoff,
  canRemovePayoff = () => true,
}: {
  history: LoanViewHistory;
  /** Where the scheduled payments come from; a payoff names its own. */
  paidFrom: PaymentSourceRow | null;
  today: string;
  onRemovePayoff: (payoff: PayoffRow) => void;
  /** Which payoffs can be taken out; on a finished loan, which is read-only, at most one. */
  canRemovePayoff?: (payoff: PayoffRow) => boolean;
}) {
  const [all, setAll] = useState(false);
  const shown = all ? history.rows : history.rows.slice(0, HISTORY_SHOWN);
  const more = !all && history.rows.length > HISTORY_SHOWN;

  return (
    <ViewSection
      title={t('loanFlow.view.history')}
      seeAll={
        more ? { onPress: () => setAll(true), hint: t('loanFlow.view.historyHint') } : undefined
      }
      testID="loan-history"
    >
      {shown.length === 0 ? (
        <EmptyLine testID="loan-history-none">
          {history.firstPaymentOn
            ? t('loanFlow.view.firstOn', { date: pageDate(history.firstPaymentOn, today) })
            : t('loanFlow.view.noPayments')}
        </EmptyLine>
      ) : (
        shown.map((row, index) =>
          row.kind === 'payoff' ? (
            <PayoffLine
              key={`payoff-${row.id ?? `${row.date}-${index}`}`}
              payoff={row}
              first={index === 0}
              today={today}
              onRemove={canRemovePayoff(row) ? () => onRemovePayoff(row) : undefined}
            />
          ) : (
            <ScheduledLine
              key={`payment-${row.number}`}
              payment={row}
              paidFrom={paidFrom}
              first={index === 0}
              today={today}
            />
          ),
        )
      )}
    </ViewSection>
  );
}

type PayoffRow = Extract<HistoryRow, { kind: 'payoff' }>;

/** Where a payment came from, as a row's second line says it. */
function fromLine(source: PaymentSourceRow | null): string {
  return source
    ? t('loanFlow.view.paidFrom', { source: paidFromText(source) })
    : t('bills.noPaymentMethod');
}

/** "27 Sep" / "Paid from Chase ••4821" / "$424.80": a payment the schedule made. */
function ScheduledLine({
  payment,
  paidFrom,
  first,
  today,
}: {
  payment: Extract<HistoryRow, { kind: 'payment' }>;
  paidFrom: PaymentSourceRow | null;
  first: boolean;
  today: string;
}) {
  const amount = formatCurrency(payment.payment);
  const said = { number: payment.number, date: spokenDate(payment.date), payment: amount };
  return (
    <PaymentLine
      testID={`loan-history-${payment.number}`}
      first={first}
      mark={<SourceChip source={paidFrom} />}
      title={pageDate(payment.date, today)}
      detail={fromLine(paidFrom)}
      amount={amount}
      spoken={
        paidFrom
          ? t('loanFlow.view.historyA11y', { ...said, source: paidFromSpoken(paidFrom) })
          : t('loanFlow.view.historyNoSourceA11y', said)
      }
    />
  );
}

/**
 * "Paid off" / "12 Oct · Paid from Chase ••4821" / "$10,728.50": money paid off the loan, from its
 * own card or account. A tap or a long press offers to take the latest back out, and on an earlier
 * one says to take out the later first.
 */
function PayoffLine({
  payoff,
  first,
  today,
  onRemove,
}: {
  payoff: PayoffRow;
  first: boolean;
  today: string;
  onRemove?: () => void;
}) {
  const kind = payoff.full ? t('loanFlow.view.paidOff') : t('loanFlow.view.extraPayment');
  const amount = formatCurrency(payoff.amount);
  const said = { kind, date: spokenDate(payoff.date), amount };
  return (
    <PaymentLine
      testID={`loan-history-payoff-${payoff.id ?? payoff.date}`}
      first={first}
      mark={<SourceChip source={payoff.source} />}
      title={kind}
      detail={t('loanFlow.view.payoffDetail', {
        date: pageDate(payoff.date, today),
        source: fromLine(payoff.source),
      })}
      amount={amount}
      spoken={
        payoff.source
          ? t('loanFlow.view.payoffA11y', { ...said, source: paidFromSpoken(payoff.source) })
          : t('loanFlow.view.payoffNoSourceA11y', said)
      }
      action={
        payoff.id && onRemove
          ? {
              onPress: onRemove,
              hint: payoff.latest
                ? t('loanFlow.view.payoffHint')
                : t('loanFlow.view.removeLaterFirst'),
            }
          : undefined
      }
    />
  );
}
