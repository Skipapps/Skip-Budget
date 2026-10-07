import { fireEvent, render } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { Dimensions } from 'react-native';

import { BillRow } from '@/components/bills/bill-row';
import { ReceiptRow } from '@/components/receipts/receipt-row';
import { SubscriptionRow } from '@/components/subscriptions/subscription-row';
import type { Bill } from '@/data/bills-mock';
import { resetLocaleForTests } from '@/i18n/store';

/**
 * The bill, subscription and receipt lists at large text sizes: the name and its details wrap, and
 * once a word of the name cannot sit beside the amount and date, those move under the name.
 */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('@/providers/theme-provider', () => ({
  useColors: () => ({ body: '#333333' }),
  useMoneyColor: () => () => '#000000',
}));
jest.mock('@/components/brands/brand-mark', () => ({ BrandMark: () => null }));
jest.mock('@/components/brands/brand-logo', () => ({ BrandLogo: () => null }));
jest.mock('@/data/bills-mock', () => ({ getBillIcon: () => () => null }));

type Screen = Awaited<ReturnType<typeof render>>;

async function layout(screen: Screen, testID: string, width: number) {
  await fireEvent(screen.getByTestId(testID, { includeHiddenElements: true }), 'layout', {
    nativeEvent: { layout: { x: 0, y: 0, width, height: 20 } },
  });
}

const bill: Bill = {
  id: 'b1',
  name: 'Comcast Xfinity Internet',
  amount: -1234.5,
  dueDate: '2026-10-15',
  recurrence: 'monthly',
  categoryId: 'internet',
  sourceId: 's1',
};

type Case = {
  name: string;
  row: () => ReactElement;
  /** What the row shows: its name, details, amount and date. */
  texts: [name: string, detail: string, amount: string, date: string];
  /** The row's accessible label, to find the row's group box. */
  label: RegExp;
};

const CASES: Case[] = [
  {
    name: 'BillRow',
    row: () => <BillRow bill={bill} sourceLabel="Everyday ••1111" />,
    texts: ['Comcast Xfinity Internet', 'Monthly · Everyday ••1111', '-$1,234.50', '15 Oct 2026'],
    label: /^Comcast Xfinity Internet, /,
  },
  {
    name: 'SubscriptionRow',
    row: () => (
      <SubscriptionRow
        name="Paramount Plus Essential"
        amount={12.99}
        cycle="monthly"
        renewsOn="2026-10-15"
        sourceLabel="VISA ••4242"
      />
    ),
    texts: ['Paramount Plus Essential', 'Monthly · VISA ••4242', '$12.99', '15 Oct 2026'],
    label: /^Paramount Plus Essential, /,
  },
  {
    name: 'ReceiptRow',
    row: () => (
      <ReceiptRow
        merchant="Ticketmaster Entertainment"
        amount={1234.5}
        date="2026-10-15"
        sourceLabel="VISA ••4242"
      />
    ),
    texts: ['Ticketmaster Entertainment', 'VISA ••4242', '-$1,234.50', '15 Oct 2026'],
    label: /^Ticketmaster Entertainment, /,
  },
];

/** The name's room beside the amount and date and its widest word, then the row's box. */
async function layOut(screen: Screen, label: RegExp, room: number, word: number) {
  await layout(screen, 'fit-slot-name', room);
  await layout(screen, 'fit-copy-name', word);
  await layout(screen, 'fit-slot-detail', room);
  await layout(screen, 'fit-copy-detail', 70);
  await layout(screen, 'fit-slot-amount', 100);
  await layout(screen, 'fit-slot-date', 90);
  const row = screen.getByLabelText(label).parent;
  if (row) await fireEvent(row, 'layout', { nativeEvent: { layout: { width: 327 } } });
}

/** The slots in the name's column, top to bottom. */
const nameColumn = (screen: Screen) => {
  const column = screen.getByTestId('fit-slot-name').parent?.children ?? [];
  return ['name', 'amount', 'detail', 'date']
    .map((id) => ({ id, at: column.indexOf(screen.getByTestId(`fit-slot-${id}`)) }))
    .filter(({ at }) => at >= 0)
    .sort((a, b) => a.at - b.at)
    .map(({ id }) => id);
};

beforeEach(() => {
  resetLocaleForTests();
  const window = { width: 375, height: 812, scale: 3, fontScale: 1.4 };
  Dimensions.set({ window, screen: window });
});

describe.each(CASES)('$name at large text sizes', ({ row, texts, label }) => {
  it('wraps every line and prints the amount whole, with its cents', async () => {
    const screen = await render(row());
    for (const text of texts) {
      const node = screen.getByText(text);
      expect(node.props.numberOfLines).toBeUndefined();
      expect(node.props.adjustsFontSizeToFit).toBeUndefined();
      expect(node.props.maxFontSizeMultiplier).toBe(1.4);
    }
  });

  it('keeps the amount and date beside the name while its widest word fits', async () => {
    const screen = await render(row());
    await layOut(screen, label, 150, 140);
    expect(nameColumn(screen)).toEqual(['name', 'detail']);
  });

  it('puts the amount under the name and the date under the details when a word cannot fit', async () => {
    const screen = await render(row());
    await layOut(screen, label, 150, 170);
    expect(nameColumn(screen)).toEqual(['name', 'amount', 'detail', 'date']);
    expect(screen.getByText(texts[2])).toBeTruthy();
  });
});
