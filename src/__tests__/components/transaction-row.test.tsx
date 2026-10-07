import { fireEvent, render } from '@testing-library/react-native';
import { Dimensions } from 'react-native';

import { TransactionRow } from '@/components/dashboard/transaction-row';

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('@/components/brands/brand-mark', () => ({ BrandMark: () => null }));
jest.mock('@/components/bills/bill-mark', () => ({ BillMark: () => null }));
jest.mock('@/providers/theme-provider', () => ({
  useColors: () => ({ body: '#111111' }),
  useMoneyColor: () => () => '#000000',
}));

type Screen = Awaited<ReturnType<typeof render>>;

type Element = ReturnType<Screen['getByTestId']>;

async function layout(element: Element, width: number) {
  await fireEvent(element, 'layout', {
    nativeEvent: { layout: { x: 0, y: 0, width, height: 20 } },
  });
}

const part = (screen: Screen, testID: string) =>
  screen.getByTestId(testID, { includeHiddenElements: true });

/** The label's room beside the amount, its widest word, then the row's box. */
async function layOut(screen: Screen, room: number, word: number) {
  await layout(part(screen, 'fit-slot-label'), room);
  await layout(part(screen, 'fit-copy-label'), word);
  await layout(part(screen, 'fit-slot-kind'), room);
  await layout(part(screen, 'fit-copy-kind'), 60);
  await layout(part(screen, 'fit-slot-amount'), 104);
  // The group's box is the row's parent.
  const row = screen.getByLabelText('Ticketmaster Entertainment, -$1,234.50, Receipt');
  if (row.parent) await layout(row.parent as Element, 327);
}

const Row = () => (
  <TransactionRow label="Ticketmaster Entertainment" amount={-1234.5} kindLabel="Receipt" />
);

function amountUnderLabel(screen: Screen) {
  const label = screen.getByTestId('fit-slot-label');
  const amount = screen.getByTestId('fit-slot-amount');
  return label.parent === amount.parent;
}

describe('TransactionRow at large text sizes', () => {
  beforeEach(() => {
    const window = { width: 375, height: 812, scale: 3, fontScale: 1.4 };
    Dimensions.set({ window, screen: window });
  });

  it('wraps the name and prints the amount whole, with its cents', async () => {
    const screen = await render(<Row />);
    const name = screen.getByText('Ticketmaster Entertainment');
    expect(name.props.numberOfLines).toBeUndefined();
    expect(name.props.maxFontSizeMultiplier).toBe(1.4);
    expect(screen.getByText('Receipt').props.numberOfLines).toBeUndefined();
    expect(screen.getByText('-$1,234.50').props.numberOfLines).toBeUndefined();
  });

  it('keeps the amount beside the name while its widest word fits', async () => {
    const screen = await render(<Row />);
    await layOut(screen, 150, 140);
    expect(amountUnderLabel(screen)).toBe(false);
  });

  it('puts the amount under the name when one word cannot fit beside it', async () => {
    // "Entertainment" at 21pt is about 160pt; beside a 104pt amount it has 150pt.
    const screen = await render(<Row />);
    await layOut(screen, 150, 160);
    expect(amountUnderLabel(screen)).toBe(true);
    expect(screen.getByText('-$1,234.50')).toBeTruthy();
  });
});
