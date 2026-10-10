import { fireEvent, render, screen } from '@testing-library/react-native';

import LoanScheduleScreen from '@/app/loan-schedule';
import type { CurrencyCode, Language } from '@/i18n/config';
import { resetLocaleForTests, setCurrency, setLanguage } from '@/i18n/store';
import { amortise } from '@/lib/loan';
import { formatMoney } from '@/i18n/number';
import { toCents } from '@/lib/money';

/**
 * The payment schedule of the real lender statement pinned in src/lib/loan.test.ts (72 months of
 * $31,394.33 at 8.14%, funded 30 Nov 2025, first payment 14 Jan 2026, $554.34 a month, actual/365),
 * in every language and currency. Currency and language change how a figure is written, never the
 * figure: every payment, interest, principal and balance on the page is the same number of cents in
 * all of them, and each row is the engine's row to the cent.
 */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);
jest.mock('@/lib/haptics', () => ({ tap: jest.fn(), selection: jest.fn() }));
jest.mock('@/theme/loan-icons', () => ({
  useLoanIcons: () => new Proxy({}, { get: () => () => null }),
}));
jest.mock('@/providers/theme-provider', () => ({
  useColors: () => ({ ink: '#000000', muted: '#777777', body: '#222222', accent: '#905479' }),
}));

const STATEMENT = {
  amount: '31394.33',
  rate: '8.14',
  months: '72',
  start: '2026-01-14',
  funded: '2025-11-30',
  basis: 'actual/365',
  payment: '554.34',
};

let mockParams: Record<string, string> = STATEMENT;
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => mockParams,
  router: { back: jest.fn(), canGoBack: () => true },
}));

const NBSP = '\u00a0';
/**
 * Text queries fold whitespace by default and count a no-break space as whitespace, so they would
 * pass "1 234,56" written with an ordinary space. RAW compares the characters exactly as drawn.
 */
const RAW = { normalizer: (text: string) => text };

/** The engine's own schedule for the same terms, the figures the page must show. */
const ENGINE = amortise({
  principal: 31_394.33,
  annualRatePercent: 8.14,
  months: 72,
  firstPaymentOn: new Date(2026, 0, 14),
  fundedOn: new Date(2025, 10, 30),
  basis: 'actual/365',
  payment: 554.34,
});

/** Every string drawn or read out, in tree order. */
function everythingRead(): string[] {
  const out: string[] = [];
  const walk = (node: unknown) => {
    if (typeof node === 'string') return void out.push(node);
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) return node.forEach(walk);
    const { props, children } = node as { props?: Record<string, unknown>; children?: unknown };
    if (typeof props?.accessibilityLabel === 'string') out.push(props.accessibilityLabel);
    walk(children);
  };
  walk(screen.toJSON());
  return out;
}

/** Every cents figure written in a string, read back the way its language writes money. */
function centsIn(text: string, language: Language): number[] {
  const pattern =
    language === 'fr'
      ? /(-?)(\d{1,3}(?:\u00a0\d{3})*),(\d{2})\u00a0[$£]/g
      : /(-?)[$£](\d{1,3}(?:,\d{3})*)\.(\d{2})/g;
  return [...text.matchAll(pattern)].map(([, sign, whole, cents]) => {
    const value = Number(whole.replace(/\D/g, '')) * 100 + Number(cents);
    return sign ? -value : value;
  });
}

const LOCALES: [Language, CurrencyCode][] = [
  ['en', 'USD'],
  ['es', 'MXN'],
  ['fr', 'CAD'],
  ['en', 'GBP'],
  ['fr', 'GBP'],
];

/** The page as opened, then with every row out from behind "Show all". */
async function showIn(language: Language, currency: CurrencyCode, { all = true } = {}) {
  setLanguage(language);
  setCurrency(currency);
  await render(<LoanScheduleScreen />);
  if (!all) return;
  const more = screen.queryByRole('button', { name: /^(Show all|Ver los|Voir les) \d+ / });
  if (more) await fireEvent.press(more);
}

beforeEach(() => {
  resetLocaleForTests();
  mockParams = STATEMENT;
});

describe('the real statement’s schedule', () => {
  it('shows the same cents everywhere on the page in every language and currency', async () => {
    const figures: number[][] = [];
    for (const [language, currency] of LOCALES) {
      await showIn(language, currency);
      figures.push(everythingRead().flatMap((text) => centsIn(text, language)));
      await screen.unmount();
    }

    // Four figures a row in its spoken line and four drawn, plus the headers.
    expect(figures[0].length).toBeGreaterThan(72 * 8);
    for (const other of figures.slice(1)) expect(other).toEqual(figures[0]);
  });

  it.each(LOCALES)(
    'gives each row the engine’s figures to the cent in %s/%s',
    async (language, currency) => {
      await showIn(language, currency);

      const spoken = everythingRead().filter((text) => /^(Payment|Pago|Paiement) \d+,/.test(text));
      expect(spoken).toHaveLength(72);
      expect(ENGINE.rows).toHaveLength(72);

      spoken.forEach((line, index) => {
        const row = ENGINE.rows[index];
        expect(centsIn(line, language)).toEqual(
          [row.payment, row.interest, row.principal, row.balance].map(toCents),
        );
      });
    },
  );

  it('opens on the statement’s 45-day first period and $315.06 of interest', () => {
    expect(ENGINE.rows[0].days).toBe(45);
    expect(ENGINE.rows[0].interest).toBe(315.06);
    expect(ENGINE.rows[0].payment).toBe(554.34);
    expect(ENGINE.rows[71].balance).toBe(0);
  });
});

describe('in French', () => {
  beforeEach(() => showIn('fr', 'CAD'));

  it('writes the title, the summary card and the rate the French way', () => {
    expect(screen.getByText('Calendrier de remboursement', RAW)).toBeTruthy();
    for (const line of [
      'Paiement mensuel',
      `554,34${NBSP}$`,
      'Taux',
      // A loan on file does not carry its fees, so its rate is not called an APR.
      `8,14${NBSP}%`,
      'Durée',
      '6 ans · 72',
      'Intérêts totaux',
      formatMoney(ENGINE.totalInterest, 'fr', 'CAD'),
      'Total remboursé',
      formatMoney(ENGINE.totalPaid, 'fr', 'CAD'),
    ]) {
      expect(screen.getAllByText(line, RAW).length).toBeGreaterThan(0);
    }
    expect(
      screen.getByText(
        /^Les intérêts courent chaque jour sur ce que tu dois encore, donc un mois de 31 jours coûte plus cher qu’un mois de 28\. /,
        RAW,
      ),
    ).toBeTruthy();
  });

  it('writes the first row with French figures, and says its day count', () => {
    const first = ENGINE.rows[0];
    expect(screen.getByText('14 janv. 2026', RAW)).toBeTruthy();
    expect(
      screen.getByText(`239,28${NBSP}$ en capital · 315,06${NBSP}$ d’intérêts`, RAW),
    ).toBeTruthy();
    expect(
      screen.getByLabelText(
        `Paiement 1, 14 janv. 2026, couvre 45 jours. 554,34${NBSP}$${NBSP}: 315,06${NBSP}$ d’intérêts, 239,28${NBSP}$ en capital. Reste 31${NBSP}155,05${NBSP}$.`,
        RAW,
      ),
    ).toBeTruthy();
    expect(first.principal).toBe(239.28);
  });

  it('ends on a zero balance', () => {
    expect(screen.getAllByText(`Reste 0,00${NBSP}$`, RAW).length).toBeGreaterThan(0);
  });

  it('leaves no raw key or unfilled parameter', () => {
    for (const text of everythingRead()) {
      expect(text).not.toMatch(/^[a-z]+\.[a-zA-Z]+\./);
      expect(text).not.toMatch(/\{\w+\}/);
    }
  });
});

describe('in Spanish', () => {
  beforeEach(() => showIn('es', 'MXN'));

  it('writes the page in Spanish with Mexican figures', () => {
    expect(screen.getByText('Calendario de pagos', RAW)).toBeTruthy();
    expect(screen.getByText('6 años · 72', RAW)).toBeTruthy();
    expect(screen.getByText('$239.28 a capital · $315.06 de intereses', RAW)).toBeTruthy();
    expect(
      screen.getByText(
        /Supone que cada pago llega a tiempo y que la tasa nunca cambia: pagar tarde cuesta los días de más\. Abonar de más al saldo acorta el plazo\.$/,
        RAW,
      ),
    ).toBeTruthy();
    for (const text of everythingRead()) {
      expect(text).not.toMatch(/^[a-z]+\.[a-zA-Z]+\./);
      expect(text).not.toMatch(/\{\w+\}/);
    }
  });
});

describe('with overpayments', () => {
  it('names the extra on each row and explains the early end, in French', async () => {
    mockParams = { ...STATEMENT, extra: '100' };
    await showIn('fr', 'CAD');

    expect(
      screen.getAllByText(
        /^[\d\u00a0]+,\d{2}\u00a0\$ en capital · [\d\u00a0]+,\d{2}\u00a0\$ d’intérêts · 100,00\u00a0\$ en supplément$/,
        RAW,
      ).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByLabelText(/dont 100,00\u00a0\$ versés en supplément\. Reste /, RAW).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getByText(
        /Les versements supplémentaires que tu as indiqués sont déjà dans ces lignes\u00a0; c’est pourquoi le calendrier se termine plus tôt\.$/,
        RAW,
      ),
    ).toBeTruthy();
  });

  it('shows the same figures in English and French', async () => {
    mockParams = { ...STATEMENT, extra: '100', lump: '2500', lumpOn: '2027-03-14' };
    const figures: number[][] = [];
    for (const [language, currency] of [
      ['en', 'USD'],
      ['fr', 'CAD'],
    ] as const) {
      await showIn(language, currency);
      figures.push(everythingRead().flatMap((text) => centsIn(text, language)));
      await screen.unmount();
    }
    expect(figures[1]).toEqual(figures[0]);
  });
});

describe('a one-payment loan in English', () => {
  it('says "covering 1 day" for a period of one day', async () => {
    mockParams = {
      amount: '1000',
      rate: '12',
      months: '1',
      start: '2026-01-14',
      funded: '2026-01-13',
      basis: 'actual/365',
    };
    await showIn('en', 'USD');

    const [spoken] = everythingRead().filter((text) => text.startsWith('Payment 1,'));
    expect(spoken).toMatch(/^Payment 1, 14 Jan 2026, covering 1 day\. \$/);
    expect(screen.getByText(/^\$[\d,.]+ principal · \$[\d,.]+ interest$/, RAW)).toBeTruthy();
  });
});
