import { router } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { Fragment, useMemo, useState } from 'react';
import { Text, View } from 'react-native';

import { useArtwork } from '@/theme/artwork';
import { useBills, useLedger, usePaymentSources } from '@/api/queries';
import { TransactionRow } from '@/components/dashboard/transaction-row';
import { DateGroupHeader } from '@/components/ui/date-group-header';
import { FitFigure } from '@/components/ui/fit-group';
import { PageState } from '@/components/ui/page-state';
import { RangeDropdown } from '@/components/ui/range-dropdown';
import { Screen } from '@/components/ui/screen';
import { SkeletonList } from '@/components/ui/skeleton';
import { t } from '@/i18n';
import { toIsoDate } from '@/lib/date';
import { formatCurrency } from '@/lib/format';
import { groupByDate } from '@/lib/group';
import { rangeFor, type RangeKey } from '@/lib/range';
import { useMoneyColor } from '@/providers/theme-provider';
import { failureText } from '@/lib/failure';
import { TEXT_CAP } from '@/theme/text-scale';

/**
 * What the bills have cost over a window: it lists the times a bill landed (a monthly bill is one
 * line per month it ran), not the bills themselves. A charge opens its bill's page. The full list
 * of bills, including any with no charge in the window, is under Settings → Your money → Bills.
 */
export default function BillsScreen() {
  const artwork = useArtwork();
  const moneyColor = useMoneyColor();
  const [rangeKey, setRangeKey] = useState<RangeKey>('month');
  const today = toIsoDate(new Date());
  const range = useMemo(() => rangeFor(rangeKey, new Date()), [rangeKey]);

  const plans = useBills();
  const { entries, isLoading, isError, refetch } = useLedger(range, today);
  const { sources } = usePaymentSources();

  const sourceLabels = useMemo(
    () => new Map(sources.map((source) => [source.id, source.label])),
    [sources],
  );

  const charges = useMemo(() => entries.filter((entry) => entry.kind === 'bill'), [entries]);
  const total = charges.reduce((sum, entry) => sum + entry.amount, 0);

  // Oldest day first, today last; stated rather than relying on groupByDate's default.
  const groups = useMemo(
    () =>
      groupByDate(charges, (entry) => entry.date, {
        amountOf: (e) => e.amount,
        direction: 'asc',
      }),
    [charges],
  );

  const planCount = plans.data?.length ?? 0;

  return (
    <Screen
      title={t('bills.charged.title')}
      showBack
      onRefresh={refetch}
      headerActions={[
        { icon: Plus, label: t('bills.addBill'), onPress: () => router.push('/add-bill') },
      ]}
    >
      <View className="mt-3 w-full rounded-[16px] bg-ink/[0.035] px-4 py-4">
        <View className="w-full flex-row items-start justify-between gap-3">
          <View className="min-w-0 flex-1">
            <Text
              className="font-app text-[13px] text-muted"
              maxFontSizeMultiplier={TEXT_CAP.control}
            >
              {t('bills.charged.label')}
            </Text>
            <FitFigure
              id="total"
              size={26}
              // text-ink underneath: a zero total gets no money colour, and an unstyled figure is
              // black, invisible in dark mode.
              className="font-app-bold text-ink"
              style={{ color: moneyColor(total) }}
              boxClassName="mt-0.5"
            >
              {formatCurrency(total)}
            </FitFigure>
          </View>
          <RangeDropdown value={rangeKey} onChange={setRangeKey} />
        </View>

        <Text
          className="mt-2 font-app text-[12px] text-muted"
          maxFontSizeMultiplier={TEXT_CAP.reading}
        >
          {charges.length === 0
            ? t('bills.charged.nothing')
            : t('bills.charged.count', { count: charges.length })}
        </Text>
      </View>

      {isLoading ? <SkeletonList rows={5} /> : null}

      {isError ? (
        <PageState
          art={artwork.error}
          title={failureText()}
          actionLabel={t('common.tryAgain')}
          onAction={refetch}
        />
      ) : null}

      {!isLoading && !isError && charges.length === 0 ? (
        <PageState
          art={artwork.emptyBills}
          title={planCount === 0 ? t('bills.noBillsYet') : t('bills.charged.nothing')}
          message={
            planCount === 0 ? t('bills.charged.emptyMessage') : t('bills.charged.windowMessage')
          }
          actionLabel={planCount === 0 ? t('bills.addABill') : undefined}
          onAction={planCount === 0 ? () => router.push('/add-bill') : undefined}
        />
      ) : null}

      {!isLoading && !isError && charges.length > 0 ? (
        <View className="w-full pb-10">
          {groups.map((group) => (
            <View key={group.date || 'undated'} className="w-full">
              <DateGroupHeader date={group.date} today={today} total={group.total} />
              {group.items.map((entry, index) => (
                <Fragment key={entry.id}>
                  {index > 0 ? <View className="ml-[52px] h-px bg-line/60" /> : null}
                  <TransactionRow
                    label={entry.label}
                    amount={entry.amount}
                    kindLabel={sourceLabels.get(entry.sourceId) ?? t('bills.noPaymentMethod')}
                    kind="bill"
                    domain={entry.domain}
                    categoryId={entry.categoryId}
                    iconId={entry.iconId}
                    onPress={entry.planId ? () => router.push(`/bill/${entry.planId}`) : undefined}
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
