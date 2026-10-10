import { fireEvent, render, screen } from '@testing-library/react-native';

import LoanCalculatorScreen from '@/app/loan-calculator';
import { formatFullDate } from '@/lib/date';
import { formatCurrency } from '@/lib/format';
import { comparePrepayment, type LoanTerms } from '@/lib/loan';
import { resetLocaleForTests, setLanguage } from '@/i18n/store';

/**
 * The calculator as designed: the result card, The loan, Dates, More options opening in place, the
 * schedule card. Every figure on it is the engine's own, to the cent. A figure typed past a slider's
 * end is kept as typed (the thumb waits at the end); only an amount of zero or less and a missing
 * rate are refused, on the pad, with the reason shown.
 */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);
jest.mock('react-native-safe-area-context', () => ({
  ...jest.requireActual('react-native-safe-area-context'),
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@/lib/haptics', () => ({ tap: jest.fn(), selection: jest.fn() }));
jest.mock('@/theme/loan-icons', () => ({
  useLoanIcons: () => new Proxy({}, { get: () => () => null }),
}));
jest.mock('@/providers/theme-provider', () => ({
  useColors: () => new Proxy({}, { get: () => '#000000' }),
}));

const mockConfirm = jest.fn(async (_options: Record<string, string>) => true);
jest.mock('@/providers/dialog-provider', () => ({ useConfirm: () => mockConfirm }));

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  router: {
    push: (...args: unknown[]) => mockPush(...args),
    back: jest.fn(),
    canGoBack: () => true,
  },
}));

// 9 Oct 2026: the first payment defaults to today and the money to a month before.
const TODAY = new Date(2026, 9, 9, 9, 0);
jest.useFakeTimers().setSystemTime(TODAY);

const terms = (changes: Partial<LoanTerms> = {}): LoanTerms => ({
  principal: 25_000,
  annualRatePercent: 7.5,
  months: 60,
  firstPaymentOn: TODAY,
  fundedOn: new Date(2026, 8, 9, 9, 0),
  basis: 'actual/365',
  extra: { monthly: 0, lumpSums: [] },
  ...changes,
});

beforeEach(() => {
  resetLocaleForTests();
  jest.clearAllMocks();
});

async function typeOnPad(open: RegExp, keys: string[]) {
  await fireEvent.press(screen.getByLabelText(open));
  for (let i = 0; i < 12; i += 1) {
    const del = screen.queryByLabelText('Delete last digit');
    if (del) await fireEvent.press(del);
  }
  for (const key of keys) {
    await fireEvent.press(screen.getByLabelText(key === '.' ? 'Decimal point' : key));
  }
  await fireEvent.press(screen.getByRole('button', { name: 'Done' }));
}

/** How much of a slider's track is filled, once the slider knows its width. */
async function filledShare(index: number): Promise<number> {
  const classOf = (node: { props: { className?: unknown } }) => String(node.props.className);
  const track = screen.container.queryAll((node) =>
    classOf(node).startsWith('h-11 w-full justify-center'),
  )[index];
  await fireEvent(track, 'layout', { nativeEvent: { layout: { width: 300, height: 44 } } });
  const fill = screen.container.queryAll((node) =>
    classOf(node).startsWith('absolute h-1.5 rounded-full bg-control'),
  )[index];
  const { width } = [fill.props.style].flat()[0] as { width: number };
  return width / 300;
}

/** A finger landing on a slider's track, `x` points from its start. */
async function touch(index: number, x: number) {
  const track = screen.container.queryAll((node) =>
    String(node.props.className).startsWith('h-11 w-full justify-center'),
  )[index];
  const at = { touchActive: true, startPageX: x, startPageY: 0, startTimeStamp: 1 };
  const touchHistory = {
    numberActiveTouches: 1,
    indexOfSingleActiveTouch: 0,
    mostRecentTimeStamp: 1,
    touchBank: [
      {
        ...at,
        currentPageX: x,
        currentPageY: 0,
        currentTimeStamp: 1,
        previousPageX: x,
        previousPageY: 0,
        previousTimeStamp: 1,
      },
    ],
  };
  await fireEvent(track, 'responderGrant', { nativeEvent: { locationX: x }, touchHistory });
}

describe('the sliders', () => {
  it('curve the amount: $25,000 sits mid-track, rate and term run straight', async () => {
    await render(<LoanCalculatorScreen />);
    expect(await filledShare(0)).toBeCloseTo(Math.log(50) / Math.log(2000), 6);
    expect(await filledShare(1)).toBeCloseTo(7.5 / 30, 6);
    expect(await filledShare(2)).toBeCloseTo((60 - 6) / (480 - 6), 6);
  });

  it.each([
    [0, '$500', 0],
    [150, '$22,000', Math.log(44) / Math.log(2000)],
    [300, '$1,000,000', 1],
  ])(
    'drags the amount to a round figure and puts the thumb on it, at %ipt of 300',
    async (x, shown, share) => {
      await render(<LoanCalculatorScreen />);
      await filledShare(0);
      await touch(0, x);
      expect(screen.getByLabelText(`Loan amount, ${shown}. Edit`)).toBeTruthy();
      expect(await filledShare(0)).toBeCloseTo(share, 6);
    },
  );
});

describe('the result card', () => {
  it('shows the engine’s payment, count, last date, split and total, to the cent', async () => {
    await render(<LoanCalculatorScreen />);
    const { base } = comparePrepayment(terms());

    expect(screen.getAllByText(formatCurrency(base.payment)).length).toBeGreaterThan(0);
    expect(
      screen.getByText(
        `60 payments · last on ${formatFullDate(new Date(`${base.payoffOn}T00:00:00`))}`,
      ),
    ).toBeTruthy();
    expect(screen.getByText('$25,000.00')).toBeTruthy();
    expect(screen.getByText(formatCurrency(base.totalInterest))).toBeTruthy();
    expect(screen.getByText(formatCurrency(base.totalPaid))).toBeTruthy();
    // Today's defaults: $500.97 a month, $5,058.27 of interest.
    expect([base.payment, base.totalInterest]).toEqual([500.97, 5058.27]);
  });

  it('draws the borrowed and interest bar in proportion, out of VoiceOver’s way', async () => {
    await render(<LoanCalculatorScreen />);
    const bar = screen.getByTestId('loan-split-bar', { includeHiddenElements: true });
    expect(bar.props.accessibilityElementsHidden).toBe(true);
    const [borrowed, interest] = bar.children as unknown as {
      props: { style: { flex: number } };
    }[];
    expect([borrowed.props.style.flex, interest.props.style.flex]).toEqual([25_000, 5058.27]);
  });
});

describe('More options', () => {
  it('opens in place, on the same page, and closes again', async () => {
    await render(<LoanCalculatorScreen />);
    const header = screen.getByRole('button', { name: 'More options' });
    expect(header.props.accessibilityState).toEqual({ expanded: false });
    expect(screen.queryByText('Extra each month')).toBeNull();

    await fireEvent.press(header);
    expect(screen.getByRole('button', { name: 'More options' }).props.accessibilityState).toEqual({
      expanded: true,
    });
    for (const line of [
      'Extra each month',
      'Nothing extra',
      'One-off overpayment',
      'Fees paid upfront',
      'How interest is charged',
    ]) {
      expect(screen.getByText(line)).toBeTruthy();
    }
    expect(mockPush).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByRole('button', { name: 'More options' }));
    expect(screen.queryByText('Extra each month')).toBeNull();
  });

  it('prices an extra payment as the engine does and shows what it saves', async () => {
    await render(<LoanCalculatorScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'More options' }));
    await typeOnPad(/^Extra each month, Nothing extra\. Edit$/, ['1', '0', '0']);

    const comparison = comparePrepayment(terms({ extra: { monthly: 100, lumpSums: [] } }));
    expect(
      screen.getByText(
        `Plus $100.00 extra — ${formatCurrency(comparison.base.payment + 100)} leaves your account each month.`,
      ),
    ).toBeTruthy();
    expect(screen.getByText('If you overpay')).toBeTruthy();
    expect(screen.getByText(formatCurrency(comparison.interestSaved))).toBeTruthy();
    expect(
      screen.getAllByText(`${comparison.accelerated.rows.length} payments`, { exact: false })
        .length,
    ).toBeGreaterThan(0);
  });

  it('changes the line under it with the convention', async () => {
    await render(<LoanCalculatorScreen />);
    expect(screen.getByText('Interest is worked out daily on what you still owe.')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'More options' }));
    await fireEvent.press(screen.getByRole('radio', { name: 'Monthly rests' }));
    expect(screen.getByText('Interest is worked out monthly on what you still owe.')).toBeTruthy();
    // The design's own figures are the monthly-rests ones.
    expect(screen.getAllByText('$500.95').length).toBeGreaterThan(0);
  });
});

describe('loan numbers', () => {
  it.each(['en', 'es', 'fr'] as const)(
    'are typed, never uploaded: nothing in %s offers a file, a PDF, a photo or a scan',
    async (language) => {
      setLanguage(language);
      await render(<LoanCalculatorScreen />);
      await fireEvent.press(
        screen.getByRole('button', { name: /^(More options|Más opciones|Plus d’options)$/ }),
      );
      const said = JSON.stringify(screen.toJSON());
      expect(said).not.toMatch(
        /upload|subir|téléverse|télécharge|pdf|scan|escane|numéris|photo|foto|file|archivo|fichier/i,
      );
      expect(screen.queryByTestId('loan-upload-slot')).toBeNull();
    },
  );
});

describe('the schedule card', () => {
  it('opens the schedule with the loan, its extras and its fees', async () => {
    await render(<LoanCalculatorScreen />);
    expect(screen.getByText('See where all 60 payments go')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Payment schedule' }));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/loan-schedule',
      params: {
        amount: '25000',
        rate: '7.5',
        months: '60',
        start: '2026-10-09',
        funded: '2026-09-09',
        basis: 'actual/365',
        extra: '0',
        lump: '0',
        lumpOn: '2027-10-09',
        fees: '0',
        draft: expect.stringMatching(/^loan-\d+$/),
      },
    });
  });
});

describe('a figure typed past a slider’s end', () => {
  it('keeps an amount over 1,000,000 as typed, prices it, and saves it unclamped', async () => {
    await render(<LoanCalculatorScreen />);
    await typeOnPad(/^Loan amount, \$25,000\. Edit$/, [...'2500000']);

    expect(screen.getByLabelText('Loan amount, $2,500,000. Edit')).toBeTruthy();
    const { base } = comparePrepayment(terms({ principal: 2_500_000 }));
    expect(screen.getAllByText(formatCurrency(base.payment)).length).toBeGreaterThan(0);
    // The thumb waits at the end of the track.
    expect(await filledShare(0)).toBe(1);

    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    expect(mockPush).toHaveBeenCalledWith(
      expect.objectContaining({
        pathname: '/save-loan',
        params: expect.objectContaining({ amount: '2500000' }),
      }),
    );
  });

  it('keeps an amount under the slider’s 500 as typed', async () => {
    await render(<LoanCalculatorScreen />);
    await typeOnPad(/^Loan amount, /, [...'250']);
    expect(screen.getByLabelText('Loan amount, $250. Edit')).toBeTruthy();
    expect(await filledShare(0)).toBe(0);
  });

  it('keeps a rate over 30% as typed and prices it', async () => {
    await render(<LoanCalculatorScreen />);
    await typeOnPad(/^Interest rate, 7\.50%\. Edit$/, ['4', '5', '.', '2', '5']);

    expect(screen.getByLabelText('Interest rate, 45.25%. Edit')).toBeTruthy();
    const { base } = comparePrepayment(terms({ annualRatePercent: 45.25 }));
    expect(screen.getAllByText(formatCurrency(base.payment)).length).toBeGreaterThan(0);
    expect(await filledShare(1)).toBe(1);

    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    expect(mockPush).toHaveBeenCalledWith(
      expect.objectContaining({ params: expect.objectContaining({ rate: '45.25' }) }),
    );
  });

  it('refuses an amount of zero on the pad, saying why, and changes nothing', async () => {
    await render(<LoanCalculatorScreen />);
    await typeOnPad(/^Loan amount, /, ['0']);

    expect(screen.getByText('Type an amount above zero.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Done' })).toBeTruthy();
    // A key clears the reason; going back leaves the amount as it was.
    await fireEvent.press(screen.getByLabelText('5'));
    expect(screen.queryByText('Type an amount above zero.')).toBeNull();
    await fireEvent.press(screen.getByLabelText('Back'));
    expect(screen.getByLabelText('Loan amount, $25,000. Edit')).toBeTruthy();
  });

  it('refuses a rate with nothing typed, and takes zero as a rate', async () => {
    await render(<LoanCalculatorScreen />);
    await typeOnPad(/^Interest rate, /, []);
    expect(screen.getByText('Type a rate of zero or more.')).toBeTruthy();

    await fireEvent.press(screen.getByLabelText('0'));
    await fireEvent.press(screen.getByRole('button', { name: 'Done' }));
    expect(screen.getByLabelText('Interest rate, 0.00%. Edit')).toBeTruthy();
    expect(screen.getAllByText('$416.67').length).toBeGreaterThan(0);
  });
});
