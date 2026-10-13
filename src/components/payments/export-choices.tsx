import { useMemo, useState } from 'react';
import { AccessibilityInfo, Text, View } from 'react-native';

import { sharePayments, type ShareRequest } from '@/api/payment-export';
import { ChoiceList } from '@/components/payments/choice-list';
import { SectionCard } from '@/components/payments/section-card';
import { Button } from '@/components/ui/button';
import { PageState } from '@/components/ui/page-state';
import { RefreshNote } from '@/components/ui/refresh-note';
import { Screen } from '@/components/ui/screen';
import { Skeleton } from '@/components/ui/skeleton';
import { t, useLocale } from '@/i18n';
import { monthLong } from '@/i18n/calendar';
import { formatFullDate } from '@/lib/date';
import { failureMessage, failureText } from '@/lib/failure';
import { formatCurrency } from '@/lib/format';
import { ofKind, parseKind, parseYear, type PaymentEntry } from '@/lib/payment-entries';
import {
  exportRows,
  paymentsCsv,
  paymentsHtml,
  type ExportKind,
  type ExportWords,
} from '@/lib/payment-export';
import { paymentFloor } from '@/lib/payment-years';
import { useToday } from '@/lib/use-today';
import { useArtwork } from '@/theme/artwork';
import { TEXT_CAP } from '@/theme/text-scale';

export type ExportFormat = 'csv' | 'pdf';

/** What the page reads: the part of `usePayments` (api/payment-ledger) an export needs. */
export type ExportPayments = {
  /** Newest first, from the payment floor to today. */
  payments: readonly PaymentEntry[];
  /** Rows start here. On Pro it is the payment floor, so an export leaves nothing out. */
  listFloor: string;
  /** Null for no card or account, or one deleted since. */
  labelOf: (id: string) => string | null;
  isLoading: boolean;
  /** A read failed with nothing to show: the error page. */
  isError: boolean;
  /** A reload failed while the last payments still show: the note under the summary. */
  refreshFailed: boolean;
  refetch: () => void;
};

export type UseExportPayments = (today: string) => ExportPayments;

/** CSV or PDF, one ticked, each with what it is for. */
export function ExportChoices({
  value,
  onChoose,
}: {
  value: ExportFormat;
  onChoose: (format: ExportFormat) => void;
}) {
  return (
    <ChoiceList
      testID="export-choices"
      className="mt-6"
      items={[
        { value: 'csv', label: t('payments.export.csv'), caption: t('payments.export.csvHint') },
        { value: 'pdf', label: t('payments.export.pdf'), caption: t('payments.export.pdfHint') },
      ]}
      value={value}
      onChoose={onChoose}
    />
  );
}

const KIND_LABEL = {
  all: 'payments.export.everything',
  bill: 'payments.tabs.bills',
  subscription: 'payments.tabs.subscriptions',
} as const;

/** "October 2026": a statement's month heading, which can be any year. */
function monthHeading(month: string): string {
  return t('ui.calendar.monthYear', {
    month: monthLong(Number(month.slice(5, 7)) - 1),
    year: Number(month.slice(0, 4)),
  });
}

const fullDate = (iso: string) => formatFullDate(new Date(`${iso}T00:00:00`));

/**
 * Export (`?kind=all|bill|subscription&year=YYYY|all`): what will go out (the kind, the year, how
 * many payments), CSV or PDF, and one button that opens the share sheet. The route hands in
 * `usePayments`, so a test can hand in its own rows. Nothing is said on success: the share sheet is
 * the confirmation, and iOS reports a cancel the same way as a share.
 */
export function ExportScreen({
  kind: kindParam,
  year: yearParam,
  usePayments,
}: {
  kind: unknown;
  year: unknown;
  usePayments: UseExportPayments;
}) {
  const { today, todayDate } = useToday();
  const { currency } = useLocale();
  const artwork = useArtwork();
  const data = usePayments(today);
  const [format, setFormat] = useState<ExportFormat>('csv');
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const kind: ExportKind = parseKind(kindParam, 'all');
  const year: number | 'all' =
    yearParam === 'all' ? 'all' : parseYear(yearParam, today, paymentFloor(today));

  const rows = useMemo(
    () =>
      ofKind(data.payments, kind).filter(
        (row) => row.date >= data.listFloor && (year === 'all' || row.date.startsWith(`${year}-`)),
      ),
    [data.payments, data.listFloor, kind, year],
  );

  const kindLabel = t(KIND_LABEL[kind]);
  const yearText = year === 'all' ? t('payments.export.allYears') : String(year);
  const yearLabel = year === Number(today.slice(0, 4)) ? t('payments.history.thisYear') : yearText;
  const count = t('payments.count', { count: rows.length });
  const ready = !data.isLoading && !data.isError;

  /** The file for the rows shown, built from the words on screen. */
  const request = (): ShareRequest => {
    const words: ExportWords = {
      date: t('payments.export.col.date'),
      name: t('payments.export.col.name'),
      kind: t('payments.export.col.kind'),
      amount: t('payments.export.col.amount', { currency }),
      paidFrom: t('payments.export.col.paidFrom'),
      title: t('payments.history.title'),
      // A statement names the year it covers, not "This year": paper outlives the year.
      scope: t('payments.export.summary', { count, scope: [kindLabel, yearText].join(' · ') }),
      total: t('payments.export.total'),
      made: t('payments.export.made', { date: formatFullDate(todayDate) }),
    };
    const lines = exportRows(rows, {
      labelOf: data.labelOf,
      kindWord: {
        bill: t('payments.export.kind.bill'),
        subscription: t('payments.export.kind.subscription'),
        paidOff: t('payments.status.paidOff'),
        extraPayment: t('payments.status.extraPayment'),
      },
      notSet: t('payments.cardNotSet'),
    });
    const scope = { kind, year, dialogTitle: t('payments.export.title') };
    return format === 'csv'
      ? { ...scope, format, csv: paymentsCsv(lines, words) }
      : {
          ...scope,
          format,
          html: paymentsHtml(lines, words, {
            money: (amount) => formatCurrency(amount),
            date: fullDate,
            month: monthHeading,
          }),
        };
  };

  /** The failure line comes up out of sight of VoiceOver on iOS, so it is said as well. */
  const fail = () => {
    setFailed(true);
    AccessibilityInfo.announceForAccessibility(failureText());
  };

  const share = async () => {
    if (busy || rows.length === 0) return;
    setBusy(true);
    setFailed(false);
    try {
      // Lets "Preparing…" draw before a long history is turned into a file on this thread.
      await new Promise((resolve) => setTimeout(resolve, 0));
      const result = await sharePayments(request());
      if (result.status === 'failed') fail();
    } catch (thrown) {
      // Building the file happens out here, past sharePayments' own catch.
      failureMessage(thrown);
      fail();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen
      title={t('payments.export.title')}
      showBack
      footer={
        ready ? (
          // The failure sits right above the button that was pressed, so large text cannot scroll
          // it out of sight.
          <View className="w-full gap-2">
            {failed ? (
              <Text
                accessibilityRole="alert"
                className="w-full text-center font-app text-[13px] text-danger"
                maxFontSizeMultiplier={TEXT_CAP.reading}
              >
                {failureText()}
              </Text>
            ) : null}
            <Button
              label={busy ? t('payments.export.busy') : t('payments.export.title')}
              onPress={() => void share()}
              disabled={busy || rows.length === 0}
            />
          </View>
        ) : undefined
      }
    >
      {data.isError ? (
        <PageState
          art={artwork.error}
          title={failureText()}
          actionLabel={t('common.tryAgain')}
          onAction={data.refetch}
        />
      ) : data.isLoading ? (
        <View testID="export-loading" className="w-full">
          <Skeleton className="mt-3 h-[76px] w-full rounded-[20px]" />
          <Skeleton className="mt-6 h-[132px] w-full rounded-[20px]" />
        </View>
      ) : (
        <View className="w-full">
          <SectionCard className="mt-3" testID="export-summary">
            <View
              accessible
              accessibilityLabel={`${kindLabel}, ${count}, ${yearLabel}`}
              className="w-full px-[16px] py-[14px]"
            >
              <Text
                className="font-app-semibold text-[17px] text-ink"
                maxFontSizeMultiplier={TEXT_CAP.heading}
              >
                {kindLabel}
              </Text>
              <Text
                className="mt-[2px] font-app text-[13px] text-muted"
                maxFontSizeMultiplier={TEXT_CAP.row}
              >
                {t('payments.export.summary', { count, scope: yearLabel })}
              </Text>
            </View>
          </SectionCard>
          <RefreshNote show={data.refreshFailed} />

          {rows.length > 0 ? (
            <ExportChoices value={format} onChoose={setFormat} />
          ) : (
            <Text
              className="mt-6 w-full text-center font-app text-[15px] text-muted"
              maxFontSizeMultiplier={TEXT_CAP.reading}
            >
              {year === 'all'
                ? t('payments.export.noneAllYears')
                : t('payments.export.none', { scope: yearText })}
            </Text>
          )}
        </View>
      )}
    </Screen>
  );
}
