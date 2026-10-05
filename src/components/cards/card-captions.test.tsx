import { render } from '@testing-library/react-native';

import { AccountCard } from '@/components/cards/account-card';
import { PaymentCard } from '@/components/cards/payment-card';

jest.mock('@/providers/theme-provider', () => ({
  useColors: () => ({ ink: '#111111', line: '#DDDDDD' }),
}));

/**
 * The caption over a card's figure says which way the money runs, so it is
 * decided in cents, the way money.ts posts them. It used to round to whole
 * dollars first: a $0.40 overdraft read "Available" and $0.40 still owed on a
 * card read "Nothing owed". Float dust (a balance summed to −1e-12) is still
 * nothing.
 *
 * The figure itself stays whole dollars, truncated (formatCurrency with
 * `cents: false`), so a balance under a dollar shows "$0" under the caption.
 */
const account = (balance: number) => ({
  id: 'acct',
  bankName: 'First Bank',
  nickname: 'Everyday',
  accountType: 'Checking' as const,
  balance,
  last4: '4421',
  color: '#1F6FEB',
});

const card = (balance: number) => ({
  id: 'card',
  holder: 'Sam',
  balance,
  last4: '1122',
  network: 'VISA',
  color: '#1F6FEB',
});

describe('AccountCard caption', () => {
  it.each([
    // [balance, caption, figure]
    [-0.01, 'Overdrawn', '$0'],
    [-0.4, 'Overdrawn', '$0'],
    [-0.5, 'Overdrawn', '$0'],
    [-0.004, 'Available', '$0'],
    [-1e-12, 'Available', '$0'],
    [0, 'Available', '$0'],
    [-0, 'Available', '$0'],
    [0.4, 'Available', '$0'],
    [-25.75, 'Overdrawn', '-$25'],
    [1234.56, 'Available', '$1,234'],
  ])('a balance of %p reads %s over %s', async (balance, caption, figure) => {
    const { getByText } = await render(<AccountCard account={account(balance)} />);
    expect(getByText(caption)).toBeTruthy();
    expect(getByText(figure)).toBeTruthy();
  });
});

describe('PaymentCard caption', () => {
  it.each([
    // [balance owed, caption, figure]
    [0.4, 'Owed', '$0'],
    [0.01, 'Owed', '$0'],
    [0.5, 'Owed', '$0'],
    [-0.4, 'In credit', '$0'],
    [-0.01, 'In credit', '$0'],
    [0.004, 'Nothing owed', '$0'],
    [1e-12, 'Nothing owed', '$0'],
    [0, 'Nothing owed', '$0'],
    [-0, 'Nothing owed', '$0'],
    [482.19, 'Owed', '-$482'],
    [-20, 'In credit', '$20'],
  ])('a balance of %p reads %s over %s', async (balance, caption, figure) => {
    const { getByText } = await render(<PaymentCard card={card(balance)} />);
    expect(getByText(caption)).toBeTruthy();
    expect(getByText(figure)).toBeTruthy();
  });
});
