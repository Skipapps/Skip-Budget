import { fireEvent, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';

import LoanPaymentScreen from '@/app/loan-payment';
import { t } from '@/i18n';
import type { Language } from '@/i18n/config';
import { resetLocaleForTests, setLanguage } from '@/i18n/store';
import {
  readLoanDraft,
  resetLoanDraftForTests,
  startLoanDraft,
  updateLoanDraft,
} from '@/lib/loan-draft';
import { formatCurrency } from '@/lib/format';
import { checkOverride } from '@/lib/loan-overrides';
import { TEXT_CAP } from '@/theme/text-scale';

/**
 * The page for the bank's monthly payment and the page for one payment of the schedule, on Drew's
 * car loan: $32,001 at 7.5% over 72 months, first payment 15 Mar 2026. With the money received a
 * month before (the calculator's default) Skip works out $553.21; the bank's figure is $554.23.
 * Done writes the open calculator's draft and goes back; a refused figure stays, with the reason.
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

const mockBack = jest.fn();
let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => mockParams,
  router: { back: () => mockBack(), canGoBack: () => true, push: jest.fn() },
}));

const NBSP = ' ';
const RAW = { normalizer: (text: string) => text };

/** The calculator's default dates: money a month before the first payment. */
const CAR = {
  amount: '32001',
  rate: '7.5',
  months: '72',
  start: '2026-03-15',
  funded: '2026-02-15',
  basis: 'actual/365',
};
/** The bank's own dates: a 37-day opening period, $243.30 of interest in payment 1. */
const CAR_BANK = { ...CAR, funded: '2026-02-06' };

let draft = '';

/** The least monthly payment the engine takes on the car loan, as the page must quote it. */
const LEAST = (() => {
  const refused = checkOverride(
    {
      principal: 32_001,
      annualRatePercent: 7.5,
      months: 72,
      firstPaymentOn: new Date(2026, 2, 15),
      fundedOn: new Date(2026, 1, 15),
      basis: 'actual/365',
    },
    {},
    'monthly',
    150,
  );
  if (refused?.reason !== 'below-interest' || refused.minimum === undefined) {
    throw new Error('the car loan should refuse $150 a month');
  }
  return refused.minimum;
})();
const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');

function open(params: Record<string, string>) {
  mockParams = { ...params, draft };
  return render(<LoanPaymentScreen />);
}

const typeInto = (shown: string, text: string) =>
  fireEvent.changeText(screen.getAllByDisplayValue(shown)[0], text);

beforeEach(() => {
  resetLocaleForTests();
  resetLoanDraftForTests();
  jest.clearAllMocks();
  draft = startLoanDraft();
});

describe('the monthly payment', () => {
  it('shows Skip’s figure and takes the bank’s payment', async () => {
    await open({ ...CAR, target: 'monthly' });
    expect(screen.getByText('Monthly payment')).toBeTruthy();
    expect(screen.getByText('Skip’s figure')).toBeTruthy();
    expect(screen.getByText('$553.21')).toBeTruthy();
    expect(screen.getByText('Your bank’s payment')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Use Skip’s figure' })).toBeNull();

    await typeInto('', '554.23');
    await fireEvent.press(screen.getByRole('button', { name: 'Use this payment' }));
    expect(readLoanDraft(draft)).toEqual({ monthlyPayment: 554.23 });
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('refuses a payment that cannot keep up with the interest, with the least it can be', async () => {
    await open({ ...CAR, target: 'monthly' });
    await typeInto('', '150');
    await fireEvent.press(screen.getByRole('button', { name: 'Use this payment' }));

    const reason = `That can’t keep up with this loan’s interest. The least it can be is ${formatCurrency(LEAST)}.`;
    expect(screen.getByText(reason)).toBeTruthy();
    expect(screen.getByText(reason).props.maxFontSizeMultiplier).toBe(TEXT_CAP.reading);
    expect(announce).toHaveBeenCalledWith(reason);
    expect(readLoanDraft(draft)).toEqual({});
    expect(mockBack).not.toHaveBeenCalled();

    // The reason goes as soon as the figure changes, and the least it can be is taken.
    await typeInto('150', String(LEAST));
    expect(screen.queryByText(reason)).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Use this payment' }));
    expect(readLoanDraft(draft)).toEqual({ monthlyPayment: LEAST });
  });

  it('refuses nothing typed as no payment at all', async () => {
    await open({ ...CAR, target: 'monthly' });
    await fireEvent.press(screen.getByRole('button', { name: 'Use this payment' }));
    expect(screen.getByText('Type an amount above zero.')).toBeTruthy();
    expect(mockBack).not.toHaveBeenCalled();
  });

  it('takes Skip’s own figure typed back as no change', async () => {
    updateLoanDraft(draft, { monthlyPayment: 554.23, payments: { 12: 10_000 } });
    await open({ ...CAR, target: 'monthly' });
    await typeInto('554.23', '553.21');
    await fireEvent.press(screen.getByRole('button', { name: 'Use this payment' }));
    expect(readLoanDraft(draft)).toEqual({ payments: { 12: 10_000 } });
  });

  it('starts on the bank’s payment when there is one, and Use Skip’s figure clears it', async () => {
    updateLoanDraft(draft, { monthlyPayment: 554.23, payments: { 12: 10_000 } });
    await open({ ...CAR, target: 'monthly' });
    expect(screen.getByDisplayValue('554.23')).toBeTruthy();
    expect(screen.getAllByText('$554.23').length).toBeGreaterThan(0);

    await fireEvent.press(screen.getByRole('button', { name: 'Use Skip’s figure' }));
    expect(readLoanDraft(draft)).toEqual({ payments: { 12: 10_000 } });
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it.each([
    [
      'es' as const,
      'Usar este pago',
      () =>
        `Eso no alcanza para cubrir los intereses de este préstamo. Lo mínimo posible es ${formatCurrency(LEAST)}.`,
    ],
    [
      'fr' as const,
      'Utiliser ce paiement',
      () =>
        `Cela ne suffit pas à couvrir les intérêts de ce prêt. Le minimum possible est ${formatCurrency(LEAST)}.`,
    ],
  ])('says why in %s', async (language: Language, use, reason) => {
    setLanguage(language);
    await open({ ...CAR, target: 'monthly' });
    await typeInto('', '150');
    await fireEvent.press(screen.getByRole('button', { name: use }));
    // Written in the language once it is set.
    expect(screen.getByText(reason(), RAW)).toBeTruthy();
  });

  it('says the loan is no longer open when its calculator is gone, and offers nothing to change', async () => {
    mockParams = { ...CAR, target: 'monthly', draft: 'loan-999' };
    await render(<LoanPaymentScreen />);
    expect(screen.getByText(t('loan.payment.gone'))).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Use this payment' })).toBeNull();
  });
});

describe('one payment of the schedule', () => {
  it('shows what the payment is now, the least it can be and what pays the loan off', async () => {
    await open({ ...CAR_BANK, target: '1' });
    for (const line of [
      'Payment 1',
      '15 Mar 2026',
      'Regular payment',
      '$554.23',
      'Interest this time',
      'The least it can be',
      'Pays the loan off',
      // 32,001 + 243.30 of interest over the 37-day opening period.
      '$32,244.30',
      'Anything above $32,244.30 pays the loan off, and is taken as $32,244.30.',
    ]) {
      expect([line, screen.queryAllByText(line).length > 0]).toEqual([line, true]);
    }
    expect(screen.getAllByText('$243.30')).toHaveLength(2);
    // The field starts on the payment as it is.
    expect(screen.getByDisplayValue('554.23')).toBeTruthy();
  });

  it('refuses a payment that leaves interest unpaid, with the least it can be', async () => {
    await open({ ...CAR_BANK, target: '1' });
    await typeInto('554.23', '200');
    await fireEvent.press(screen.getByRole('button', { name: 'Use this payment' }));
    const reason = 'That doesn’t cover this payment’s interest. The least it can be is $243.30.';
    expect(screen.getByText(reason)).toBeTruthy();
    expect(announce).toHaveBeenCalledWith(reason);
    expect(readLoanDraft(draft)).toEqual({});
  });

  it('takes a bigger payment and keeps the other changes', async () => {
    updateLoanDraft(draft, { monthlyPayment: 600, payments: { 3: 700 } });
    await open({ ...CAR_BANK, target: '12' });
    await typeInto('600', '10000');
    await fireEvent.press(screen.getByRole('button', { name: 'Use this payment' }));
    expect(readLoanDraft(draft)).toEqual({ monthlyPayment: 600, payments: { 3: 700, 12: 10_000 } });
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('goes back to the regular payment, and typing the regular payment is the same', async () => {
    updateLoanDraft(draft, { payments: { 3: 700, 12: 10_000 } });
    await open({ ...CAR_BANK, target: '12' });
    expect(screen.getByDisplayValue('10,000')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Back to the regular payment' }));
    expect(readLoanDraft(draft)).toEqual({ payments: { 3: 700 } });

    await screen.unmount();
    await open({ ...CAR_BANK, target: '3' });
    await typeInto('700', '554.23');
    await fireEvent.press(screen.getByRole('button', { name: 'Use this payment' }));
    expect(readLoanDraft(draft)).toEqual({});
  });

  it('starts on the amount typed when it pays the loan off, though it is taken as what is owed', async () => {
    updateLoanDraft(draft, { payments: { 30: 50_000 } });
    await open({ ...CAR_BANK, target: '30' });
    expect(screen.getByDisplayValue('50,000')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Back to the regular payment' })).toBeTruthy();
  });

  it('shows the last payment read-only, with the reason, and nothing to press', async () => {
    await open({ ...CAR_BANK, target: '72' });
    expect(screen.getByText('Payment 72')).toBeTruthy();
    expect(screen.getByText('This payment')).toBeTruthy();
    expect(screen.getByText(t('loan.payment.locked'))).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Use this payment' })).toBeNull();
    expect(screen.queryAllByDisplayValue(/./)).toHaveLength(0);
  });

  it('says so when the loan is paid off before this payment', async () => {
    updateLoanDraft(draft, { payments: { 12: 10_000 } });
    await open({ ...CAR_BANK, target: '60' });
    expect(screen.getByText('The loan is paid off before this payment.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Use this payment' })).toBeNull();
  });

  it('refuses a garbled payment number', async () => {
    await open({ ...CAR_BANK, target: 'x' });
    expect(screen.getByText('This loan has no such payment.')).toBeTruthy();
  });

  it.each([
    [
      'es' as const,
      'Pago 1',
      '554.23',
      'Usar este pago',
      'Eso no cubre los intereses de este pago. Lo mínimo posible es $243.30.',
    ],
    [
      'fr' as const,
      'Paiement 1',
      '554,23',
      'Utiliser ce paiement',
      `Cela ne couvre pas les intérêts de ce paiement. Le minimum possible est 243,30${NBSP}$.`,
    ],
  ])('is written in %s', async (language: Language, title, shown, use, reason) => {
    setLanguage(language);
    await open({ ...CAR_BANK, target: '1' });
    expect(screen.getByText(title, RAW)).toBeTruthy();
    await typeInto(shown, '200');
    await fireEvent.press(screen.getByRole('button', { name: use }));
    expect(screen.getByText(reason, RAW)).toBeTruthy();
    const drawn = JSON.stringify(screen.toJSON());
    expect(drawn).not.toMatch(/"loan\.[a-zA-Z.]+"|\{\w+\}/);
  });

  it('keeps every line whole and on its role’s ceiling', async () => {
    await open({ ...CAR_BANK, target: '1' });
    for (const line of ['Regular payment', 'Interest this time', 'The least it can be']) {
      const text = screen.getByText(line);
      expect([line, text.props.maxFontSizeMultiplier]).toEqual([line, TEXT_CAP.row]);
      expect(text.props.numberOfLines).toBeUndefined();
    }
    expect(screen.getByText(t('loan.payment.singleHint')).props.maxFontSizeMultiplier).toBe(
      TEXT_CAP.reading,
    );
  });
});
