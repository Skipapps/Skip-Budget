import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import type { ReactTestRendererJSON } from 'react-test-renderer';

import AddSubscriptionScreen from '@/app/add-subscription';
import type { Language } from '@/i18n/config';
import { resetLocaleForTests, setLanguage } from '@/i18n/store';

/**
 * Adding and editing a subscription in Spanish and French. The words and the service's category
 * follow the language; what is saved (cycle, amount, category id) does not.
 */

const mockProps: Record<string, any> = {};

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);
jest.mock('@/components/ui/skeleton', () => ({ Skeleton: () => null }));
jest.mock('@/lib/haptics', () => ({
  success: jest.fn(),
  warn: jest.fn(),
  selection: jest.fn(),
  tap: jest.fn(),
}));
jest.mock('@/components/brands/brand-mark', () => ({ BrandMark: () => null }));

jest.mock('@/components/ui/button', () => {
  const { Pressable, Text } = require('react-native');
  return {
    Button: ({ label, onPress }: { label: string; onPress: () => void }) => (
      <Pressable accessibilityRole="button" onPress={onPress}>
        <Text>{label}</Text>
      </Pressable>
    ),
  };
});
jest.mock('@/components/flow/amount-step', () => ({
  AmountStep: (props: any) => {
    mockProps.amount = props;
    return null;
  },
}));
jest.mock('@/components/brands/brand-field', () => {
  const { Text } = require('react-native');
  return {
    BrandField: (props: any) => {
      mockProps.service = props;
      return <Text accessibilityHint={props.placeholder}>{props.label}</Text>;
    },
  };
});
jest.mock('@/components/ui/source-tiles', () => ({ SourceTiles: () => null }));
jest.mock('@/components/flow/inline-calendar', () => ({
  InlineCalendar: (props: any) => {
    mockProps.calendar = props;
    return null;
  },
}));
jest.mock('@/components/ui/reminder-field', () => ({ ReminderField: () => null }));

jest.mock('@/providers/theme-provider', () => ({
  useColors: () => ({
    ink: '#000000',
    muted: '#777777',
    line: '#DDDDDD',
    surface: '#FFFFFF',
    danger: '#CC0000',
  }),
  useMoneyColor: () => () => '#000000',
}));
jest.mock('@/theme/artwork', () => ({
  useArtwork: () => new Proxy({}, { get: () => () => null }),
}));

const mockConfirm = jest.fn(async (_: object) => true);
jest.mock('@/providers/dialog-provider', () => ({
  useConfirm: () => mockConfirm,
  useDialog: () => async () => undefined,
}));

let mockParams: Record<string, string | undefined> = {};
jest.mock('expo-router', () => ({
  router: {
    back: jest.fn(),
    push: jest.fn(),
    replace: jest.fn(),
    dismissTo: jest.fn(),
    canGoBack: jest.fn(() => true),
  },
  useLocalSearchParams: () => mockParams,
  useFocusEffect: () => {},
  Stack: { Screen: () => null },
}));

jest.mock('@/api/past-charges', () => ({
  usePastCharges: () => ({
    lastChargedOn: null,
    ready: true,
    saving: false,
    choose: async () => 'upcoming',
    apply: jest.fn(),
    retry: jest.fn(),
  }),
}));
jest.mock('@/api/reminders', () => ({
  choiceToLead: () => null,
  useApplyReminder: () => async () => {},
  useReminderChoice: () => ({ choice: 'off', remindAt: '09:00' }),
}));
// The database's own labels, which are English.
jest.mock('@/api/brands', () => ({
  useSpendCategories: () => ({
    data: [
      { id: 'entertainment', label: 'Entertainment', hint: '' },
      { id: 'new-kind', label: 'Something new', hint: '' },
    ],
  }),
}));

const mockCreate = jest.fn();
jest.mock('@/api/mutations', () => ({
  useCreateSubscription: () => ({ mutateAsync: mockCreate, isPending: false }),
  useUpdateSubscription: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useDeleteSubscription: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));

let mockRow: { data: unknown; isError: boolean; isFetched: boolean };
jest.mock('@/api/queries', () => ({
  useSubscription: () => ({ ...mockRow, refetch: jest.fn() }),
  usePaymentSources: () => ({ sources: [] }),
}));

const NETFLIX = {
  brandId: 'netflix',
  name: 'Netflix',
  domain: 'netflix.com',
  categoryId: 'entertainment',
};

const SAVED = {
  id: 's1',
  brand_id: 'netflix',
  name: 'Netflix',
  amount: 15.99,
  cycle: 'monthly',
  next_renewal_on: '2026-10-12',
  started_on: '2026-01-12',
  created_at: '2026-01-12T00:00:00Z',
  category_id: 'entertainment',
  card_id: null,
  bank_account_id: null,
  note: null,
  active: true,
  brands: { domain: 'netflix.com' },
};

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

const set = (key: string, value: unknown) =>
  act(() => {
    const props = mockProps[key];
    (props.onChange ?? props.onChangeText)(value);
  });

/** A new yearly Netflix, every step pressed by the words of `language`. */
async function addNetflix(language: Language, words: Record<string, string>) {
  setLanguage(language);
  const screen = await render(<AddSubscriptionScreen />);

  await set('amount', '1234.56');
  await fireEvent.press(screen.getByText(words.continue));
  await set('service', NETFLIX);
  await fireEvent.press(screen.getByText(words.continue));
  await set('calendar', new Date(2026, 9, 12));
  await fireEvent.press(screen.getByLabelText(words.yearly));
  await fireEvent.press(screen.getByText(words.save));

  await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
  const saved = mockCreate.mock.calls[0][0];
  await screen.unmount();
  return saved;
}

beforeEach(() => {
  jest.clearAllMocks();
  for (const key of Object.keys(mockProps)) delete mockProps[key];
  resetLocaleForTests();
  mockParams = {};
  mockRow = { data: null, isError: false, isFetched: false };
  mockCreate.mockResolvedValue({ id: 'sub-new' });
});
afterAll(() => resetLocaleForTests());

describe('Add a subscription in Spanish', () => {
  it('reads every step in Spanish, the category included', async () => {
    setLanguage('es');
    const screen = await render(<AddSubscriptionScreen />);

    expect(screen.getByText('Agregar una suscripción')).toBeTruthy();
    expect(screen.getByText('¿Cuánto cuesta?')).toBeTruthy();
    expect(screen.getByText('Continuar')).toBeTruthy();
    expectNoRawText(screen.toJSON());

    await set('amount', '15.99');
    await fireEvent.press(screen.getByText('Continuar'));
    expect(screen.getByText('Servicio')).toBeTruthy();
    expect(screen.getByHintText('Busca un servicio')).toBeTruthy();
    expect(screen.getByText('Nota')).toBeTruthy();
    expect(screen.getByPlaceholderText('Qué plan, por ejemplo')).toBeTruthy();

    await set('service', NETFLIX);
    expect(screen.getByText('Archivada en Entretenimiento')).toBeTruthy();
    // A category this build has no words for keeps the database's label.
    await set('service', { ...NETFLIX, categoryId: 'new-kind' });
    expect(screen.getByText('Archivada en Something new')).toBeTruthy();
    await set('service', { ...NETFLIX, categoryId: 'gone' });
    expect(screen.getByText('Archivada en Otros')).toBeTruthy();
    expectNoRawText(screen.toJSON());

    await fireEvent.press(screen.getByText('Continuar'));
    expect(screen.getByText('¿Cuándo se renueva?')).toBeTruthy();
    expect(screen.getByText('Ciclo de cobro')).toBeTruthy();
    for (const chip of ['Semanal', 'Mensual', 'Trimestral', 'Anual']) {
      expect(screen.getByLabelText(chip)).toBeTruthy();
    }
    expect(screen.getByText('Guardar suscripción')).toBeTruthy();
    expectNoRawText(screen.toJSON());
  });

  it('says the one failure line when the subscription to edit cannot be read', async () => {
    setLanguage('es');
    mockParams = { id: 's1' };
    mockRow = { data: null, isError: true, isFetched: true };
    const screen = await render(<AddSubscriptionScreen />);

    expect(screen.getByText('Algo salió mal. Inténtalo de nuevo.')).toBeTruthy();
    expect(screen.getByText('Intentar de nuevo')).toBeTruthy();
    expect(screen.getByText('Regresar')).toBeTruthy();
  });
});

describe('Edit a subscription in French', () => {
  it('reads in French and asks before deleting', async () => {
    setLanguage('fr');
    mockParams = { id: 's1' };
    mockRow = { data: SAVED, isError: false, isFetched: true };
    const screen = await render(<AddSubscriptionScreen />);

    expect(screen.getByText('Modifier l’abonnement')).toBeTruthy();
    expect(screen.getByText('Combien ça coûte ?')).toBeTruthy();
    expect(screen.getByText('Supprimer l’abonnement')).toBeTruthy();

    await fireEvent.press(screen.getByText('Continuer'));
    expect(screen.getByText('Service')).toBeTruthy();
    expect(screen.getByText('Statut')).toBeTruthy();
    expect(screen.getByLabelText('Actif')).toBeTruthy();
    expect(screen.getByLabelText('Annulé')).toBeTruthy();
    expect(screen.getByText('Classé dans Divertissement')).toBeTruthy();
    expectNoRawText(screen.toJSON());

    await fireEvent.press(screen.getByText('Continuer'));
    expect(screen.getByText('Quand se renouvelle-t-il ?')).toBeTruthy();
    expect(screen.getByText('Cycle de facturation')).toBeTruthy();
    expect(screen.getByLabelText('Chaque trimestre')).toBeTruthy();
    expect(screen.getByText('Enregistrer les modifications')).toBeTruthy();
    expectNoRawText(screen.toJSON());

    await fireEvent.press(screen.getByLabelText('Supprimer cet abonnement'));
    expect(mockConfirm).toHaveBeenCalledWith({
      title: `Supprimer cet abonnement${NBSP}?`,
      message: 'Cette action est irréversible.',
      confirmLabel: 'Supprimer',
      destructive: true,
    });
  });
});

describe('What a subscription saves', () => {
  it('is the same in every language', async () => {
    const english = await addNetflix('en', {
      continue: 'Continue',
      yearly: 'Yearly',
      save: 'Save subscription',
    });
    mockCreate.mockClear();
    const spanish = await addNetflix('es', {
      continue: 'Continuar',
      yearly: 'Anual',
      save: 'Guardar suscripción',
    });
    mockCreate.mockClear();
    const french = await addNetflix('fr', {
      continue: 'Continuer',
      yearly: 'Chaque année',
      save: 'Enregistrer l’abonnement',
    });

    expect(english).toMatchObject({
      name: 'Netflix',
      amount: 1234.56,
      cycle: 'yearly',
      category_id: 'entertainment',
      next_renewal_on: '2026-10-12',
    });
    expect(spanish).toEqual(english);
    expect(french).toEqual(english);
  });
});
