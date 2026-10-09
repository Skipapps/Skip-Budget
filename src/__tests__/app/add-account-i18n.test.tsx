import { fireEvent, render } from '@testing-library/react-native';

import AddAccountScreen from '@/app/add-account';
import { resetLocaleForTests, setCurrency, setLanguage } from '@/i18n/store';

/**
 * The bank account form in Spanish and French. The pay step names salary sources and their cycle
 * in the language on screen, while the account type and pay frequency are saved as their codes.
 */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));

jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);

jest.mock('@/components/ui/skeleton', () => ({ Skeleton: () => null }));
jest.mock('@/components/cards/account-card', () => ({ AccountCard: () => null }));
// Reanimated 4 wants a native worklets module; the swatches are the only animated part of the form.
jest.mock('@/components/ui/color-picker', () => ({ ColorPicker: () => null }));
jest.mock('@/components/flow/amount-step', () => ({ AmountStep: () => null }));
jest.mock('@/components/flow/inline-calendar', () => {
  const { Pressable } = jest.requireActual('react-native');
  return {
    InlineCalendar: ({ onChange }: { onChange: (date: Date) => void }) => (
      <Pressable testID="calendar" onPress={() => onChange(new Date(2026, 8, 1))} />
    ),
  };
});
// Only the reason a reminder is unavailable matters here.
jest.mock('@/components/ui/reminder-field', () => {
  const { Text } = jest.requireActual('react-native');
  return {
    ReminderField: ({ unavailable }: { unavailable?: string | null }) =>
      unavailable ? <Text>{unavailable}</Text> : null,
  };
});

jest.mock('@/providers/theme-provider', () => ({
  useColors: () => ({ ink: '#000000', muted: '#777777', line: '#DDDDDD', surface: '#FFFFFF' }),
  useMoneyColor: () => () => '#000000',
}));

jest.mock('@/theme/artwork', () => ({
  useArtwork: () => new Proxy({}, { get: () => () => null }),
}));
// Jest turns an .svg into a number, not a component; the icons have a suite of their own.
jest.mock('@/theme/gradient-icons', () => ({
  useGradientIcons: () => new Proxy({}, { get: () => () => null }),
}));

const mockConfirm = jest.fn(async () => false);
jest.mock('@/providers/dialog-provider', () => ({ useConfirm: () => mockConfirm }));

let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: jest.fn(), replace: jest.fn(), canGoBack: () => true },
  useLocalSearchParams: () => mockParams,
  useFocusEffect: () => {},
  Stack: { Screen: () => null },
  Redirect: () => null,
}));

jest.mock('@/api/pro', () => ({ usePro: () => ({ pro: true, ready: true }) }));

const mockCreate = jest.fn(async () => ({ id: 'acct-new' }));
const mockCreateSalary = jest.fn(async () => ({ id: 'salary-new' }));
jest.mock('@/api/mutations', () => ({
  useUpdateBankAccount: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useCreateBankAccount: () => ({ mutateAsync: mockCreate, isPending: false }),
  useDeleteBankAccount: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useCreateSalarySource: () => ({ mutateAsync: mockCreateSalary, isPending: false }),
  useSetSalaryAccounts: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useLinkAccountToSalaries: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));

jest.mock('@/api/reminders', () => ({
  choiceToLead: () => null,
  useApplyReminder: () => jest.fn(),
  useReminderChoice: () => ({ choice: 'off', ready: true }),
}));

let mockAccount: { data: unknown; isError: boolean; isFetched: boolean };
let mockSalaries: unknown[] = [];
jest.mock('@/api/queries', () => ({
  useBankAccount: () => ({ ...mockAccount, refetch: jest.fn() }),
  useBankAccounts: () => ({ data: [] }),
  useSalaryAccountIds: () => ({ ids: new Set<string>(), isLoading: false, isError: false }),
  useSalarySources: () => ({ data: mockSalaries }),
}));

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

const acme = { id: 's-1', name: 'Acme', amount: 4200, frequency: 'monthly', last_payday: null };

/** From the balance step to the account details. */
async function toDetails() {
  const screen = await render(<AddAccountScreen />);
  await fireEvent.press(screen.getByText(/^(Continuar|Continuer)$/));
  return screen;
}

beforeEach(() => {
  resetLocaleForTests();
  mockParams = {};
  mockSalaries = [];
  mockAccount = { data: null, isError: false, isFetched: true };
  mockCreate.mockClear();
  mockCreateSalary.mockClear();
});
afterAll(() => resetLocaleForTests());

describe('Add an account in Spanish', () => {
  beforeEach(() => setLanguage('es'));

  it('reads the form in Spanish and saves the type as its code', async () => {
    const screen = await render(<AddAccountScreen />);

    expect(screen.getByText('Agregar una cuenta')).toBeTruthy();
    expect(screen.getByText('¿Cuánto hay en la cuenta hoy?')).toBeTruthy();
    await fireEvent.press(screen.getByText('Continuar'));

    expect(screen.getAllByText('Nombre del banco').length).toBeGreaterThan(0);
    expect(screen.getByText('Tipo de cuenta')).toBeTruthy();
    expect(screen.getByText('Cheques')).toBeTruthy();
    expect(screen.getAllByText('Nombre de la cuenta').length).toBeGreaterThan(0);
    expect(screen.getByText('Color de la tarjeta')).toBeTruthy();
    expect(screen.getAllByText('Últimos 4 dígitos').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Ingresos esperados').length).toBeGreaterThan(0);
    expect(screen.getByPlaceholderText('Ingresa un importe')).toBeTruthy();
    expect(screen.getByLabelText('Abrir calculadora')).toBeTruthy();
    expectNoLeftovers(screen);

    await fireEvent.changeText(screen.getAllByDisplayValue('')[0], 'Banco Azul');
    await fireEvent.press(screen.getByText('Ahorros'));
    await fireEvent.press(screen.getByText('Continuar'));

    expect(screen.getByText('¿Cuándo fue el último día de pago?')).toBeTruthy();
    expect(screen.getByText('¿Cada cuánto te pagan?')).toBeTruthy();
    expect(screen.getByText('Mensual')).toBeTruthy();
    expect(screen.getByText('Cada 2 semanas')).toBeTruthy();
    expect(
      screen.getByText(
        'Agrega los ingresos que se depositan en esta cuenta y Skip te avisará cuando lleguen.',
      ),
    ).toBeTruthy();

    await fireEvent.press(screen.getByTestId('calendar'));
    expect(screen.getByText(/^Próximo día de pago: \d{1,2} [a-z]{3} \d{4}$/)).toBeTruthy();
    expectNoLeftovers(screen);

    await fireEvent.press(screen.getByText('Semanal'));
    await fireEvent.press(screen.getByText('Agregar cuenta'));

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ bank_name: 'Banco Azul', account_type: 'savings' }),
    );
  });

  it('names one salary source, its pay and its cycle in Spanish', async () => {
    mockParams = { from: 'setup' };
    mockSalaries = [{ ...acme, last_payday: '2026-09-01' }];
    const screen = await toDetails();

    expect(screen.getByText('Acme llega aquí')).toBeTruthy();
    expect(screen.getByText('$4,200.00 mensual · día de pago ya configurado')).toBeTruthy();
    expect(screen.getByRole('switch').props.accessibilityLabel).toBe('Acme llega aquí');
    expectNoLeftovers(screen);
  });

  it('joins sources with "y"', async () => {
    mockParams = { from: 'setup' };
    mockSalaries = [acme, { ...acme, id: 's-2', name: 'Side gig' }];
    const screen = await toDetails();

    expect(screen.getByText('Acme y Side gig llegan aquí')).toBeTruthy();
    expect(screen.getByText('Sus días de pago ya están configurados')).toBeTruthy();
  });

  it('joins with "e" before an i sound', async () => {
    mockParams = { from: 'setup' };
    mockSalaries = [acme, { ...acme, id: 's-2', name: 'IBM' }];
    const screen = await toDetails();

    expect(screen.getByText('Acme e IBM llegan aquí')).toBeTruthy();
  });
});

describe('Add an account in French', () => {
  beforeEach(() => {
    setLanguage('fr');
    setCurrency('CAD');
  });

  it('names the pay and its cycle in French, with French figures', async () => {
    mockParams = { from: 'setup' };
    mockSalaries = [{ ...acme, frequency: 'biweekly', last_payday: null }];
    const screen = await toDetails();

    expect(screen.getByText('Acme arrive ici')).toBeTruthy();
    expect(screen.getByText(`4${NBSP}200,00${NBSP}$ toutes les 2 semaines`)).toBeTruthy();
    expect(screen.getByText('Chèques')).toBeTruthy();
    expect(screen.getByText('Épargne')).toBeTruthy();
    expectNoLeftovers(screen);
  });

  it('joins several sources with "et" and agrees the verb', async () => {
    mockParams = { from: 'setup' };
    mockSalaries = [
      acme,
      { ...acme, id: 's-2', name: 'IBM' },
      { ...acme, id: 's-3', name: 'Loyer' },
    ];
    const screen = await toDetails();

    expect(screen.getByText('Acme, IBM et Loyer arrivent ici')).toBeTruthy();
    expect(screen.getByText('Leurs jours de paie sont déjà définis')).toBeTruthy();
  });

  it('reads the edit chrome in French', async () => {
    mockParams = { id: 'acct-1' };
    mockAccount = {
      data: {
        id: 'acct-1',
        bank_name: 'Banque',
        nickname: 'Courant',
        account_type: 'savings',
        last4: '1111',
        color: '#000000',
        balance: 900,
        balance_as_of: '2026-09-01',
      },
      isError: false,
      isFetched: true,
    };
    const screen = await render(<AddAccountScreen />);

    expect(screen.getByText('Modifier le compte')).toBeTruthy();
    expect(screen.getByText('Combien y a-t-il dans le compte aujourd’hui ?')).toBeTruthy();
    expect(screen.getByLabelText('Supprimer ce compte')).toBeTruthy();
    expect(screen.getByText('Supprimer le compte')).toBeTruthy();

    await fireEvent.press(screen.getByText('Continuer'));
    await fireEvent.press(screen.getByText('Continuer'));
    expect(screen.getByText('Tu veux un rappel quand ta paie arrive ?')).toBeTruthy();
    expect(screen.getByText('Enregistrer les modifications')).toBeTruthy();
    expectNoLeftovers(screen);
  });
});
