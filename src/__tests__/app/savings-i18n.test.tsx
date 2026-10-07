import { fireEvent, render, waitFor } from '@testing-library/react-native';
import type { ReactTestRendererJSON } from 'react-test-renderer';

import SavingsScreen from '@/app/savings';
import SavingsMonthScreen from '@/app/savings-month';
import { resetLocaleForTests, setLanguage } from '@/i18n/store';

/**
 * Savings and one month of it, read in Spanish and French: the month names (a capital at the
 * start of a line, lower-case inside a sentence), the explanations and every figure.
 */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);
jest.mock('@/components/ui/skeleton', () => ({ Skeleton: () => null, SkeletonList: () => null }));
jest.mock('@/providers/theme-provider', () => ({
  useColors: () => ({ ink: '#000000', muted: '#777777', line: '#DDDDDD', surface: '#FFFFFF' }),
  useMoneyColor: () => () => '#000000',
}));
jest.mock('@/theme/artwork', () => ({
  useArtwork: () => new Proxy({}, { get: () => () => null }),
}));
jest.mock('@/api/refresh', () => ({
  useRefreshAll: () => ({ refresh: () => {}, refreshing: false }),
}));

const mockConfirm = jest.fn();
jest.mock('@/providers/dialog-provider', () => ({ useConfirm: () => mockConfirm }));

jest.mock('@/api/mutations', () => ({
  useAdjustSavingsMonth: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useExcludeSavingsMonth: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: jest.fn() },
  useLocalSearchParams: () => ({ month: '2026-08-01' }),
}));

type MonthRow = {
  month: string;
  income: number;
  spent: number;
  saved: number;
  adjusted_saved: number | null;
  note: string | null;
  excluded_at: string | null;
};

const ROW = { adjusted_saved: null, note: null, excluded_at: null };

/** Four months, one of each kind: kept, corrected with a reason, overspent and left out. */
const MONTHS: MonthRow[] = [
  { ...ROW, month: '2026-05-01', income: 4000, spent: 3000, saved: 1000 },
  {
    ...ROW,
    month: '2026-06-01',
    income: 4000,
    spent: 3600,
    saved: 400,
    adjusted_saved: 47.5,
    note: 'Pagué al plomero',
  },
  { ...ROW, month: '2026-07-01', income: 4000, spent: 4250.5, saved: -250.5 },
  { ...ROW, month: '2026-08-01', income: 4000, spent: 1765.43, saved: 2234.57 },
];

let mockMonths: MonthRow[] = MONTHS;

jest.mock('@/api/queries', () => ({
  savedFor: (month: {
    excluded_at: string | null;
    adjusted_saved: number | null;
    saved: number;
  }) => (month.excluded_at ? 0 : Number(month.adjusted_saved ?? month.saved)),
  useMonthlySavings: () => ({
    data: mockMonths,
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  }),
}));

const NBSP = ' ';

type Node = ReactTestRendererJSON | ReactTestRendererJSON[] | string | null;

/** Every line a person can see or hear: text, labels, hints and placeholders. */
function shownText(node: Node): string[] {
  if (node === null) return [];
  if (typeof node === 'string') return [node];
  if (Array.isArray(node)) return node.flatMap(shownText);
  const props = node.props ?? {};
  const spoken = ['accessibilityLabel', 'accessibilityHint', 'placeholder'].flatMap((name) =>
    typeof props[name] === 'string' ? [props[name] as string] : [],
  );
  return [...spoken, ...(node.children ?? []).flatMap((child) => shownText(child as Node))];
}

function expectNoRawText(tree: Node) {
  const lines = shownText(tree);
  expect(lines.filter((line) => /^[a-z]+\.[a-zA-Z]+\./.test(line))).toEqual([]);
  expect(lines.filter((line) => /\{\w+\}/.test(line))).toEqual([]);
}

beforeEach(() => {
  jest.clearAllMocks();
  resetLocaleForTests();
  mockMonths = MONTHS.map((month) =>
    month.month === '2026-05-01' ? { ...month, excluded_at: '2026-09-01' } : month,
  );
});
afterAll(() => resetLocaleForTests());

describe('Savings in Spanish', () => {
  it('explains each month in its own words', async () => {
    setLanguage('es');
    const screen = await render(<SavingsScreen />);

    expect(screen.getByText('Ahorros')).toBeTruthy();
    expect(screen.getByText('Ahorrado hasta ahora')).toBeTruthy();
    // 47.50 + (-250.50) + 2,234.57; May is left out.
    expect(screen.getByText('$2,031.57')).toBeTruthy();
    expect(screen.getByText('en 2 meses que terminaron con algo de sobra')).toBeTruthy();

    expect(screen.getByText('Mayo de 2026')).toBeTruthy();
    expect(screen.getByText('Fuera de tus ahorros. Toca para volver a contarlo.')).toBeTruthy();
    expect(
      screen.getByText(
        'Dijiste que este mes dejó $47.50 — Pagué al plomero. Skip calculó $400.00.',
      ),
    ).toBeTruthy();
    expect(
      screen.getByText(
        'Salieron $4,250.50 contra $4,000.00 que entraron, así que este mes tomó de tus ahorros en lugar de sumarles.',
      ),
    ).toBeTruthy();
    expect(
      screen.getByText(
        'Entraron $4,000.00 y salieron $1,765.43 en facturas, suscripciones y recibos; el resto se quedó.',
      ),
    ).toBeTruthy();
    expect(
      screen.getByLabelText(
        'Agosto de 2026. $2,234.57. Entraron $4,000.00 y salieron $1,765.43 en facturas, suscripciones y recibos; el resto se quedó. Toca para corregir.',
      ),
    ).toBeTruthy();
    expect(
      screen.getByLabelText(
        'Mayo de 2026. Fuera de tus ahorros. Fuera de tus ahorros. Toca para volver a contarlo. Toca para corregir.',
      ),
    ).toBeTruthy();
    expectNoRawText(screen.toJSON());
  });

  it('says so while no month has finished', async () => {
    setLanguage('es');
    mockMonths = [];
    const screen = await render(<SavingsScreen />);

    expect(screen.getByText('Nada todavía')).toBeTruthy();
    expectNoRawText(screen.toJSON());
  });
});

describe('Savings in French', () => {
  it('writes the figures the Canadian way and counts one month in the singular', async () => {
    setLanguage('fr');
    mockMonths = [MONTHS[3]];
    const screen = await render(<SavingsScreen />);

    expect(screen.getByText('Épargne')).toBeTruthy();
    expect(screen.getByText('Août 2026')).toBeTruthy();
    // Queries fold a no-break space into a plain one, so the figure is compared as it is.
    const total = `2${NBSP}234,57${NBSP}$`;
    expect(screen.getAllByText(total)[0].props.children).toBe(total);
    expect(screen.getByText('sur 1 mois qui s’est terminé avec un reste')).toBeTruthy();
    expect(
      screen.getByText(
        'Revenus de 4 000,00 $, dépenses de 1 765,43 $ en factures, abonnements et reçus — le reste est resté.',
      ),
    ).toBeTruthy();
    expectNoRawText(screen.toJSON());
  });
});

describe('A month of savings', () => {
  it('reads in Spanish, and names the month in lower case inside a question', async () => {
    setLanguage('es');
    mockConfirm.mockResolvedValue(false);
    const screen = await render(<SavingsMonthScreen />);

    expect(screen.getByText('Agosto de 2026')).toBeTruthy();
    expect(screen.getByText('Lo que calculó Skip')).toBeTruthy();
    expect(
      screen.getByText(
        'Entraron $4,000.00 y salieron $1,765.43 en facturas, suscripciones y recibos.',
      ),
    ).toBeTruthy();
    expect(screen.getByText('Lo que realmente dejó')).toBeTruthy();
    expect(screen.getByText('Déjalo vacío para usar la cifra de Skip')).toBeTruthy();
    expect(screen.getByPlaceholderText('Le pagué al plomero en efectivo')).toBeTruthy();
    expect(screen.getByText('Guardar')).toBeTruthy();
    expect(screen.getByText('Dejar fuera este mes')).toBeTruthy();
    expectNoRawText(screen.toJSON());

    await fireEvent.press(screen.getByLabelText('Dejar este mes fuera de tus ahorros'));
    await waitFor(() => expect(mockConfirm).toHaveBeenCalledTimes(1));
    expect(mockConfirm).toHaveBeenCalledWith({
      title: '¿Dejar fuera agosto de 2026?',
      message:
        'Deja de contar para el total de tus ahorros. No se elimina nada y puedes volver a incluirlo.',
      confirmLabel: 'Dejarlo fuera',
      destructive: true,
    });
  });

  it('reads in French, a correction and its way back included', async () => {
    setLanguage('fr');
    mockMonths = [{ ...MONTHS[3], adjusted_saved: 47.5, note: 'Plombier' }];
    mockConfirm.mockResolvedValue(false);
    const screen = await render(<SavingsMonthScreen />);

    expect(screen.getByText('Août 2026')).toBeTruthy();
    expect(screen.getByText('Ce que Skip a calculé')).toBeTruthy();
    const corrected = `47,50${NBSP}$`;
    expect(screen.getByText(corrected).props.children).toBe(corrected);
    expect(screen.getByText('Revenir au montant de Skip')).toBeTruthy();
    expect(screen.getByLabelText('Remettre ce mois sur le montant de Skip')).toBeTruthy();
    expect(screen.getByText('Exclure ce mois')).toBeTruthy();
    expectNoRawText(screen.toJSON());

    await fireEvent.press(screen.getByLabelText('Exclure ce mois de ton épargne'));
    await waitFor(() => expect(mockConfirm).toHaveBeenCalledTimes(1));
    expect(mockConfirm.mock.calls[0][0].title).toBe(`Exclure août 2026${NBSP}?`);
  });

  it('says in French that a month is not there', async () => {
    setLanguage('fr');
    mockMonths = [];
    const screen = await render(<SavingsMonthScreen />);

    expect(screen.getByText('Mois')).toBeTruthy();
    expect(screen.getByText('Ce mois ne fait pas partie de ton épargne.')).toBeTruthy();
  });
});
