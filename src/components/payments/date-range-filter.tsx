import type { Href } from 'expo-router';
import { Calendar } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { ChoiceList, type ChoiceItem } from '@/components/payments/choice-list';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { Screen } from '@/components/ui/screen';
import { SelectField } from '@/components/ui/select-field';
import { t, type MessageKey } from '@/i18n';
import { formatFullDate, toIsoDate } from '@/lib/date';
import type { PickedRange } from '@/lib/payment-pick';
import { rangeBounds } from '@/lib/payment-search';

type Preset = Exclude<PickedRange, { from: string; to: string }>;
type Choice = Preset | 'custom';

const PRESET_WORDS: Record<Preset, MessageKey> = {
  any: 'payments.search.anyTime',
  thisMonth: 'payments.range.thisMonth',
  last3Months: 'payments.range.last3Months',
  thisYear: 'payments.range.thisYear',
  lastYear: 'payments.range.lastYear',
};
const PRESETS: readonly Preset[] = ['any', 'thisMonth', 'last3Months', 'thisYear', 'lastYear'];

const DAY = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

/** A route param as one string: expo-router hands a repeated one over as an array. */
function first(value: unknown): string | null {
  const one = Array.isArray(value) ? (value as unknown[])[0] : value;
  return typeof one === 'string' ? one : null;
}

/** A yyyy-mm-dd as local midnight: these days have no time zone. */
const localDay = (day: string) => new Date(`${day}T00:00:00`);

const spanOf = (from: string, to: string) =>
  t('payments.range.span', {
    from: formatFullDate(localDay(from)),
    to: formatFullDate(localDay(to)),
  });

export type RangeParams = { range: string; from?: string; to?: string };

/** A range as the filter page's link carries it: plain ASCII, so no language changes it. */
export function rangeParams(range: PickedRange): RangeParams {
  return typeof range === 'string'
    ? { range }
    : { range: 'custom', from: range.from, to: range.to };
}

/** The range a link asks for. Anything else, picked days out of order included, is any time. */
export function readRangeParams(params: {
  range?: unknown;
  from?: unknown;
  to?: unknown;
}): PickedRange {
  const range = first(params.range);
  const preset = PRESETS.find((value) => value === range);
  if (preset) return preset;
  if (range !== 'custom') return 'any';
  const from = first(params.from);
  const to = first(params.to);
  return from && to && DAY.test(from) && DAY.test(to) && from <= to ? { from, to } : 'any';
}

/** The date range page, opened for the search page `owner` with its range as it stands. */
export function dateRangeFilterHref(owner: string, range: PickedRange): Href {
  return { pathname: '/payment-filter', params: { type: 'date', owner, ...rangeParams(range) } };
}

/**
 * Which days a payment search covers. A ready-made range is handed back as soon as it is tapped;
 * picked days are handed back with Show payments, from the pinned footer. To never runs before From:
 * its calendar starts at From, and moving From past it brings To along.
 */
export function DateRangeFilter({
  initial,
  today,
  onPick,
}: {
  initial: PickedRange;
  today: string;
  onPick: (range: PickedRange) => void;
}) {
  const [choice, setChoice] = useState<Choice>(typeof initial === 'string' ? initial : 'custom');
  const [days, setDays] = useState(() =>
    typeof initial === 'string' ? { from: `${today.slice(0, 7)}-01`, to: today } : initial,
  );
  const [picking, setPicking] = useState<'from' | 'to' | null>(null);

  const items: ChoiceItem<Choice>[] = [
    ...PRESETS.map((preset) => {
      const { from, to } = rangeBounds(preset, today);
      return {
        value: preset,
        label: t(PRESET_WORDS[preset]),
        caption: from && to ? spanOf(from, to) : undefined,
      };
    }),
    { value: 'custom', label: t('payments.range.custom') },
  ];

  const choose = (value: Choice) => {
    setChoice(value);
    if (value !== 'custom') onPick(value);
  };

  const confirm = (date: Date) => {
    const day = toIsoDate(date);
    setDays((current) =>
      picking === 'from'
        ? { from: day, to: current.to < day ? day : current.to }
        : { from: current.from, to: day },
    );
    setPicking(null);
  };

  return (
    <Screen
      title={t('payments.search.dateRange')}
      showBack
      footer={
        choice === 'custom' ? (
          <Button
            label={t('payments.filter.apply')}
            onPress={() => onPick({ from: days.from, to: days.to })}
          />
        ) : undefined
      }
    >
      <ChoiceList
        items={items}
        value={choice}
        onChoose={choose}
        className="mt-4"
        testID="date-range"
      />

      {choice === 'custom' ? (
        <View className="mt-5 w-full gap-4">
          <SelectField
            label={t('payments.range.from')}
            value={formatFullDate(localDay(days.from))}
            icon={Calendar}
            onPress={() => setPicking('from')}
          />
          <SelectField
            label={t('payments.range.to')}
            value={formatFullDate(localDay(days.to))}
            icon={Calendar}
            onPress={() => setPicking('to')}
          />
        </View>
      ) : null}

      {picking ? (
        <DatePicker
          value={localDay(picking === 'from' ? days.from : days.to)}
          minDate={picking === 'to' ? localDay(days.from) : null}
          onCancel={() => setPicking(null)}
          onConfirm={confirm}
        />
      ) : null}
    </Screen>
  );
}
