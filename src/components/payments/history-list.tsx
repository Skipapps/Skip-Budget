import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { PaymentRow } from '@/components/payments/payment-row';
import { SectionCard } from '@/components/payments/section-card';
import { HistoryNotice } from '@/components/pro/history-notice';
import { t } from '@/i18n';
import { monthLong } from '@/i18n/calendar';
import { formatCurrency } from '@/lib/format';
import { paymentHref, type PaymentEntry } from '@/lib/payment-entries';
import { hidesOlder, monthGroups } from '@/lib/payment-years';
import { TEXT_CAP } from '@/theme/text-scale';

/** What the list reads: the fields `usePayments` returns. */
export type HistoryData = {
  /** Where listed rows start: 90 days back on free. */
  listFloor: string;
  /** Null for no card or account, or one deleted since. */
  labelOf: (id: string) => string | null;
};

/** "October 2026". */
function monthYearText(month: string): string {
  return t('ui.calendar.monthYear', {
    month: monthLong(Number(month.slice(5, 7)) - 1),
    year: Number(month.slice(0, 4)),
  });
}

/** A payment's page, when its plan is known. */
function openPayment(payment: PaymentEntry) {
  const href = paymentHref(payment);
  return href ? () => router.push(href) : undefined;
}

/**
 * One year's payments under the history card, by month, newest first, each month's whole total on
 * the right. Rows stop at the list floor and the history notice says older ones are kept; a year
 * wholly before it shows the notice alone. A year with nothing in it says so.
 */
export function HistoryList({
  year,
  today,
  rows,
  listFloor,
  labelOf,
  testID = 'history-list',
}: HistoryData & {
  year: number;
  /** A year gone by has had all its payments: "yet" is for this year only. */
  today: string;
  /** The whole year's payments of the kind shown, hidden ones too: the month totals are figures. */
  rows: readonly PaymentEntry[];
  testID?: string;
}) {
  const groups = monthGroups(rows, listFloor);
  const hidden = hidesOlder(rows, listFloor);
  const sourceOf = (id: string) => (id ? labelOf(id) : null);

  if (groups.length === 0 && !hidden) {
    return (
      <Text
        testID={`${testID}-none`}
        className="mt-6 w-full text-center font-app text-[14px] text-muted"
        maxFontSizeMultiplier={TEXT_CAP.reading}
      >
        {year < Number(today.slice(0, 4))
          ? t('payments.history.nonePast', { year })
          : t('payments.history.none', { year })}
      </Text>
    );
  }

  return (
    <View testID={testID} className="w-full">
      {groups.map((group) => {
        const month = monthYearText(group.month);
        const total = formatCurrency(group.total);
        return (
          <SectionCard
            key={group.month}
            testID={`history-${group.month}`}
            className="mt-6"
            title={month}
            caption={total}
            titleA11y={t('payments.history.monthA11y', { month, amount: total })}
          >
            {group.rows.map((payment) => (
              <PaymentRow
                key={payment.id}
                payment={payment}
                sourceLabel={sourceOf(payment.sourceId)}
                onOpen={openPayment(payment)}
              />
            ))}
          </SectionCard>
        );
      })}
      {hidden ? <HistoryNotice className="mt-6" /> : null}
    </View>
  );
}
