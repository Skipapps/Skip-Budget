import { router, useLocalSearchParams } from 'expo-router';
import { Pencil } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { Text, View } from 'react-native';

import { useHistoryFloor } from '@/api/history';
import { useReceipts, usePaymentSources, type ReceiptRow } from '@/api/queries';
import { useSpendCategories } from '@/api/brands';
import { BrandMark } from '@/components/brands/brand-mark';
import { ChangeLogoButton } from '@/components/brands/change-logo-button';
import { ChargeSection, DetailCard, type PlanDetailRow } from '@/components/plans/detail-parts';
import { HistoryNotice } from '@/components/pro/history-notice';
import { goBack } from '@/components/ui/back-button';
import { ChoiceChips } from '@/components/ui/choice-chips';
import { PageState } from '@/components/ui/page-state';
import { Screen } from '@/components/ui/screen';
import { SkeletonList } from '@/components/ui/skeleton';
import { t } from '@/i18n';
import { formatFullDate, toIsoDate } from '@/lib/date';
import { failureText } from '@/lib/failure';
import { formatCurrency } from '@/lib/format';
import { logoDomainOf } from '@/lib/logo-domain';
import { rangeFor } from '@/lib/range';
import { receiptCategoryName } from '@/lib/receipt-category';
import { receiptsFromStore } from '@/lib/receipt-store';
import { useMoneyColor } from '@/providers/theme-provider';
import { useArtwork } from '@/theme/artwork';
import { TEXT_CAP } from '@/theme/text-scale';

type Window = 'month' | 'year' | 'all';

/**
 * Calendar months and years as on a bill's page, plus All: a store's receipts are history, and "all
 * the times I went" is what this page is for. Opens on All so the receipt that was tapped is always
 * in the list.
 */
const WINDOWS = [
  {
    value: 'month',
    get label() {
      return t('dates.month');
    },
  },
  {
    value: 'year',
    get label() {
      return t('dates.year');
    },
  },
  {
    value: 'all',
    get label() {
      return t('dates.all');
    },
  },
] as const;

const asDate = (iso: string) => formatFullDate(new Date(`${iso}T00:00:00`));

/**
 * One receipt, whole, in the bill page's own style: what was bought and how it was paid, then every
 * receipt from the same store, old and new. Any receipt tapped, from the dashboard, Activity or the
 * receipts list, opens here; the header pencil opens the edit flow, Delete included.
 */
export default function ReceiptDetailScreen() {
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const artwork = useArtwork();
  const moneyColor = useMoneyColor();
  const receipts = useReceipts();
  const { sources } = usePaymentSources();
  const { data: categories = [] } = useSpendCategories();
  const [windowKey, setWindowKey] = useState<Window>('all');

  const receipt: ReceiptRow | null | undefined = receipts.data
    ? (receipts.data.find((row) => row.id === id) ?? null)
    : undefined;

  const today = toIsoDate(new Date());
  // Free lists 90 days back, Pro seven years; older receipts from the store stay stored.
  const { floor, free } = useHistoryFloor();
  const { history, inWindow, hiddenOlder } = useMemo(() => {
    if (!receipt || !receipts.data) return { history: [], inWindow: [], hiddenOlder: false };
    const fromStore = receiptsFromStore(receipts.data, receipt);
    const range = windowKey === 'all' ? null : rangeFor(windowKey, new Date(`${today}T00:00:00`));
    const inWindow = fromStore.filter(
      (row) => !range || (row.purchased_on >= range.from && row.purchased_on <= range.to),
    );
    return {
      history: inWindow.filter((row) => row.purchased_on >= floor),
      inWindow,
      hiddenOlder: free && inWindow.some((row) => row.purchased_on < floor),
    };
  }, [receipt, receipts.data, windowKey, today, floor, free]);

  // Deleted from its own edit flow: that flow steps back to here, and there is nothing left to
  // show, so take one more step back to the list it came from.
  const gone = !receipts.isPending && !receipts.isError && receipt === null;
  useEffect(() => {
    if (gone) goBack();
  }, [gone]);

  if (receipts.isPending || gone) {
    return (
      <Screen showBack>
        <SkeletonList rows={4} />
      </Screen>
    );
  }

  if (receipts.isError || !receipt) {
    return (
      <Screen showBack>
        <PageState
          art={artwork.error}
          title={failureText()}
          actionLabel={t('common.tryAgain')}
          onAction={() => void receipts.refetch()}
        />
      </Screen>
    );
  }

  const sourceLabel = (row: ReceiptRow) =>
    sources.find((option) => option.id === (row.card_id ?? row.bank_account_id))?.label;

  const details: PlanDetailRow[] = [
    {
      label: t('receipts.field.paidWith'),
      value: sourceLabel(receipt) ?? t('receipts.detail.noPaymentMethod'),
    },
    {
      label: t('receipts.field.category'),
      value: receiptCategoryName(
        receipt.category_id,
        categories.find((category) => category.id === receipt.category_id)?.label,
      ),
    },
  ];
  if (receipt.note?.trim()) {
    details.push({ label: t('receipts.field.note'), value: receipt.note.trim() });
  }

  const asLine = (row: ReceiptRow) => ({
    id: row.id,
    date: row.purchased_on,
    amount: -Math.abs(row.amount),
  });
  const lines = history.map(asLine);
  // The heading counts the whole window, as Pro sees it; a free list stops at 90 days.
  const wholeLines = inWindow.map(asLine);
  const rowById = new Map(history.map((row) => [row.id, row]));

  return (
    <Screen
      title={receipt.merchant}
      showBack
      onRefresh={() => void receipts.refetch()}
      headerActions={[
        {
          icon: Pencil,
          label: t('receipts.detail.edit', { name: receipt.merchant }),
          onPress: () => router.push({ pathname: '/add-receipt', params: { id } }),
        },
      ]}
    >
      <DetailCard
        mark={
          <ChangeLogoButton kind="receipt" id={id} name={receipt.merchant}>
            <BrandMark
              name={receipt.merchant}
              domain={logoDomainOf(receipt)}
              hidden={receipt.logo_hidden}
              size={52}
            />
          </ChangeLogoButton>
        }
        amount={formatCurrency(Math.abs(receipt.amount))}
        subtitle={t('receipts.detail.boughtOn', { date: asDate(receipt.purchased_on) })}
        rows={details}
      />

      <View className="mt-7 w-full">
        <ChoiceChips options={WINDOWS} value={windowKey} onChange={setWindowKey} />
      </View>

      {hiddenOlder ? <HistoryNotice className="mt-6" /> : null}

      {lines.length === 0 && !hiddenOlder ? (
        <Text
          className="mt-6 w-full text-center font-app text-[14px] text-muted"
          maxFontSizeMultiplier={TEXT_CAP.reading}
        >
          {t('receipts.detail.empty', { store: receipt.merchant })}
        </Text>
      ) : lines.length === 0 ? null : (
        <View className="w-full pb-10">
          <ChargeSection
            title={t('receipts.detail.history', { store: receipt.merchant })}
            entries={lines}
            whole={wholeLines}
            status={(entry) => {
              const row = rowById.get(entry.id);
              const paid = (row && sourceLabel(row)) ?? t('receipts.detail.noPaymentMethod');
              return entry.id === id ? `${paid} · ${t('receipts.detail.thisOne')}` : paid;
            }}
            moneyColor={moneyColor}
            testID="receipts-from-store"
            // Another receipt from this store opens its own page; this one is already open.
            onPress={(entry) =>
              entry.id === id
                ? undefined
                : () => router.push({ pathname: '/receipt/[id]', params: { id: entry.id } })
            }
          />
        </View>
      )}
    </Screen>
  );
}
