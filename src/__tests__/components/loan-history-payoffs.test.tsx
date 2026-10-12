import { fireEvent, render, screen, within } from '@testing-library/react-native';

import type { PaymentSourceRow } from '@/api/queries';
import type { HistoryRow, LoanViewHistory } from '@/components/loans/view/loan-view-data';
import { HistoryCard } from '@/components/loans/view/loan-view-lists';
import { resetLocaleForTests, setLanguage } from '@/i18n/store';

/**
 * Money paid off a loan sits in its History among the payments the schedule made, newest first,
 * each from its own card or account, and is the one kind of row that can be taken back out.
 */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('@/lib/haptics', () => ({ tap: jest.fn(), selection: jest.fn() }));
jest.mock('@/providers/theme-provider', () => ({
  useColors: () => ({ card: '#FFFFFF', muted: '#77706A', ink: '#1B1A19' }),
}));

const TODAY = '2026-10-12';

const CHASE: PaymentSourceRow = {
  id: 'acct-chase',
  label: 'Chase ••4821',
  name: 'Chase',
  last4: '4821',
  color: '#2D6CDF',
  kind: 'account',
};
const AMEX: PaymentSourceRow = {
  id: 'card-amex',
  label: 'Amex ••6334',
  name: 'Amex',
  last4: '6334',
  color: '#4F7DBA',
  kind: 'card',
};

const payment = (number: number, date: string): HistoryRow => ({
  kind: 'payment',
  number,
  date,
  payment: 424.8,
  principal: 366.2,
  interest: 58.6,
});

const history = (rows: HistoryRow[]): LoanViewHistory => ({
  rows,
  latestPayoffOn: '2026-10-12',
  firstPaymentOn: '2025-01-27',
});

const EXTRA: HistoryRow = {
  kind: 'payoff',
  id: 'po-1',
  date: '2026-10-03',
  amount: 2000,
  full: false,
  source: AMEX,
  latest: false,
  endsWithout: '2028-12-27',
};
const CLEARED: HistoryRow = {
  kind: 'payoff',
  id: 'po-2',
  date: '2026-10-12',
  amount: 8728.5,
  full: true,
  source: null,
  latest: true,
  endsWithout: '2028-12-27',
};

beforeEach(() => {
  resetLocaleForTests();
});

describe('payoffs in History', () => {
  it('names each by what it did, with its day and its own source, among the payments', async () => {
    await render(
      <HistoryCard
        history={history([CLEARED, EXTRA, payment(21, '2026-09-27')])}
        paidFrom={CHASE}
        today={TODAY}
        onRemovePayoff={jest.fn()}
      />,
    );
    const cleared = within(screen.getByTestId('loan-history-payoff-po-2'));
    expect(cleared.getByText('Paid off')).toBeTruthy();
    expect(cleared.getByText('12 Oct · No payment method')).toBeTruthy();
    expect(cleared.getByText('$8,728.50')).toBeTruthy();
    expect(
      cleared.getByTestId('loan-source-chip-none', { includeHiddenElements: true }),
    ).toBeTruthy();

    const extra = within(screen.getByTestId('loan-history-payoff-po-1'));
    expect(extra.getByText('Extra payment')).toBeTruthy();
    // Its own card, not the loan's account.
    expect(extra.getByText('3 Oct · Paid from Amex ••6334')).toBeTruthy();
    expect(extra.getByText('$2,000.00')).toBeTruthy();

    const scheduled = within(screen.getByTestId('loan-history-21'));
    expect(scheduled.getByText('Paid from Chase ••4821')).toBeTruthy();
  });

  it('reads each out whole, with the source in words, and says what a tap does', async () => {
    await render(
      <HistoryCard
        history={history([CLEARED, EXTRA])}
        paidFrom={CHASE}
        today={TODAY}
        onRemovePayoff={jest.fn()}
      />,
    );
    // Only the latest can come out; an earlier one says to take the later out first.
    const cleared = screen.getByRole('button', { name: 'Paid off, 12 Oct 2026, $8,728.50.' });
    expect(cleared.props.accessibilityHint).toBe('Removes this payment, after you confirm.');
    const extra = screen.getByRole('button', {
      name: 'Extra payment, 3 Oct 2026, $2,000.00, paid from Amex, ending in 6334.',
    });
    expect(extra.props.accessibilityHint).toBe('Remove the later payment first');
  });

  it('offers to take one out on a tap or a long press, and never a scheduled payment', async () => {
    const onRemove = jest.fn();
    await render(
      <HistoryCard
        history={history([EXTRA, payment(21, '2026-09-27')])}
        paidFrom={CHASE}
        today={TODAY}
        onRemovePayoff={onRemove}
      />,
    );
    await fireEvent.press(screen.getByTestId('loan-history-payoff-po-1'));
    await fireEvent(screen.getByTestId('loan-history-payoff-po-1'), 'longPress');
    expect(onRemove.mock.calls).toEqual([[EXTRA], [EXTRA]]);

    // A payment the schedule made is a fact of the loan, not something typed: no button.
    const scheduled = screen.getByTestId('loan-history-21');
    expect(scheduled.props.accessibilityRole).toBeUndefined();
    expect(scheduled.props.onPress).toBeUndefined();
  });

  it('counts payoffs in the three shown before See all', async () => {
    await render(
      <HistoryCard
        history={history([
          EXTRA,
          payment(21, '2026-09-27'),
          payment(20, '2026-08-27'),
          payment(19, '2026-07-27'),
        ])}
        paidFrom={CHASE}
        today={TODAY}
        onRemovePayoff={jest.fn()}
      />,
    );
    expect(screen.getByTestId('loan-history-payoff-po-1')).toBeTruthy();
    expect(screen.queryByTestId('loan-history-19')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'See all, History' }));
    expect(screen.getByTestId('loan-history-19')).toBeTruthy();
  });

  it('speaks Spanish and French', async () => {
    setLanguage('es');
    const { rerender } = await render(
      <HistoryCard
        history={history([CLEARED, EXTRA])}
        paidFrom={CHASE}
        today={TODAY}
        onRemovePayoff={jest.fn()}
      />,
    );
    expect(screen.getByText('Liquidado')).toBeTruthy();
    expect(screen.getByText('Pago extra')).toBeTruthy();

    setLanguage('fr');
    await rerender(
      <HistoryCard
        history={history([CLEARED, EXTRA])}
        paidFrom={CHASE}
        today={TODAY}
        onRemovePayoff={jest.fn()}
      />,
    );
    expect(screen.getByText('Soldé')).toBeTruthy();
    expect(screen.getByText('Paiement supplémentaire')).toBeTruthy();
  });
});
