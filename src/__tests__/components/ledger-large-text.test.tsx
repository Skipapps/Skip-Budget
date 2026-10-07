import { fireEvent, render } from '@testing-library/react-native';
import { Dimensions, StyleSheet } from 'react-native';

import type { LedgerEntry } from '@/api/queries';
import { LedgerRow } from '@/components/transactions/ledger-row';
import { LedgerSummary } from '@/components/transactions/ledger-summary';
import { resetLocaleForTests, setCurrency, setLanguage } from '@/i18n/store';

/** The Activity tab's summary card and rows at large text sizes. */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('@/providers/theme-provider', () => ({
  useColors: () => ({ body: '#333333', moneyIn: '#00AA00', moneyOut: '#AA0000' }),
  useMoneyColor: () => () => '#000000',
}));
jest.mock('@/components/brands/brand-mark', () => ({ BrandMark: () => null }));
jest.mock('@/components/bills/bill-mark', () => ({ BillMark: () => null }));

const NBSP = '\u00A0';

type Screen = Awaited<ReturnType<typeof render>>;

async function layout(screen: Screen, testID: string, width: number) {
  await fireEvent(screen.getByTestId(testID, { includeHiddenElements: true }), 'layout', {
    nativeEvent: { layout: { x: 0, y: 0, width, height: 20 } },
  });
}

const sizeOf = (screen: Screen, text: string) =>
  StyleSheet.flatten(screen.getByText(text).props.style).fontSize as number;

function phone(width: number, fontScale: number) {
  const window = { width, height: 844, scale: 3, fontScale };
  Dimensions.set({ window, screen: window });
}

beforeEach(() => {
  resetLocaleForTests();
  phone(375, 1.3);
});
afterAll(() => resetLocaleForTests());

const totals = { in: 2000, out: 12345.67, net: -10345.67, count: 3 };

/** Montserrat SemiBold at 16pt x 1.2 for the figures, Medium at 12pt x 1.3 for the labels. */
const FIGURES = { Income: 87.4, Expenses: 115.2 };
const LABELS = { Income: 60.3, Expenses: 75.1 };

/** One layout pass with `room` points for each stat's text, then the two group boxes. */
async function layOutStats(screen: Screen, room: number) {
  for (const name of ['Income', 'Expenses'] as const) {
    // The label's slot also holds the 13pt icon and the gap beside it.
    await layout(screen, `fit-slot-${name}-label`, room + 19);
    await layout(screen, `fit-copy-${name}-label`, LABELS[name]);
    await layout(screen, `fit-slot-${name}-figure`, room);
    await layout(screen, `fit-copy-${name}-figure`, FIGURES[name]);
  }
  await layout(screen, 'ledger-stat-labels', 287);
  await layout(screen, 'ledger-stat-figures', 287);
}

/** Each Stat is the accessible element named by its label; stacked, their row is a column. */
const statsStacked = (screen: Screen) =>
  !String(screen.getByLabelText('Income, $2,000.00').parent?.props.className).includes('flex-row');

describe('LedgerSummary at large text sizes', () => {
  it('lets the verdict and the count pill follow the text size, whole', async () => {
    const screen = await render(<LedgerSummary totals={totals} />);
    for (const text of ['Short by', '3 transactions']) {
      const node = screen.getByText(text);
      expect(node.props.allowFontScaling).toBeUndefined();
      expect(node.props.numberOfLines).toBeUndefined();
      expect(node.props.maxFontSizeMultiplier).toBe(1.3);
    }
  });

  it('prints every figure whole, with its cents, and never shrinks one alone', async () => {
    const screen = await render(<LedgerSummary totals={totals} />);
    for (const figure of ['$10,345.67', '$2,000.00', '-$12,345.67']) {
      const node = screen.getByText(figure);
      expect(node.props.adjustsFontSizeToFit).toBeUndefined();
      expect(node.props.numberOfLines).toBeUndefined();
      expect(node.props.maxFontSizeMultiplier).toBe(1.2);
    }
  });

  it('shrinks the two figures together, side by side, when the wider one needs it', async () => {
    const screen = await render(<LedgerSummary totals={totals} />);
    // 113pt for text: "-$12,345.67" needs 115.2pt, so both go to 112 / 115.2 = 0.97.
    await layOutStats(screen, 113);

    expect(sizeOf(screen, '$2,000.00')).toBe(sizeOf(screen, '-$12,345.67'));
    expect(sizeOf(screen, '-$12,345.67')).toBeCloseTo(16 * 0.97, 5);
    expect(sizeOf(screen, 'Income')).toBe(sizeOf(screen, 'Expenses'));
    expect(statsStacked(screen)).toBe(false);
  });

  it('stacks the pair rather than take the figures under their default size', async () => {
    const screen = await render(<LedgerSummary totals={totals} />);
    // 75pt would need 16pt x 1.2 x 0.64 = 12.3pt, under the 16pt default.
    await layOutStats(screen, 75);
    expect(statsStacked(screen)).toBe(true);
    expect(screen.getByText('-$12,345.67')).toBeTruthy();
  });

  it('shrinks the headline alone when its line is too narrow, never cutting it', async () => {
    const screen = await render(<LedgerSummary totals={totals} />);
    await layout(screen, 'fit-slot-net', 150);
    await layout(screen, 'fit-copy-net', 200);
    await layout(screen, 'fit-figure-net', 150);
    expect(sizeOf(screen, '$10,345.67')).toBeCloseTo(26 * 0.74, 5);
  });
});

const ticket: LedgerEntry = {
  id: 'receipt-r1',
  label: 'Ticketmaster Entertainment',
  amount: -1234.5,
  date: '2026-09-10',
  kind: 'receipt',
  sourceId: 's1',
} as LedgerEntry;

/** The amount sits under the name: both in one column, name first. */
function amountUnderName(screen: Screen) {
  const name = screen.getByTestId('fit-slot-label');
  const amount = screen.getByTestId('fit-slot-amount');
  if (name.parent !== amount.parent) return false;
  const order = name.parent?.children ?? [];
  return order.indexOf(name) < order.indexOf(amount);
}

/** The name's room beside the amount and its widest word, then the row's box. */
async function layOutRow(screen: Screen, room: number, word: number) {
  await layout(screen, 'fit-slot-label', room);
  await layout(screen, 'fit-copy-label', word);
  await layout(screen, 'fit-slot-detail', room);
  await layout(screen, 'fit-copy-detail', 60);
  await layout(screen, 'fit-slot-amount', 104);
  const row = screen.getByLabelText(/^Ticketmaster Entertainment, /);
  if (row.parent)
    await fireEvent(row.parent, 'layout', { nativeEvent: { layout: { width: 327 } } });
}

describe('LedgerRow at large text sizes', () => {
  beforeEach(() => phone(375, 1.4));

  it('wraps the name and the details and prints the amount whole, with its cents', async () => {
    const screen = await render(
      <LedgerRow entry={ticket} sourceLabel="Everyday ••1111" kindLabel="Receipts" />,
    );
    for (const text of ['Ticketmaster Entertainment', 'Receipts · Everyday ••1111', '-$1,234.50']) {
      const node = screen.getByText(text);
      expect(node.props.numberOfLines).toBeUndefined();
      expect(node.props.maxFontSizeMultiplier).toBe(1.4);
    }
  });

  it('keeps the amount beside the name while its widest word fits', async () => {
    const screen = await render(
      <LedgerRow entry={ticket} sourceLabel="Everyday ••1111" kindLabel="Receipts" />,
    );
    await layOutRow(screen, 150, 140);
    expect(amountUnderName(screen)).toBe(false);
  });

  it('puts the amount under the name, before the details, when one word cannot fit', async () => {
    const screen = await render(
      <LedgerRow entry={ticket} sourceLabel="Everyday ••1111" kindLabel="Receipts" />,
    );
    await layOutRow(screen, 150, 160);
    expect(amountUnderName(screen)).toBe(true);

    const column = screen.getByTestId('fit-slot-label').parent?.children ?? [];
    const order = ['fit-slot-label', 'fit-slot-amount', 'fit-slot-detail'].map((id) =>
      column.indexOf(screen.getByTestId(id)),
    );
    expect(order).toEqual([...order].sort((a, b) => a - b));
    // VoiceOver reads the row as one sentence, the same whichever way it is drawn.
    expect(
      screen.getByLabelText('Ticketmaster Entertainment, Receipts, Everyday ••1111, -$1,234.50'),
    ).toBeTruthy();
  });

  it('keeps a French amount in one piece', async () => {
    setLanguage('fr');
    setCurrency('CAD');
    const screen = await render(
      <LedgerRow entry={ticket} sourceLabel="VISA ••4421" kindLabel="Reçus" />,
    );
    const amount = `-1${NBSP}234,50${NBSP}$`;
    expect(screen.getByText(amount).props.numberOfLines).toBeUndefined();
  });
});
