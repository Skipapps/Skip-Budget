import { render } from '@testing-library/react-native';

import { AccountCard } from '@/components/cards/account-card';
import { PaymentCard } from '@/components/cards/payment-card';
import { resetLocaleForTests, setCurrency, setLanguage } from '@/i18n/store';

jest.mock('@/providers/theme-provider', () => ({
  useColors: () => ({ ink: '#111111', line: '#DDDDDD', surface: '#FBF9F7' }),
}));

const NBSP = ' ';

const account = (balance: number, accountType: 'Checking' | 'Savings' = 'Checking') => ({
  id: 'acct',
  bankName: 'First Bank',
  nickname: 'Everyday',
  accountType,
  balance,
  last4: '4421',
  color: '#1F6FEB',
});

const card = (balance: number) => ({
  id: 'card',
  holder: 'Sam',
  balance,
  last4: '1122',
  network: 'Mastercard',
  color: '#1F6FEB',
});

type Screen = Awaited<ReturnType<typeof render>>;
type Json = { props: Record<string, unknown>; children: (Json | string)[] | null };

/** Every line drawn or read out, so a raw key or an unfilled {param} cannot hide. */
function everyLine(screen: Screen): string[] {
  const lines: string[] = [];
  const walk = (node: Json | string) => {
    if (typeof node === 'string') {
      lines.push(node);
      return;
    }
    for (const prop of ['accessibilityLabel', 'accessibilityHint', 'placeholder']) {
      const value = node.props[prop];
      if (typeof value === 'string') lines.push(value);
    }
    node.children?.forEach(walk);
  };
  const tree = screen.toJSON() as Json | Json[] | null;
  (Array.isArray(tree) ? tree : tree ? [tree] : []).forEach(walk);
  return lines;
}

function expectNoLeftovers(screen: Screen) {
  const lines = everyLine(screen);
  expect(lines.length).toBeGreaterThan(0);
  expect(lines.filter((line) => /^[a-z]+\.[a-zA-Z]+\./.test(line) || /\{\w+\}/.test(line))).toEqual(
    [],
  );
}

beforeEach(() => {
  resetLocaleForTests();
});

describe('Card faces in Spanish', () => {
  beforeEach(() => setLanguage('es'));

  it.each([
    [-25.75, 'Sobregirado', '-$25'],
    [0, 'Disponible', '$0'],
    [1234.56, 'Disponible', '$1,234'],
  ])('an account balance of %p reads %s over %s', async (balance, caption, figure) => {
    const screen = await render(<AccountCard account={account(balance)} />);
    expect(screen.getByText(caption)).toBeTruthy();
    expect(screen.getByText(figure)).toBeTruthy();
    expect(screen.getByText('Cheques')).toBeTruthy();
    expectNoLeftovers(screen);
  });

  it('names a savings account in Spanish and keeps the stored type out of sight', async () => {
    const screen = await render(<AccountCard account={account(10, 'Savings')} />);
    expect(screen.getByText('Ahorros')).toBeTruthy();
    expect(screen.queryByText('Savings')).toBeNull();
  });

  it.each([
    [482.19, 'Adeudo', '-$482'],
    [-20, 'Saldo a favor', '$20'],
    [0, 'Sin adeudo', '$0'],
  ])('a card balance of %p reads %s over %s', async (balance, caption, figure) => {
    const screen = await render(<PaymentCard card={card(balance)} />);
    expect(screen.getByText(caption)).toBeTruthy();
    expect(screen.getByText(figure)).toBeTruthy();
    // A network is a brand name: drawn as its uppercase wordmark, never translated.
    expect(screen.getByText('MASTERCARD')).toBeTruthy();
    expectNoLeftovers(screen);
  });
});

describe('Card faces in French', () => {
  beforeEach(() => {
    setLanguage('fr');
    setCurrency('CAD');
  });

  it.each([
    [-25.75, 'À découvert', `-25${NBSP}$`],
    [1234.56, 'Disponible', `1${NBSP}234${NBSP}$`],
  ])('an account balance of %p reads %s over %s', async (balance, caption, figure) => {
    const screen = await render(<AccountCard account={account(balance)} />);
    expect(screen.getByText(caption)).toBeTruthy();
    expect(screen.getByText(figure)).toBeTruthy();
    expect(screen.getByText('Chèques')).toBeTruthy();
    expectNoLeftovers(screen);
  });

  it.each([
    [482.19, 'Montant dû', `-482${NBSP}$`],
    [-20, 'Solde créditeur', `20${NBSP}$`],
    [0.004, 'Rien à payer', `0${NBSP}$`],
  ])('a card balance of %p reads %s over %s', async (balance, caption, figure) => {
    const screen = await render(<PaymentCard card={card(balance)} />);
    expect(screen.getByText(caption)).toBeTruthy();
    expect(screen.getByText(figure)).toBeTruthy();
    expect(screen.getByText('MASTERCARD')).toBeTruthy();
    expectNoLeftovers(screen);
  });

  it('shows the placeholder it is handed while the name is empty', async () => {
    const screen = await render(
      <PaymentCard card={{ ...card(0), holder: '' }} placeholderHolder="Nom de la carte" />,
    );
    expect(screen.getByText('Nom de la carte')).toBeTruthy();
  });
});
