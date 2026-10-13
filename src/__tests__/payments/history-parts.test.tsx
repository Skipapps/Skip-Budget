import { fireEvent, render, screen, within } from '@testing-library/react-native';
import { router } from 'expo-router';

import { HistoryCard, historyCardSpoken } from '@/components/payments/history-card';
import { HistoryList } from '@/components/payments/history-list';
import {
  BAR_HEIGHT,
  FLAT_BAR,
  MonthBars,
  barHeights,
  monthInitial,
} from '@/components/payments/month-bars';
import { PaymentRow, paymentStatusText } from '@/components/payments/payment-row';
import { numberMarks } from '@/i18n';
import type { Language } from '@/i18n/config';
import { resetLocaleForTests, setLanguage } from '@/i18n/store';
import type { PaymentEntry } from '@/lib/payment-entries';
import { yearSummary, type YearSummary } from '@/lib/payment-years';
import { TEXT_CAP } from '@/theme/text-scale';

/**
 * Payment history's parts with design 3.png's figures: 2026 paid $18,548.81 over 67 payments,
 * $1,854.88 a month; October $1,205.99 and September $1,922.98, row by row.
 */

jest.mock('lucide-react-native', () => {
  const { createElement } = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return new Proxy(
    {},
    { get: (_target, name) => () => createElement(View, { testID: `icon-${String(name)}` }) },
  );
});
jest.mock('@/lib/haptics', () => ({ tap: jest.fn(), selection: jest.fn() }));
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('@/providers/theme-provider', () => {
  const colors = { ink: '#000001', muted: '#000002', onControl: '#FFFFFF' };
  return { useColors: () => colors, useTheme: () => ({ scheme: 'light', colors }) };
});
jest.mock('@/components/bills/bill-mark', () => {
  const { createElement } = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    BillMark: (props: Record<string, unknown>) =>
      createElement(View, { testID: 'bill-mark', mark: props }),
  };
});
jest.mock('@/components/brands/brand-mark', () => {
  const { createElement } = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    BrandMark: (props: Record<string, unknown>) =>
      createElement(View, { testID: 'brand-mark', mark: props }),
  };
});

type Json = { type: string; props: Record<string, unknown>; children: (Json | string)[] | null };
type Tree = Json | Json[] | null;

const hidden = { includeHiddenElements: true };
const CEILINGS = new Set<number>(Object.values(TEXT_CAP));
const classOf = (node: { props: Record<string, unknown> } | null | undefined) =>
  String(node?.props.className ?? '');

const TODAY = '2026-10-12';
const LABELS: Record<string, string> = { komal: 'Komal ••7010', discover: 'Discover ••6334' };
const labelOf = (id: string) => LABELS[id] ?? null;

function payment(
  over: Partial<PaymentEntry> & Pick<PaymentEntry, 'id' | 'date' | 'name' | 'amount'>,
): PaymentEntry {
  return {
    planName: over.name,
    kind: 'bill',
    status: 'paid',
    sourceId: '',
    planId: over.id.split('@')[0],
    categoryId: 'other',
    iconId: null,
    domain: null,
    logoHidden: false,
    ...over,
  };
}

const sub = (id: string, date: string, name: string, amount: number, sourceId = '') =>
  payment({ id: `${id}@${date}`, date, name, amount, kind: 'subscription', sourceId });
const bill = (id: string, date: string, name: string, amount: number, sourceId = '') =>
  payment({ id: `${id}@${date}`, date, name, amount, sourceId });

/** Design 3.png's October and September, newest first, as `usePayments` hands them over. */
const DESIGN_ROWS: PaymentEntry[] = [
  bill('nationwide', '2026-10-11', 'Nationwide', 145),
  sub('netflix', '2026-10-09', 'Netflix', 15.99),
  sub('spotify', '2026-10-09', 'Spotify', 10),
  bill('ashwood', '2026-10-01', 'Ashwood Hill Apartments', 1035, 'komal'),
  { ...bill('car', '2026-09-28', 'Car loan', 554, 'discover'), categoryId: 'loans' },
  bill('aep', '2026-09-22', 'AEP', 150, 'komal'),
  sub('icloud', '2026-09-15', 'iCloud+', 12.99, 'discover'),
  bill('nationwide', '2026-09-13', 'Nationwide', 145),
  sub('netflix', '2026-09-09', 'Netflix', 15.99),
  sub('spotify', '2026-09-09', 'Spotify', 10),
  bill('ashwood', '2026-09-01', 'Ashwood Hill Apartments', 1035, 'komal'),
];

/** The design's 2026 card: Jan–Jul $1,922.98, Aug $1,958.98, Sep $1,922.98, Oct $1,205.99. */
const DESIGN_YEAR: YearSummary = {
  year: 2026,
  total: 18548.81,
  count: 67,
  average: 1854.88,
  months: 10,
  bars: [...Array(7).fill(1922.98), 1958.98, 1922.98, 1205.99, 0, 0],
  highlight: 9,
};

beforeEach(() => {
  resetLocaleForTests();
  jest.clearAllMocks();
});

describe('the history card', () => {
  it('says what 2026 came to, as the design does', async () => {
    await render(<HistoryCard summary={DESIGN_YEAR} />);
    const card = screen.getByTestId('history-card-summary');
    for (const line of [
      'Paid in 2026',
      '$18,548.81',
      'Payments',
      '67',
      'Avg / month',
      '$1,854.88',
    ]) {
      expect(within(card).getAllByText(line, hidden).length).toBeGreaterThan(0);
    }
    expect(classOf(screen.getByTestId('history-card'))).toContain('bg-accent');
  });

  it('reads the year, then each month up to this one, as one stop', async () => {
    await render(<HistoryCard summary={DESIGN_YEAR} />);
    const spoken = screen.getByTestId('history-card-summary').props.accessibilityLabel;
    expect(spoken).toBe(historyCardSpoken(DESIGN_YEAR));
    expect(spoken).toMatch(
      /^Paid in 2026: \$18,548\.81\. 67 payments\. Average \$1,854\.88 a month\. By month: January \$1,922\.98, /,
    );
    expect(spoken).toContain('August $1,958.98, September $1,922.98, October $1,205.99');
    expect(spoken).not.toContain('November');
  });

  it('reads every month of a year gone by, and a single payment as one', () => {
    const past: YearSummary = { ...DESIGN_YEAR, year: 2025, count: 1, highlight: null };
    const spoken = historyCardSpoken(past);
    expect(spoken).toContain('Paid in 2025: $18,548.81. 1 payment.');
    expect(spoken).toContain('November $0.00, December $0.00');
  });

  it('writes a big count with the language’s grouping', async () => {
    await render(<HistoryCard summary={{ ...DESIGN_YEAR, count: 1234 }} />);
    expect(within(screen.getByTestId('history-count')).getByText('1,234', hidden)).toBeTruthy();
    setLanguage('fr');
    await render(<HistoryCard summary={{ ...DESIGN_YEAR, count: 1234 }} />);
    expect(
      within(screen.getByTestId('history-count')).getByText(`1${numberMarks().group}234`, hidden),
    ).toBeTruthy();
  });

  it('draws Drew’s figures to the cent: September’s first payment starts the average', async () => {
    const summary = yearSummary(DESIGN_ROWS, 2026, TODAY);
    // $3,128.97 over September and October: $1,564.485 rounds half up to $1,564.49.
    expect(summary.total).toBe(3128.97);
    await render(<HistoryCard summary={summary} />);
    const card = screen.getByTestId('history-card-summary');
    expect(within(card).getAllByText('$3,128.97', hidden).length).toBeGreaterThan(0);
    expect(within(card).getByText('$1,564.49', hidden)).toBeTruthy();
    expect(within(card).getByText('11', hidden)).toBeTruthy();
  });

  it('lets its two stats wrap under each other rather than shrink', async () => {
    await render(<HistoryCard summary={DESIGN_YEAR} />);
    expect(classOf(screen.getByTestId('history-count', hidden).parent)).toContain('flex-wrap');
  });
});

describe('the month bars', () => {
  it('sizes each month against the biggest, flat for months to come', () => {
    const heights = barHeights(DESIGN_YEAR.bars, 9);
    expect(heights[7]).toBe(BAR_HEIGHT);
    expect(heights[9]).toBe(Math.round((1205.99 / 1958.98) * BAR_HEIGHT));
    expect(heights.slice(10)).toEqual([FLAT_BAR, FLAT_BAR]);
  });

  it('keeps a small month visible, lays an empty one flat, and a past year has no months to come', () => {
    expect(barHeights([1000, 1, 0, ...Array(9).fill(0)], null).slice(0, 3)).toEqual([
      BAR_HEIGHT,
      6,
      FLAT_BAR,
    ]);
    expect(barHeights(Array(12).fill(0), 9)).toEqual(Array(12).fill(FLAT_BAR));
    expect(barHeights(Array(12).fill(10), null)).toEqual(Array(12).fill(BAR_HEIGHT));
    // A month still to come lies flat whatever it is handed.
    expect(barHeights(Array(12).fill(10), 9).slice(9)).toEqual([BAR_HEIGHT, FLAT_BAR, FLAT_BAR]);
  });

  it('draws this month solid white and the rest a third of white, out of VoiceOver’s way', async () => {
    await render(<MonthBars bars={DESIGN_YEAR.bars} highlight={9} />);
    const bars = screen.getByTestId('month-bars', hidden);
    expect(bars.props.accessibilityElementsHidden).toBe(true);
    expect(classOf(screen.getByTestId('month-bars-9', hidden))).toContain('bg-on-control');
    expect(classOf(screen.getByTestId('month-bars-9', hidden))).not.toContain('/35');
    expect(classOf(screen.getByTestId('month-bars-8', hidden))).toContain('bg-on-control/35');
    expect(screen.getByTestId('month-bars-11', hidden).props.style).toEqual({ height: FLAT_BAR });
  });

  it('names the months J to D, E to D in Spanish', async () => {
    expect(Array.from({ length: 12 }, (_, index) => monthInitial(index)).join('')).toBe(
      'JFMAMJJASOND',
    );
    setLanguage('es');
    expect(Array.from({ length: 12 }, (_, index) => monthInitial(index)).join('')).toBe(
      'EFMAMJJASOND',
    );
  });
});

describe('a payment row', () => {
  it('shows the design’s Nationwide: no card, paid, and reads it whole', async () => {
    const onOpen = jest.fn();
    await render(<PaymentRow payment={DESIGN_ROWS[0]} sourceLabel={null} onOpen={onOpen} />);
    const row = screen.getByRole('button', {
      name: 'Nationwide, $145.00, 11 Oct, Card not set, Paid',
    });
    expect(within(row).getByText('11 Oct · Card not set')).toBeTruthy();
    expect(within(row).getByText('$145.00')).toBeTruthy();
    expect(classOf(within(row).getByText('Paid'))).toContain('text-muted');
    await fireEvent.press(row);
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('names the card it came from, and the year when the list spans years', async () => {
    await render(<PaymentRow payment={DESIGN_ROWS[3]} sourceLabel="Komal ••7010" withYear />);
    expect(screen.getByText('1 Oct 2026 · Komal ••7010')).toBeTruthy();
  });

  it('says what a loan payoff was', () => {
    expect(paymentStatusText('paid')).toBe('Paid');
    expect(paymentStatusText('paidOff')).toBe('Paid off');
    expect(paymentStatusText('extraPayment')).toBe('Extra payment');
  });

  it('is no button when its plan is unknown', async () => {
    await render(<PaymentRow payment={DESIGN_ROWS[1]} sourceLabel={null} />);
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByLabelText('Netflix, $15.99, 9 Oct, Card not set, Paid')).toBeTruthy();
  });

  it('draws a bill’s own mark and a subscription’s logo, unless the owner hid it', async () => {
    await render(<PaymentRow payment={DESIGN_ROWS[4]} sourceLabel="Discover ••6334" />);
    expect(screen.getByTestId('bill-mark').props.mark).toEqual(
      expect.objectContaining({ categoryId: 'loans', name: 'Car loan' }),
    );
    await render(
      <PaymentRow payment={{ ...DESIGN_ROWS[1], logoHidden: true }} sourceLabel={null} />,
    );
    expect(screen.getByTestId('brand-mark').props.mark).toEqual(
      expect.objectContaining({ name: 'Netflix', hidden: true }),
    );
  });
});

describe('the history list', () => {
  it('groups by month, newest first, each with its whole total, rows newest first', async () => {
    await render(
      <HistoryList
        today={TODAY}
        year={2026}
        rows={DESIGN_ROWS}
        listFloor="2020-01-01"
        labelOf={labelOf}
      />,
    );
    expect(screen.getByRole('header', { name: 'October 2026, $1,205.99 paid' })).toBeTruthy();
    expect(screen.getByRole('header', { name: 'September 2026, $1,922.98 paid' })).toBeTruthy();
    expect(screen.getAllByRole('header').map((node) => node.props.accessibilityLabel)).toEqual([
      'October 2026, $1,205.99 paid',
      'September 2026, $1,922.98 paid',
    ]);

    const october = screen.getByTestId('history-2026-10');
    expect(
      within(october)
        .getAllByRole('button')
        .map((node) => String(node.props.accessibilityLabel).split(',')[0]),
    ).toEqual(['Nationwide', 'Netflix', 'Spotify', 'Ashwood Hill Apartments']);
    expect(within(october).getByText('1 Oct · Komal ••7010')).toBeTruthy();
    expect(screen.queryByText('Older history is saved')).toBeNull();
  });

  it('opens each payment’s plan: a bill, a loan, a subscription, a payoff its loan', async () => {
    const payoff = payment({
      id: 'payoff-1',
      date: '2026-09-30',
      name: 'Car loan',
      amount: 2000,
      status: 'paidOff',
      planId: 'car',
      categoryId: 'loans',
    });
    await render(
      <HistoryList
        today={TODAY}
        year={2026}
        rows={[...DESIGN_ROWS, payoff]}
        listFloor="2020-01-01"
        labelOf={labelOf}
      />,
    );
    await fireEvent.press(screen.getByTestId('payment-nationwide@2026-10-11'));
    expect(router.push).toHaveBeenLastCalledWith({
      pathname: '/bill/[id]',
      params: { id: 'nationwide' },
    });
    await fireEvent.press(screen.getByTestId('payment-car@2026-09-28'));
    expect(router.push).toHaveBeenLastCalledWith({ pathname: '/loan/[id]', params: { id: 'car' } });
    await fireEvent.press(screen.getByTestId('payment-netflix@2026-10-09'));
    expect(router.push).toHaveBeenLastCalledWith({
      pathname: '/subscription/[id]',
      params: { id: 'netflix' },
    });
    expect(within(screen.getByTestId('payment-payoff-1')).getByText('Paid off')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('payment-payoff-1'));
    expect(router.push).toHaveBeenLastCalledWith({ pathname: '/loan/[id]', params: { id: 'car' } });
  });

  it('on free, stops the rows at the floor, keeps the month’s whole total, and says older rows are kept', async () => {
    const july = [
      bill('rent', '2026-07-20', 'Rent', 1000),
      bill('rent', '2026-07-01', 'Rent early', 500),
      bill('rent', '2026-06-01', 'Rent', 1000),
    ];
    await render(
      <HistoryList
        today={TODAY}
        year={2026}
        rows={july}
        listFloor="2026-07-15"
        labelOf={labelOf}
      />,
    );
    expect(screen.getByRole('header', { name: 'July 2026, $1,500.00 paid' })).toBeTruthy();
    expect(screen.queryByRole('header', { name: /June/ })).toBeNull();
    expect(screen.queryByText('Rent early')).toBeNull();
    expect(screen.getByText('Older history is saved')).toBeTruthy();
  });

  it('shows a year wholly before the floor as the notice alone', async () => {
    await render(
      <HistoryList
        today={TODAY}
        year={2025}
        rows={[bill('rent', '2025-03-01', 'Rent', 1000)]}
        listFloor="2026-07-15"
        labelOf={labelOf}
      />,
    );
    expect(screen.queryByRole('header')).toBeNull();
    expect(screen.getByText('Older history is saved')).toBeTruthy();
    expect(screen.queryByTestId('history-list-none')).toBeNull();
  });

  it('says this year has nothing yet, and a year gone by had nothing', async () => {
    await render(
      <HistoryList today={TODAY} year={2026} rows={[]} listFloor="2026-07-15" labelOf={labelOf} />,
    );
    expect(screen.getByText('No payments in 2026 yet')).toBeTruthy();
    await render(
      <HistoryList today={TODAY} year={2024} rows={[]} listFloor="2020-01-01" labelOf={labelOf} />,
    );
    expect(screen.getByText('No payments in 2024.')).toBeTruthy();
    expect(screen.queryByText(/yet/)).toBeNull();
  });
});

describe('in every language, at large text', () => {
  it.each<Language>(['en', 'es', 'fr'])(
    '%s: each line at its role’s ceiling, never cut, never a raw key',
    async (language) => {
      setLanguage(language);
      await render(
        <>
          <HistoryCard summary={DESIGN_YEAR} />
          <HistoryList
            today={TODAY}
            year={2026}
            rows={DESIGN_ROWS}
            listFloor="2026-09-05"
            labelOf={labelOf}
          />
        </>,
      );
      const lines: string[] = [];
      const walk = (node: Json | string) => {
        if (typeof node === 'string') return;
        if (node.type === 'Text') {
          expect(CEILINGS.has(node.props.maxFontSizeMultiplier as number)).toBe(true);
          expect(node.props.numberOfLines).toBeUndefined();
          expect(node.props.adjustsFontSizeToFit).toBeUndefined();
          lines.push((node.children ?? []).filter((child) => typeof child === 'string').join(''));
        }
        node.children?.forEach(walk);
      };
      const tree = screen.toJSON() as Tree;
      (tree === null ? [] : Array.isArray(tree) ? tree : [tree]).forEach(walk);
      for (const line of lines) {
        expect(line).not.toMatch(/(payments|ui|pro)\.[a-z]/);
        expect(line).not.toMatch(/\{\w+\}/);
      }
    },
  );

  it('writes the history in Spanish and French', async () => {
    setLanguage('es');
    await render(
      <>
        <HistoryCard summary={DESIGN_YEAR} />
        <HistoryList
          today={TODAY}
          year={2026}
          rows={DESIGN_ROWS}
          listFloor="2020-01-01"
          labelOf={labelOf}
        />
      </>,
    );
    for (const line of ['Pagado en 2026', 'Pagos', 'Prom. / mes', 'octubre de 2026', 'Pagado']) {
      expect(screen.getAllByText(line, hidden).length).toBeGreaterThan(0);
    }
    expect(screen.getAllByText('11 oct · Sin tarjeta').length).toBeGreaterThan(0);

    setLanguage('fr');
    await render(
      <HistoryList
        today={TODAY}
        year={2026}
        rows={DESIGN_ROWS}
        listFloor="2020-01-01"
        labelOf={labelOf}
      />,
    );
    for (const line of ['octobre 2026', 'Payé', '11 oct. · Aucune carte']) {
      expect(screen.getAllByText(line).length).toBeGreaterThan(0);
    }
  });
});
