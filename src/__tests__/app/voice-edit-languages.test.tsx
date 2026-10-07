import { act, fireEvent, render } from '@testing-library/react-native';
import { router } from 'expo-router';

import VoiceEditScreen from '@/app/voice-edit';
import { t } from '@/i18n';
import { resetLocaleForTests, setLanguage } from '@/i18n/store';
import type { VoiceDraft } from '@/lib/voice';
import {
  clearVoiceDraft,
  putVoiceDraft,
  readVoiceEntry,
  updateVoiceEntry,
} from '@/lib/voice-draft';

/**
 * /voice-edit in Spanish and French: each correction page asks its question in the language on
 * screen, and what Done writes is the same value in every language.
 */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));

jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);

let mockParams: { draft?: string; field?: string } = {};
jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    dismissTo: jest.fn(),
    canGoBack: () => true,
  },
  useLocalSearchParams: () => mockParams,
  useFocusEffect: () => {},
  Stack: { Screen: () => null },
  Redirect: () => null,
}));

jest.mock('@/providers/theme-provider', () => ({
  useColors: () => ({
    ink: '#000000',
    body: '#333333',
    muted: '#777777',
    line: '#DDDDDD',
    surface: '#FFFFFF',
    onControl: '#FFFFFF',
    accentInk: '#5B3A6B',
  }),
}));
jest.mock('@/theme/artwork', () => ({
  useArtwork: () => new Proxy({}, { get: () => () => null }),
}));
jest.mock('@/providers/dialog-provider', () => ({ useConfirm: () => async () => true }));
jest.mock('@/api/pro', () => ({ usePro: () => ({ pro: true, ready: true }) }));
jest.mock('@/api/known-stores', () => ({
  matchKnownStores: () => [],
  storeKey: (name: string) => name.trim().toLowerCase(),
  useKnownStores: () => [],
  useRememberStore: () => async () => {},
}));
jest.mock('@/lib/haptics', () => ({
  tap: jest.fn(),
  toggle: jest.fn(),
  warn: jest.fn(),
  success: jest.fn(),
  selection: jest.fn(),
}));
jest.mock('@/lib/use-today', () => ({
  useToday: () => ({ today: '2026-10-01', todayDate: new Date('2026-10-01T00:00:00') }),
}));
jest.mock('@/components/brands/brand-logo', () => ({ BrandLogo: () => null }));
jest.mock('@/api/brands', () => ({
  useBrandSearch: () => ({ data: [], isFetching: false }),
  guessCategory: () => 'other',
}));

const mockSources = [
  { id: 'card-1', label: 'VISA ••4821', color: '#123456', kind: 'card' as const },
];
jest.mock('@/api/queries', () => ({ usePaymentSources: () => ({ sources: mockSources }) }));
// The forms' reminder page shares a module with the note page; nothing here opens it.
jest.mock('@/components/ui/reminder-field', () => ({ ReminderField: () => null }));

const NBSP = ' ';

const RECEIPT: VoiceDraft = {
  kind: 'receipt',
  kindSure: true,
  amount: null,
  amountChoices: [],
  merchant: null,
  merchantHeard: null,
  merchantSource: null,
  multiple: false,
  date: null,
  cycle: null,
  billCategoryId: null,
  score: 9,
  confidence: 'high',
  missing: [],
  transcript: 'Spent at the deli',
};

function open(field: string, patch: Partial<VoiceDraft> = {}): string {
  const id = putVoiceDraft({ ...RECEIPT, ...patch });
  mockParams = { draft: id, field };
  return id;
}

type Screen = Awaited<ReturnType<typeof render>>;

async function press(screen: Screen, label: string) {
  await act(async () => {
    fireEvent.press(screen.getByLabelText(label));
  });
}

function everyLine(screen: Screen): string[] {
  const lines: string[] = [];
  const walk = (node: unknown) => {
    if (node == null) return;
    if (typeof node === 'string') {
      lines.push(node);
      return;
    }
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    const { props, children } = node as { props?: Record<string, unknown>; children?: unknown[] };
    for (const name of ['accessibilityLabel', 'accessibilityHint', 'placeholder']) {
      if (typeof props?.[name] === 'string') lines.push(props[name] as string);
    }
    (children ?? []).forEach(walk);
  };
  walk(screen.toJSON());
  return lines;
}

function expectNoRawKeys(screen: Screen) {
  for (const line of everyLine(screen)) {
    expect(line).not.toMatch(/^[a-z]+\.[a-zA-Z]+\./);
    expect(line).not.toMatch(/\{\w+\}/);
  }
}

/** Types 1234.56 on the keypad and saves it, whatever the language calls the keys. */
async function typeAndSave(language: 'en' | 'es' | 'fr'): Promise<number | null | undefined> {
  setLanguage(language);
  const id = open('amount');
  const screen = await render(<VoiceEditScreen />);
  for (const key of ['1', '2', '3', '4']) await press(screen, key);
  await press(screen, t('loan.keypad.decimal'));
  for (const key of ['5', '6']) await press(screen, key);
  await press(screen, t('common.done'));
  return readVoiceEntry(id)?.amount;
}

beforeEach(() => {
  jest.clearAllMocks();
  resetLocaleForTests();
  clearVoiceDraft();
});

afterAll(() => resetLocaleForTests());

describe('/voice-edit in Spanish', () => {
  beforeEach(() => setLanguage('es'));

  it('asks how much in Spanish', async () => {
    open('amount', { amount: 12.5 });
    const screen = await render(<VoiceEditScreen />);

    expect(screen.getByText('Importe')).toBeTruthy();
    expect(screen.getByText('¿Cuánto gastaste?')).toBeTruthy();
    expect(screen.getByLabelText('Listo')).toBeTruthy();
    expectNoRawKeys(screen);
  });

  it('asks who a bill is from, with the company search and name in Spanish', async () => {
    open('merchant', { kind: 'bill', billCategoryId: 'housing' });
    const screen = await render(<VoiceEditScreen />);

    expect(screen.getAllByText('Nombre').length).toBeGreaterThan(0);
    expect(screen.getByText('¿De quién es la factura?')).toBeTruthy();
    expect(screen.getByText('Empresa')).toBeTruthy();
    expect(screen.getByPlaceholderText('Busca una empresa')).toBeTruthy();
    // A bill with no name of its own is named after its category as read.
    expect(screen.getByDisplayValue('Vivienda')).toBeTruthy();
    expectNoRawKeys(screen);
  });

  it('asks when a subscription renews, and offers no renewal date', async () => {
    const id = open('date', { kind: 'subscription', date: '2026-10-20' });
    const screen = await render(<VoiceEditScreen />);

    // Titled by the review's row, which is the subscription form's own.
    expect(screen.getByText('Próxima renovación')).toBeTruthy();
    expect(screen.getByText('¿Cuándo se renueva?')).toBeTruthy();
    await press(screen, 'Sin fecha de renovación');
    expect(readVoiceEntry(id)?.date).toBeNull();
    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it('asks what a bill is for', async () => {
    open('category', { kind: 'bill', billCategoryId: 'housing' });
    const screen = await render(<VoiceEditScreen />);

    expect(screen.getByText('Categoría')).toBeTruthy();
    expect(screen.getByText('¿De qué es esta factura?')).toBeTruthy();
    expectNoRawKeys(screen);
  });

  it('asks what paid in Spanish, and clears the card with its own words', async () => {
    const id = open('source');
    updateVoiceEntry(id, { sourceId: 'card-1' });
    const screen = await render(<VoiceEditScreen />);

    expect(screen.getByText('Pagado con')).toBeTruthy();
    expect(screen.getByText('¿Con qué pagaste?')).toBeTruthy();
    expectNoRawKeys(screen);
    await press(screen, 'Sin tarjeta ni cuenta');
    await press(screen, 'Listo');
    expect(readVoiceEntry(id)?.sourceId).toBeNull();
  });

  it('takes a note in Spanish, with the form’s own hint', async () => {
    const id = open('note', { kind: 'bill', billCategoryId: 'housing', date: '2026-11-01' });
    const screen = await render(<VoiceEditScreen />);

    expect(screen.getAllByText('Nota').length).toBeGreaterThan(0);
    await act(async () => {
      fireEvent.changeText(
        screen.getByPlaceholderText('Algo que quieras recordar'),
        'Pagar en efectivo',
      );
    });
    expectNoRawKeys(screen);
    await press(screen, 'Listo');
    expect(readVoiceEntry(id)?.note).toBe('Pagar en efectivo');
  });
});

describe('/voice-edit in French', () => {
  beforeEach(() => setLanguage('fr'));

  it('asks where a receipt was bought, with the store search in French', async () => {
    open('merchant');
    const screen = await render(<VoiceEditScreen />);

    expect(screen.getAllByText('Magasin').length).toBeGreaterThan(0);
    expect(screen.getByText(`Où l’as-tu acheté${NBSP}?`)).toBeTruthy();
    expect(screen.getByPlaceholderText('Cherche un magasin')).toBeTruthy();
    expect(screen.getByLabelText('Terminé')).toBeTruthy();
    expectNoRawKeys(screen);
  });

  it('asks which service a subscription is', async () => {
    open('merchant', { kind: 'subscription' });
    const screen = await render(<VoiceEditScreen />);

    expect(screen.getAllByText('Service').length).toBeGreaterThan(0);
    expect(screen.getByText(`Quel est le service${NBSP}?`)).toBeTruthy();
    expect(screen.getByPlaceholderText('Cherche un service')).toBeTruthy();
  });

  it('asks when a bill is due', async () => {
    open('date', { kind: 'bill', billCategoryId: 'housing' });
    const screen = await render(<VoiceEditScreen />);

    expect(screen.getByText('Date d’échéance')).toBeTruthy();
    expect(screen.getByText(`Quelle est la date d’échéance${NBSP}?`)).toBeTruthy();
    expectNoRawKeys(screen);
  });

  it('asks when a receipt was, titled as its row', async () => {
    open('date');
    const screen = await render(<VoiceEditScreen />);

    expect(screen.getByText('Date')).toBeTruthy();
    expect(screen.getByText(`C’était quand${NBSP}?`)).toBeTruthy();
  });

  it('asks what a subscription is charged to, in French', async () => {
    const id = open('source', { kind: 'subscription', cycle: 'monthly' });
    const screen = await render(<VoiceEditScreen />);

    expect(screen.getByText('Prélevé sur')).toBeTruthy();
    expect(screen.getByText(`Tu as payé avec quoi${NBSP}?`)).toBeTruthy();
    expectNoRawKeys(screen);
    await press(screen, 'VISA ••4821');
    await press(screen, 'Terminé');
    expect(readVoiceEntry(id)?.sourceId).toBe('card-1');
  });

  it('takes a note in French, with the form’s own hint', async () => {
    const id = open('note', { kind: 'subscription', cycle: 'monthly' });
    const screen = await render(<VoiceEditScreen />);

    await act(async () => {
      fireEvent.changeText(
        screen.getByPlaceholderText('Quel forfait, par exemple'),
        ' Forfait famille ',
      );
    });
    expectNoRawKeys(screen);
    await press(screen, 'Terminé');
    expect(readVoiceEntry(id)?.note).toBe('Forfait famille');
  });
});

describe('/voice-edit amounts', () => {
  it.each(['en', 'es', 'fr'] as const)(
    'stores 1234.56 typed in %s as 1234.56',
    async (language) => {
      expect(await typeAndSave(language)).toBe(1234.56);
    },
  );
});

describe('/voice-edit bill names', () => {
  const HOUSING = { en: 'Housing', es: 'Vivienda', fr: 'Logement' } as const;
  const BILL = { kind: 'bill' as const, billCategoryId: 'housing', date: '2026-11-01' };

  it.each(['en', 'es', 'fr'] as const)(
    'opens on the category as read in %s and leaves it unnamed when unchanged',
    async (language) => {
      setLanguage(language);
      const id = open('merchant', BILL);
      const screen = await render(<VoiceEditScreen />);

      expect(screen.getByDisplayValue(HOUSING[language])).toBeTruthy();
      await press(screen, t('common.done'));
      // Unnamed, so the review page and its save name it after the category as read.
      expect(readVoiceEntry(id)?.billName).toBeNull();
      expect(readVoiceEntry(id)?.billCategoryId).toBe('housing');
    },
  );

  it.each(['en', 'es', 'fr'] as const)('keeps a name typed by hand in %s', async (language) => {
    setLanguage(language);
    const id = open('merchant', BILL);
    const screen = await render(<VoiceEditScreen />);

    await act(async () => {
      fireEvent.changeText(screen.getByDisplayValue(HOUSING[language]), 'Casa de mamá');
    });
    await press(screen, t('common.done'));
    expect(readVoiceEntry(id)?.billName).toBe('Casa de mamá');
  });

  it('lets a name that was only the old category’s follow a new category, in Spanish', async () => {
    setLanguage('es');
    const id = putVoiceDraft({ ...RECEIPT, ...BILL });
    updateVoiceEntry(id, { billName: 'Vivienda' });
    mockParams = { draft: id, field: 'category' };
    const screen = await render(<VoiceEditScreen />);

    await press(screen, 'Internet. Internet de casa y wifi');
    expect(readVoiceEntry(id)?.billCategoryId).toBe('internet');
    expect(readVoiceEntry(id)?.billName).toBeNull();
  });
});
