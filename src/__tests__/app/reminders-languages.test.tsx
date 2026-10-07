import { render } from '@testing-library/react-native';

import RemindersScreen from '@/app/reminders';
import { resetLocaleForTests, setLanguage } from '@/i18n/store';
import { formatFullDate } from '@/lib/date';
import { formatCurrency } from '@/lib/format';

/**
 * Reminders in Spanish and French: titles, captions with amounts and dates in the language's own
 * form, the reasons a row cannot be reminded about, and the words read aloud on every control.
 */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);
jest.mock('@/providers/theme-provider', () => ({
  useColors: () => ({
    ink: '#000000',
    body: '#333333',
    muted: '#777777',
    line: '#DDDDDD',
    control: '#0000FF',
    onControl: '#FFFFFF',
    surface: '#FFFFFF',
  }),
}));
jest.mock('@/lib/haptics', () => ({ tap: jest.fn(), toggle: jest.fn() }));
jest.mock('@/theme/artwork', () => ({
  useArtwork: () => new Proxy({}, { get: () => () => null }),
}));
jest.mock('@/components/ui/skeleton', () => ({ SkeletonList: () => null }));

let mockFailed: string | null = null;
const read = (name: string, data: unknown[]) => ({
  data: mockFailed === name ? undefined : data,
  isLoading: false,
  isPending: false,
  isError: mockFailed === name,
  refetch: jest.fn(),
});

const BILL = { id: 'b1', name: 'Renta', amount: 1234.5, next_due_on: '2026-05-04' };
const SUBSCRIPTION = {
  id: 's1',
  name: 'Netflix',
  amount: 15.99,
  next_renewal_on: '2026-05-10',
  active: true,
};
// No payment day and no pay arriving: both rows say why instead of drawing a switch.
const CARD = { id: 'c1', holder: '', last4: null, network: 'VISA', bill_due_day: null };
const ACCOUNT = {
  id: 'a1',
  nickname: null,
  bank_name: null,
  last4: null,
  account_type: 'savings',
};

jest.mock('@/api/queries', () => ({
  useBills: () => read('bills', [BILL]),
  useSubscriptions: () => read('subscriptions', [SUBSCRIPTION]),
  useCards: () => read('cards', [CARD]),
  useBankAccounts: () => read('accounts', [ACCOUNT]),
  useSalaryAccountIds: () => ({
    ids: new Set<string>(),
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  }),
}));

// Mocked whole, as reminders.test.tsx does; the labels read the real messages when drawn.
jest.mock('@/api/reminders', () => {
  const { t } = jest.requireActual('@/i18n');
  return {
    DEFAULT_LEAD_DAYS: 1,
    DEFAULT_REMIND_AT: '09:00',
    LEAD_OPTIONS: [
      {
        value: 0,
        get label() {
          return t('api.reminders.onTheDay');
        },
      },
      {
        value: 1,
        get label() {
          return t('api.reminders.days', { count: 1 });
        },
      },
      {
        value: 7,
        get label() {
          return t('api.reminders.weeks', { count: 1 });
        },
      },
    ],
    REMINDER_CAPTION: {
      get bill() {
        return t('api.reminders.caption.bill');
      },
      get subscription() {
        return t('api.reminders.caption.subscription');
      },
      get card() {
        return t('api.reminders.caption.card');
      },
      get account() {
        return t('api.reminders.caption.account');
      },
    },
    reminderKey: (row: { key: string }) => row.key,
    targetKey: (kind: string, id: string) => `${kind}:${id}`,
    useReminders: () => ({
      data: [{ key: 'bill:b1', enabled: true, lead_days: 1, remind_at: '20:00:00' }],
      isPending: false,
      isError: mockFailed === 'reminders',
      refetch: jest.fn(),
    }),
    useSetReminder: () => ({ mutate: jest.fn() }),
    useRemoveReminder: () => ({ mutate: jest.fn() }),
    useReceiptReminder: () => ({
      enabled: true,
      remindAt: '20:00',
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    }),
    useSetReceiptReminder: () => ({ mutate: jest.fn() }),
  };
});

type Screen = Awaited<ReturnType<typeof render>>;

const RAW_KEY = /^[a-z]+\.[a-zA-Z]+\./;

/** Every line drawn and every label read aloud. */
function everything(screen: Screen): string[] {
  const texts = screen.getAllByText(/./).map((node) => String(node.props.children));
  const labels = screen
    .queryAllByLabelText(/./)
    .map((node) => node.props.accessibilityLabel as string);
  return [...texts, ...labels];
}

function expectAllWorded(lines: string[]) {
  for (const line of lines) {
    expect(line).not.toMatch(RAW_KEY);
    expect(line).not.toMatch(/\{\w+\}/);
  }
}

const day = (iso: string) => formatFullDate(new Date(`${iso}T00:00:00`));

beforeEach(() => {
  resetLocaleForTests();
  mockFailed = null;
});

describe('Reminders in Spanish', () => {
  beforeEach(() => setLanguage('es'));

  it('titles, counts and captions', async () => {
    const screen = await render(<RemindersScreen />);

    expect(screen.getByText('Recordatorios')).toBeTruthy();
    // Receipts, the bill and the subscription can be switched on; the receipts and bill ones are.
    expect(screen.getByText('2 de 3 te avisarán.')).toBeTruthy();
    expect(screen.getByText('Recordatorio diario de recibos')).toBeTruthy();
    expect(screen.getByText('Un aviso para anotar lo que compraste hoy.')).toBeTruthy();

    for (const title of ['Recibos', 'Facturas', 'Suscripciones', 'Tarjetas', 'Cuentas bancarias']) {
      expect(screen.getByText(title)).toBeTruthy();
    }
    expect(screen.getByText('Antes de que venza la factura')).toBeTruthy();
    expect(
      screen.getByText(`${formatCurrency(1234.5)} · vence el ${day('2026-05-04')}`),
    ).toBeTruthy();
    expect(day('2026-05-04')).toBe('4 may 2026');
    expect(
      screen.getByText(`${formatCurrency(15.99)} · se renueva el ${day('2026-05-10')}`),
    ).toBeTruthy();

    expect(screen.getByText('Tarjeta')).toBeTruthy();
    expect(screen.getByText('VISA')).toBeTruthy();
    expect(screen.getByText('Primero agrega un día de pago a esta tarjeta')).toBeTruthy();
    expect(screen.getByText('Cuenta')).toBeTruthy();
    expect(screen.getByText('ahorros')).toBeTruthy();
    expect(screen.getByText('Aún no llega salario aquí')).toBeTruthy();

    expectAllWorded(everything(screen));
  });

  it('reads every control aloud in Spanish', async () => {
    const screen = await render(<RemindersScreen />);

    for (const label of [
      'Recordatorio diario de recibos',
      'Cambia la hora del recordatorio diario de recibos. Hora de envío: 8:00 p. m.',
      'Recordatorio de Renta',
      'Recordar el mismo día',
      'Recordar 1 día antes',
      'Recordar 1 semana antes',
      'Cambia la hora de Renta. Hora de envío: 8:00 p. m.',
      'Quitar el recordatorio de Renta',
      'Recordatorio de Netflix',
    ]) {
      expect(screen.getByLabelText(label)).toBeTruthy();
    }
    expect(screen.getByText('El mismo día')).toBeTruthy();
  });

  it('says the one failure line in Spanish', async () => {
    mockFailed = 'bills';
    const screen = await render(<RemindersScreen />);

    expect(screen.getByText('Algo salió mal. Inténtalo de nuevo.')).toBeTruthy();
    expect(screen.getByText('Intentar de nuevo')).toBeTruthy();
  });
});

describe('Reminders in French', () => {
  beforeEach(() => setLanguage('fr'));

  it('titles, counts and captions', async () => {
    const screen = await render(<RemindersScreen />);

    expect(screen.getByText('Rappels')).toBeTruthy();
    expect(screen.getByText('2 sur 3 te préviendront.')).toBeTruthy();
    expect(screen.getByText('Rappel quotidien des reçus')).toBeTruthy();
    for (const title of ['Reçus', 'Factures', 'Abonnements', 'Cartes', 'Comptes bancaires']) {
      expect(screen.getByText(title)).toBeTruthy();
    }
    expect(
      screen.getByText(`${formatCurrency(1234.5)} · à payer le ${day('2026-05-04')}`),
    ).toBeTruthy();
    expect(formatCurrency(1234.5)).toMatch(/^1\s234,50\s\$$/);
    expect(
      screen.getByText(`${formatCurrency(15.99)} · renouvellement le ${day('2026-05-10')}`),
    ).toBeTruthy();
    expect(screen.getByText('Carte')).toBeTruthy();
    expect(screen.getByText('épargne')).toBeTruthy();
    expect(screen.getByText('Aucune paie n’arrive ici pour l’instant')).toBeTruthy();
    expect(
      screen.getByText(
        'Les rappels arrivent sous forme de notification. Si tu les désactives pour Skip dans les réglages de ton téléphone, rien d’ici ne te parviendra.',
      ),
    ).toBeTruthy();

    expectAllWorded(everything(screen));
  });

  it('reads every control aloud in French', async () => {
    const screen = await render(<RemindersScreen />);

    for (const label of [
      'Envoyé à 20 h 00. Change l’heure du rappel quotidien des reçus.',
      'Rappel pour Renta',
      'Rappeler le jour même',
      'Rappeler 1 jour avant',
      'Rappeler 1 semaine avant',
      'Envoyé à 20 h 00. Change l’heure pour Renta.',
      'Retirer le rappel pour Renta',
    ]) {
      expect(screen.getByLabelText(label)).toBeTruthy();
    }
  });
});

describe('Reminders in English', () => {
  it('keeps every English line as it was', async () => {
    const screen = await render(<RemindersScreen />);

    expect(screen.getByText('2 of 3 will let you know.')).toBeTruthy();
    expect(screen.getByText(`${formatCurrency(1234.5)} · due 4 May 2026`)).toBeTruthy();
    expect(screen.getByText('Add a payment day to this card first')).toBeTruthy();
    expect(screen.getByText('savings')).toBeTruthy();
    for (const label of [
      'Sent at 8:00 PM. Change the time for the daily receipts reminder.',
      'Remind me about Renta',
      'Remind on the day before',
      'Remind 1 day before',
      'Remind 1 week before',
      'Sent at 8:00 PM. Change the time for Renta.',
      'Remove the reminder for Renta',
    ]) {
      expect(screen.getByLabelText(label)).toBeTruthy();
    }
    expect(
      screen.getByText(
        "Reminders arrive as a notification. Turn them off for Skip in your phone's settings and nothing here will reach you.",
      ),
    ).toBeTruthy();
  });
});
