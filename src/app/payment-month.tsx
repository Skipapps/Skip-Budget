import { useLocalSearchParams } from 'expo-router';
import { useRef } from 'react';
import { ScrollView, View, type LayoutChangeEvent } from 'react-native';

import { useHistoryFloor } from '@/api/history';
import { ChoiceList, type ChoiceItem } from '@/components/payments/choice-list';
import { ProFooter } from '@/components/payments/pro-footer';
import { goBack } from '@/components/ui/back-button';
import { Screen } from '@/components/ui/screen';
import { t } from '@/i18n';
import { monthLong } from '@/i18n/calendar';
import { monthChoices, monthOf } from '@/lib/bill-month';
import { pickPayment } from '@/lib/payment-pick';
import { paymentFloor } from '@/lib/payment-years';
import { useNavigateOnce } from '@/lib/use-navigate-once';
import { useToday } from '@/lib/use-today';

/** The page's own gutter (Screen's px-6), which the scroller reaches past so it scrolls edge to edge. */
const GUTTER = 24;

/** A ticked month brought into view sits a third of the way down, the months around it in sight. */
const LIFT = 1 / 3;

/** "October 2026". */
function monthYear(month: string): string {
  return t('ui.calendar.monthYear', {
    month: monthLong(Number(month.slice(5, 7)) - 1),
    year: Number(month.slice(0, 4)),
  });
}

/** Months grouped by year, in the order given. */
function byYear(months: readonly string[]): { year: string; months: string[] }[] {
  const groups: { year: string; months: string[] }[] = [];
  for (const month of months) {
    const year = month.slice(0, 4);
    const last = groups[groups.length - 1];
    if (last?.year === year) last.months.push(month);
    else groups.push({ year, months: [month] });
  }
  return groups;
}

type Seen = {
  viewport?: number;
  /** Each card's top in the scroller. */
  blocks: Map<string, number>;
  /** The ticked row, in its card. */
  row?: { block: string; top: number; height: number };
  done: boolean;
};

/**
 * Choose month (`?owner=…&selected=yyyy-mm`), for the Monthly bills and Subscriptions pages. This
 * month first, then the coming months soonest first, then the past by year, newest first: back as
 * far as the plan lists (90 days on free, seven calendar years on Pro). A ticked month further down
 * is scrolled into view on open. A month is only how that page looks, so it is handed back to the
 * page that opened this one, and nothing is saved.
 */
export default function PaymentMonthScreen() {
  const params = useLocalSearchParams<{ owner?: string; selected?: string }>();
  const { today } = useToday();
  const { floor, free } = useHistoryFloor();
  const once = useNavigateOnce();
  const owner = typeof params.owner === 'string' ? params.owner : '';
  const current = monthOf(today);
  const months = monthChoices(today, free ? floor : paymentFloor(today), 12);
  const coming = months.filter((month) => month > current).reverse();
  const past = byYear(months.filter((month) => month < current));
  // A month the plan does not list (one left from Pro on a free account) has no row to tick.
  const selected = typeof params.selected === 'string' ? params.selected : current;

  const scroller = useRef<ScrollView>(null);
  const seen = useRef<Seen>({ blocks: new Map(), done: false });

  // Once, when the scroller, the ticked row and its card have all been laid out.
  const settle = () => {
    const now = seen.current;
    if (now.done || now.viewport === undefined || !now.row) return;
    const card = now.blocks.get(now.row.block);
    if (card === undefined) return;
    now.done = true;
    const top = card + now.row.top;
    if (top + now.row.height <= now.viewport) return;
    scroller.current?.scrollTo({ y: Math.max(0, top - now.viewport * LIFT), animated: false });
  };
  const placeBlock = (key: string, event: LayoutChangeEvent) => {
    seen.current.blocks.set(key, event.nativeEvent.layout.y);
    settle();
  };
  const placeTicked = (key: string, top: number, height: number) => {
    seen.current.row = { block: key, top, height };
    settle();
  };

  const choose = (month: string) =>
    once(() => {
      if (owner) pickPayment({ owner, type: 'month', month });
      goBack();
    });

  const named = (month: string): ChoiceItem<string> => ({ value: month, label: monthYear(month) });
  const inYear = (month: string): ChoiceItem<string> => ({
    value: month,
    label: monthLong(Number(month.slice(5, 7)) - 1),
    accessibilityLabel: monthYear(month),
  });

  return (
    <Screen title={t('payments.picker.monthTitle')} showBack scrollable={false}>
      <ScrollView
        ref={scroller}
        testID="month-scroller"
        className="-mx-6 flex-1"
        contentContainerStyle={{ paddingHorizontal: GUTTER, paddingBottom: 16 }}
        showsVerticalScrollIndicator={false}
        onLayout={(event) => {
          seen.current.viewport = event.nativeEvent.layout.height;
          settle();
        }}
      >
        <View
          testID="block-this"
          className="mt-3 w-full"
          onLayout={(event) => placeBlock('this', event)}
        >
          <ChoiceList
            testID="this-month"
            items={[
              {
                value: current,
                label: t('payments.picker.thisMonth'),
                caption: monthYear(current),
              },
            ]}
            value={selected}
            onChoose={choose}
            onTickedLayout={(top, height) => placeTicked('this', top, height)}
          />
        </View>

        {coming.length > 0 ? (
          <View
            testID="block-coming"
            className="mt-6 w-full"
            onLayout={(event) => placeBlock('coming', event)}
          >
            <ChoiceList
              testID="coming-months"
              title={t('payments.picker.comingMonths')}
              items={coming.map(named)}
              value={selected}
              onChoose={choose}
              onTickedLayout={(top, height) => placeTicked('coming', top, height)}
            />
          </View>
        ) : null}

        {past.map((group) => (
          <View
            key={group.year}
            testID={`block-${group.year}`}
            className="mt-6 w-full"
            onLayout={(event) => placeBlock(group.year, event)}
          >
            <ChoiceList
              testID={`months-${group.year}`}
              title={group.year}
              items={group.months.map(inYear)}
              value={selected}
              onChoose={choose}
              onTickedLayout={(top, height) => placeTicked(group.year, top, height)}
            />
          </View>
        ))}

        {free ? (
          <ProFooter className="mb-4 mt-6" label={t('payments.picker.olderMonthsPro')} />
        ) : null}
      </ScrollView>
    </Screen>
  );
}
