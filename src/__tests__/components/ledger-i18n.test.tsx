import { fireEvent, render } from '@testing-library/react-native';

import type { LedgerEntry } from '@/api/queries';
import {
  FilterSheet,
  EMPTY_FILTERS,
  ledgerKindLabel,
} from '@/components/transactions/filter-sheet';
import { LedgerRow } from '@/components/transactions/ledger-row';
import { LedgerSummary } from '@/components/transactions/ledger-summary';
import { resetLocaleForTests, setCurrency, setLanguage } from '@/i18n/store';

/** The Transactions tab's summary, rows and filter page in Spanish and French. */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@/providers/theme-provider', () => ({
  useColors: () => ({ ink: '#000000', muted: '#777777', body: '#333333', line: '#DDDDDD' }),
  useMoneyColor: () => () => '#000000',
}));
jest.mock('@/components/brands/brand-mark', () => ({ BrandMark: () => null }));
jest.mock('@/components/bills/bill-mark', () => ({ BillMark: () => null }));

const NBSP = ' ';
const RAW_KEY = /^[a-z]+\.[a-zA-Z]+\./;
const PARAM = /\{\w+\}/;

type Screen = Awaited<ReturnType<typeof render>>;
type Json = { props: Record<string, unknown>; children: (Json | string)[] | null };

/** Every line a person can see or hear: text, labels, hints and placeholders. */
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
  expect(lines.filter((line) => RAW_KEY.test(line) || PARAM.test(line))).toEqual([]);
}

const totals = { in: 2000, out: 1234.56, net: 765.44, count: 3 };
const shortTotals = { in: 0, out: 20, net: -20, count: 1 };

const rent: LedgerEntry = {
  id: 'bill-b1@2026-09-10',
  label: 'Rent',
  amount: -1030.5,
  date: '2026-09-10',
  kind: 'bill',
  sourceId: 's1',
} as LedgerEntry;

beforeEach(() => resetLocaleForTests());
afterAll(() => resetLocaleForTests());

describe('LedgerSummary', () => {
  it('reads the verdict, the count and both sides in Spanish', async () => {
    setLanguage('es');
    const screen = await render(<LedgerSummary totals={totals} />);

    expect(screen.getByText('Te sobran')).toBeTruthy();
    expect(screen.getByText('3 movimientos')).toBeTruthy();
    expect(screen.getByText('$765.44')).toBeTruthy();
    expect(screen.getByText('Ingresos')).toBeTruthy();
    expect(screen.getByText('Gastos')).toBeTruthy();
    expect(screen.getByLabelText('Gastos, -$1,234.56')).toBeTruthy();
    expectNoLeftovers(screen);
  });

  it('says one transaction and a shortfall in French, with French figures', async () => {
    setLanguage('fr');
    setCurrency('CAD');
    const screen = await render(<LedgerSummary totals={shortTotals} />);

    expect(screen.getByText('Il manque')).toBeTruthy();
    expect(screen.getByText('1 transaction')).toBeTruthy();
    expect(screen.getByText(`20,00${NBSP}$`)).toBeTruthy();
    expect(screen.getByText('Revenus')).toBeTruthy();
    expect(screen.getByText('Dépenses')).toBeTruthy();
    expectNoLeftovers(screen);
  });

  it('says nothing yet when the window is empty', async () => {
    setLanguage('fr');
    const screen = await render(<LedgerSummary totals={{ in: 0, out: 0, net: 0, count: 0 }} />);
    expect(screen.getByText('Rien encore')).toBeTruthy();
    expect(screen.getByText('Il reste')).toBeTruthy();
  });
});

describe('LedgerRow', () => {
  it('reads its kind and amount in French', async () => {
    setLanguage('fr');
    setCurrency('CAD');
    const screen = await render(
      <LedgerRow entry={rent} sourceLabel="VISA ••4421" kindLabel={ledgerKindLabel('bill')} />,
    );

    expect(screen.getByText('Factures mensuelles · VISA ••4421')).toBeTruthy();
    expect(screen.getByText(`-1${NBSP}030,50${NBSP}$`)).toBeTruthy();
    expect(
      screen.getByLabelText(`Rent, Factures mensuelles, VISA ••4421, -1${NBSP}030,50${NBSP}$`),
    ).toBeTruthy();
    expectNoLeftovers(screen);
  });

  it('keeps an unknown kind as it came rather than showing a key', () => {
    setLanguage('es');
    expect(ledgerKindLabel('mystery')).toBe('mystery');
    expect(ledgerKindLabel('income')).toBe('Ingresos');
  });
});

describe('FilterSheet', () => {
  const sources = [{ value: 's1', label: 'Everyday ••1111' }];

  it('reads every heading, hint and button in Spanish', async () => {
    setLanguage('es');
    const screen = await render(
      <FilterSheet
        filters={EMPTY_FILTERS}
        sourceOptions={sources}
        onCancel={() => {}}
        onApply={() => {}}
      />,
    );

    expect(screen.getByText('Filtrar')).toBeTruthy();
    expect(screen.getByLabelText('Cerrar filtros')).toBeTruthy();
    expect(screen.getByText('Fecha')).toBeTruthy();
    expect(screen.getByText('Cualquier fecha')).toBeTruthy();
    expect(screen.getByText('Tarjeta o cuenta bancaria')).toBeTruthy();
    expect(screen.getByText('Se muestran todas las tarjetas de crédito y cuentas.')).toBeTruthy();
    expect(screen.getByText('Tipo de movimiento')).toBeTruthy();
    expect(screen.getByText('Se muestran todos los tipos.')).toBeTruthy();
    // The shared kinds, drawn in Spanish while their values stay what rows compare.
    expect(screen.getByText('Ingresos')).toBeTruthy();
    expect(screen.getByText('Facturas mensuales')).toBeTruthy();
    expect(screen.getByText('Recibos')).toBeTruthy();
    expect(screen.getByText('Suscripciones')).toBeTruthy();
    expect(screen.getByText('Borrar todo')).toBeTruthy();
    expect(screen.getByText('Aplicar')).toBeTruthy();
    expectNoLeftovers(screen);
  });

  it('applies the stored kind value, not the French label', async () => {
    setLanguage('fr');
    const onApply = jest.fn();
    const screen = await render(
      <FilterSheet
        filters={{ ...EMPTY_FILTERS, date: '2026-09-08' }}
        sourceOptions={[]}
        onCancel={() => {}}
        onApply={onApply}
      />,
    );

    expect(screen.getByText('Filtrer')).toBeTruthy();
    expect(screen.getByText('8 sept. 2026')).toBeTruthy();
    expect(screen.getByText('Effacer la date')).toBeTruthy();
    expect(screen.getByText('Type de transaction')).toBeTruthy();
    expect(screen.queryByText('Carte ou compte bancaire')).toBeNull();
    expectNoLeftovers(screen);

    await fireEvent.press(screen.getByText('Reçus'));
    await fireEvent.press(screen.getByText('Appliquer'));

    expect(onApply).toHaveBeenCalledWith({
      date: '2026-09-08',
      sourceIds: [],
      kinds: ['receipt'],
    });
  });
});
