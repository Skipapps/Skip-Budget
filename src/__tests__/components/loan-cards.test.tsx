import { fireEvent, render, screen } from '@testing-library/react-native';
import { Dimensions } from 'react-native';

import { LoanCardRow } from '@/components/calculators/loan-section';
import { LoanTypeGrid } from '@/components/calculators/loan-type-grid';
import { MoreOptionsCard } from '@/components/calculators/more-options-card';
import { PaymentHeadline } from '@/components/calculators/payment-headline';
import { PaymentRow } from '@/components/calculators/payment-row';
import { SummaryGrid } from '@/components/calculators/summary-grid';
import { FitRows } from '@/components/ui/fit-group';
import { resetLocaleForTests, setLanguage } from '@/i18n/store';
import type { ScheduleRow } from '@/lib/loan';
import { TEXT_CAP } from '@/theme/text-scale';

/**
 * The loan cards' parts: the hooks the editable payment and per-payment pages plug into, and how
 * each part keeps every word and figure whole at the largest text size.
 */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('@/lib/haptics', () => ({ tap: jest.fn(), selection: jest.fn() }));
jest.mock('@/theme/loan-icons', () => ({
  useLoanIcons: () => new Proxy({}, { get: () => () => null }),
  useLoanTypeIcons: () => new Proxy({}, { get: () => () => null }),
}));
jest.mock('@/providers/theme-provider', () => ({
  useColors: () => new Proxy({}, { get: () => '#000000' }),
}));

type Screen = Awaited<ReturnType<typeof render>>;
type Host = ReturnType<Screen['getByTestId']>;

const ROW = {
  number: 1,
  date: '2026-10-09',
  days: 30,
  payment: 500.95,
  interest: 156.25,
  principal: 344.7,
  extra: 0,
  balance: 24_655.3,
  estimated: false,
} as ScheduleRow;

beforeAll(() => {
  const window = { width: 375, height: 812, scale: 3, fontScale: 1.4 };
  Dimensions.set({ window, screen: window });
});
beforeEach(() => resetLocaleForTests());

async function layout(testID: string, width: number) {
  await fireEvent(screen.getByTestId(testID, { includeHiddenElements: true }), 'layout', {
    nativeEvent: { layout: { x: 0, y: 0, width, height: 20 } },
  });
}

const classOf = (node: Host | null | undefined) => String(node?.props.className ?? '');

describe('the payment headline', () => {
  it('is plain text until the editable payment page is wired in', async () => {
    await render(<PaymentHeadline payment={500.95} size={32} />);
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByText('Monthly payment').props.maxFontSizeMultiplier).toBe(TEXT_CAP.control);
    expect(screen.getByText('$500.95').props.maxFontSizeMultiplier).toBe(TEXT_CAP.figure);
  });

  it('opens the editable payment page when given one', async () => {
    const onEdit = jest.fn();
    await render(<PaymentHeadline payment={500.95} size={32} onEdit={onEdit} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Monthly payment, $500.95. Edit' }));
    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it('draws "/ month" after the figure, and keeps its room on the figure’s line', async () => {
    await render(<PaymentHeadline payment={500.95} size={28} suffix="/ month" />);
    const suffix = screen.getByText('/ month');
    expect(suffix.props.maxFontSizeMultiplier).toBe(TEXT_CAP.row);
    // Beside the figure, inside the figure's own slot.
    expect(screen.getByTestId('fit-slot-payment').children).toContain(suffix);
  });
});

describe('a schedule row', () => {
  it('is read, not pressed, until the per-payment page is wired in', async () => {
    await render(<PaymentRow row={ROW} first />);
    expect(screen.queryByRole('button')).toBeNull();
    expect(
      screen.getByLabelText(
        'Payment 1, 9 Oct 2026, covering 30 days. $500.95: $156.25 interest, $344.70 off the balance. $24,655.30 left.',
      ),
    ).toBeTruthy();
  });

  it('opens that payment’s page when given one', async () => {
    const onPress = jest.fn();
    await render(<PaymentRow row={ROW} first onPress={onPress} />);
    await fireEvent.press(screen.getByRole('button', { name: /^Payment 1, 9 Oct 2026/ }));
    expect(onPress).toHaveBeenCalledWith(ROW);
  });

  it('tags a changed payment, and says so to VoiceOver', async () => {
    const onPress = jest.fn();
    await render(<PaymentRow row={{ ...ROW, overridden: true }} onPress={onPress} />);
    const tag = screen.getByText('Changed');
    expect(tag.props.maxFontSizeMultiplier).toBe(TEXT_CAP.control);
    const row = screen.getByRole('button', { name: /^Payment 1, .* Changed by you\.$/ });
    expect(row.props.accessibilityHint).toBe('Opens this payment so you can change it.');
  });

  it('has no tag for a payment as scheduled', async () => {
    await render(<PaymentRow row={ROW} />);
    expect(screen.queryByText('Changed')).toBeNull();
    expect(screen.queryByLabelText(/Changed by you/)).toBeNull();
  });

  it('takes the row ceiling for every line and cuts nothing', async () => {
    await render(<PaymentRow row={{ ...ROW, extra: 50 }} />);
    for (const line of [
      '9 Oct 2026',
      '$344.70 principal · $156.25 interest · $50.00 extra',
      '$500.95',
      '$24,655.30 left',
    ]) {
      const text = screen.getByText(line);
      expect([line, text.props.maxFontSizeMultiplier]).toEqual([line, TEXT_CAP.row]);
      expect(text.props.numberOfLines).toBeUndefined();
    }
  });
});

describe('the summary grid', () => {
  const ITEMS = [
    { id: 'borrowed', label: 'Borrowed', value: '$25,000' },
    { id: 'rate', label: 'Rate', value: '7.50%' },
    { id: 'term', label: 'Term', value: '5 years' },
    { id: 'payments', label: 'Payments', value: '60 mensuales' },
  ];
  const inGrid = () =>
    classOf(screen.getByTestId('fit-slot-rate-value').parent?.parent).includes('flex-1');

  async function measure(widest: Record<string, number>) {
    for (const item of ITEMS) {
      for (const part of ['label', 'value']) {
        await layout(`fit-slot-${item.id}-${part}`, 90);
        await layout(`fit-copy-${item.id}-${part}`, widest[`${item.id}-${part}`] ?? 50);
      }
    }
    await layout('grid', 300);
  }

  it('keeps its columns while every word fits its column', async () => {
    await render(<SummaryGrid items={ITEMS} columns={3} testID="grid" />);
    await measure({});
    expect(inGrid()).toBe(true);
  });

  it('puts every item on its own lines once one word cannot fit its column', async () => {
    await render(<SummaryGrid items={ITEMS} columns={3} testID="grid" />);
    await measure({ 'payments-value': 101 });
    expect(inGrid()).toBe(false);
    for (const item of ITEMS) expect(screen.getByText(item.value)).toBeTruthy();
  });
});

describe('the loan type grid', () => {
  const rowCount = () =>
    screen.container.queryAll((node) => classOf(node) === 'w-full flex-row gap-[8px]').length;
  const TYPES = [
    'personal',
    'car',
    'student',
    'home',
    'business',
    'medical',
    'credit-card',
    'other',
  ];

  async function measure(slot: number, widest: number) {
    for (const type of TYPES) {
      await layout(`fit-slot-type-${type}`, slot);
      await layout(`fit-copy-type-${type}`, type === 'student' ? widest : 40);
    }
    await layout('loan-type-grid', 327);
  }

  it('is four to a row while the names fit, shrinking together to no less than their size', async () => {
    setLanguage('es');
    await render(<LoanTypeGrid value="personal" onChange={() => {}} />);
    // "Estudiantil" is 100pt wide at the control ceiling (12pt × 1.3); 82pt of tile holds it at
    // 0.81 of that, 12.6pt, still above its 12pt design size.
    await measure(82, 100);
    expect(rowCount()).toBe(2);
    expect(screen.getByText('Estudiantil').props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ fontSize: expect.closeTo(12 * 0.81, 5) })]),
    );
  });

  it('goes two to a row when a name would have to go under its size', async () => {
    setLanguage('es');
    await render(<LoanTypeGrid value="personal" onChange={() => {}} />);
    await measure(60, 100);
    expect(rowCount()).toBe(4);
    expect(screen.getByText('Estudiantil').props.maxFontSizeMultiplier).toBe(TEXT_CAP.control);
  });

  it('says which type is chosen', async () => {
    const onChange = jest.fn();
    await render(<LoanTypeGrid value="car" onChange={onChange} />);
    expect(screen.getByRole('radio', { name: 'Car' }).props.accessibilityState).toEqual({
      selected: true,
      checked: true,
    });
    await fireEvent.press(screen.getByRole('radio', { name: 'Medical' }));
    expect(onChange).toHaveBeenCalledWith('medical');
  });
});

describe('a card row', () => {
  it('puts every value under its label once one label word cannot fit beside it', async () => {
    await render(
      <FitRows testID="rows">
        <LoanCardRow
          id="funded"
          first
          label="Money received"
          value="9 Sep 2026"
          onPress={() => {}}
        />
        <LoanCardRow id="first" label="First payment" value="9 Oct 2026" onPress={() => {}} />
      </FitRows>,
    );
    const beside = () =>
      classOf(screen.getByTestId('fit-slot-first-label').parent).includes('flex-row');
    expect(beside()).toBe(true);

    await layout('fit-slot-funded-label', 150);
    await layout('fit-copy-funded-label', 90);
    await layout('fit-slot-first-label', 60);
    await layout('fit-copy-first-label', 90);
    await layout('rows', 327);
    expect(beside()).toBe(false);
    // Read with its value, as one control.
    expect(screen.getByRole('button', { name: 'First payment, 9 Oct 2026. Edit' })).toBeTruthy();
  });
});

describe('More options', () => {
  it('says whether it is open, and draws its rows only when it is', async () => {
    const { rerender } = await render(
      <MoreOptionsCard open={false} onToggle={() => {}}>
        <></>
      </MoreOptionsCard>,
    );
    const header = screen.getByRole('button', { name: 'More options' });
    expect(header.props.accessibilityHint).toBe('Extra payments & fees');
    expect(header.props.accessibilityState).toEqual({ expanded: false });
    expect(screen.queryByTestId('loan-more-options')).toBeNull();
    for (const line of ['More options', 'Extra payments & fees']) {
      expect(screen.getByText(line).props.maxFontSizeMultiplier).toBe(TEXT_CAP.row);
    }
    expect(screen.getByText('Optional').props.maxFontSizeMultiplier).toBe(TEXT_CAP.control);

    await rerender(
      <MoreOptionsCard open onToggle={() => {}}>
        <></>
      </MoreOptionsCard>,
    );
    expect(screen.getByTestId('loan-more-options')).toBeTruthy();
  });
});
