import { render } from '@testing-library/react-native';
import type { ReactTestRendererJSON } from 'react-test-renderer';

import {
  ReceiptFilterSheet,
  EMPTY_RECEIPT_FILTERS,
} from '@/components/receipts/receipt-filter-sheet';
import { ReceiptRow } from '@/components/receipts/receipt-row';
import { resetLocaleForTests, setLanguage } from '@/i18n/store';

/** A receipt row and the receipt filters, read in Spanish and in French. */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('@/components/brands/brand-mark', () => ({ BrandMark: () => null }));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@/providers/theme-provider', () => ({
  useColors: () => ({ ink: '#000000', muted: '#777777', line: '#DDDDDD', surface: '#FFFFFF' }),
  useMoneyColor: () => () => '#000000',
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

beforeEach(() => resetLocaleForTests());
afterAll(() => resetLocaleForTests());

describe('ReceiptRow', () => {
  const row = (
    <ReceiptRow merchant="Oxxo" amount={1234.5} date="2026-09-12" sourceLabel="VISA ••4421" />
  );

  it('reads in Spanish', async () => {
    setLanguage('es');
    const screen = await render(row);

    expect(screen.getByLabelText('Oxxo, -$1,234.50, pagado con VISA ••4421')).toBeTruthy();
    expect(screen.getByText('-$1,234.50')).toBeTruthy();
    expect(screen.getByText('12 sep 2026')).toBeTruthy();
    expect(
      screen.getByLabelText('Oxxo, -$1,234.50, pagado con VISA ••4421').props.accessibilityHint,
    ).toBe('Abre este recibo');
    expectNoRawText(screen.toJSON());
  });

  it('reads in French, the amount written the Canadian way', async () => {
    setLanguage('fr');
    const screen = await render(row);

    // Queries fold a no-break space into a plain one, so the figures are compared as they are.
    const amount = `-1${NBSP}234,50${NBSP}$`;
    expect(screen.getByLabelText(/^Oxxo, /).props.accessibilityLabel).toBe(
      `Oxxo, ${amount}, payé avec VISA ••4421`,
    );
    expect(screen.getByText(amount).props.children).toBe(amount);
    expect(screen.getByText('12 sept. 2026')).toBeTruthy();
    expectNoRawText(screen.toJSON());
  });

  it('leaves out "paid with" when the receipt has no card', async () => {
    setLanguage('fr');
    const screen = await render(
      <ReceiptRow merchant="IGA" amount={6} date="2026-09-12" sourceLabel="" />,
    );

    expect(screen.getByLabelText(/^IGA, /).props.accessibilityLabel).toBe(`IGA, -6,00${NBSP}$`);
  });
});

describe('ReceiptFilterSheet', () => {
  const sheet = (
    <ReceiptFilterSheet
      filters={{ ...EMPTY_RECEIPT_FILTERS, date: '2026-09-12' }}
      sourceOptions={[]}
      onCancel={() => {}}
      onApply={() => {}}
    />
  );

  it('reads in Spanish', async () => {
    setLanguage('es');
    const screen = await render(sheet);

    expect(screen.getByText('Filtrar recibos')).toBeTruthy();
    expect(screen.getByLabelText('Cerrar filtros')).toBeTruthy();
    expect(screen.getByText('Fecha')).toBeTruthy();
    expect(screen.getByText('12 sep 2026')).toBeTruthy();
    expect(screen.getByText('Borrar fecha')).toBeTruthy();
    expect(screen.getByText('Pagado con')).toBeTruthy();
    expect(screen.getByText('Se muestran todas las tarjetas de crédito y cuentas.')).toBeTruthy();
    expect(screen.getByText('Borrar')).toBeTruthy();
    expect(screen.getByText('Aplicar')).toBeTruthy();
    expectNoRawText(screen.toJSON());
  });

  it('reads in French', async () => {
    setLanguage('fr');
    const screen = await render(
      <ReceiptFilterSheet
        filters={EMPTY_RECEIPT_FILTERS}
        sourceOptions={[]}
        onCancel={() => {}}
        onApply={() => {}}
      />,
    );

    expect(screen.getByText('Filtrer les reçus')).toBeTruthy();
    expect(screen.getByLabelText('Fermer les filtres')).toBeTruthy();
    expect(screen.getByText('N’importe quelle date')).toBeTruthy();
    expect(screen.getByText('Payé avec')).toBeTruthy();
    expect(
      screen.getByText('Toutes les cartes de crédit et tous les comptes sont affichés.'),
    ).toBeTruthy();
    expect(screen.getByText('Effacer')).toBeTruthy();
    expect(screen.getByText('Appliquer')).toBeTruthy();
    expectNoRawText(screen.toJSON());
  });
});
