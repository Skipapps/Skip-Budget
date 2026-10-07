import { fireEvent, render, waitFor } from '@testing-library/react-native';

import type { LogoMatch } from '@/api/logos';
import ChangeLogoScreen from '@/app/change-logo';
import { resetLocaleForTests, setLanguage } from '@/i18n/store';

/**
 * Change logo in Spanish and French: the choices, the bold name inside "Looks like", Report and
 * its thanks, and the failure line. What is saved never depends on the language.
 */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);
jest.mock('@/lib/haptics', () => ({
  tap: jest.fn(),
  success: jest.fn(),
  warn: jest.fn(),
  selection: jest.fn(),
}));
jest.mock('@/providers/theme-provider', () => ({
  useColors: () => ({ ink: '#000000', muted: '#777777', accentInk: '#905479', body: '#333333' }),
}));
jest.mock('@/theme/artwork', () => ({
  useArtwork: () => new Proxy({}, { get: () => () => null }),
}));
jest.mock('@/components/ui/skeleton', () => ({ SkeletonList: () => null }));
jest.mock('@/components/brands/brand-logo', () => ({ BrandLogo: () => null }));
jest.mock('@/components/brands/brand-mark', () => ({ BrandMark: () => null }));
jest.mock('@/components/bills/bill-mark', () => ({ BillMark: () => null }));

let mockParams: Record<string, string | undefined> = {};
jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: jest.fn(), replace: jest.fn(), canGoBack: () => true },
  useLocalSearchParams: () => mockParams,
}));

jest.mock('@/lib/supabase', () => ({ supabase: {} }));
jest.mock('@/api/brands', () => ({
  ...jest.requireActual('@/api/brands'),
  useBrandDirectory: () => ({ data: [] }),
}));

type Read = { data: unknown; isError: boolean; isFetched: boolean; refetch: jest.Mock };
let mockRead: Read;
const idle = (): Read => ({
  data: undefined,
  isError: false,
  isFetched: false,
  refetch: jest.fn(),
});
jest.mock('@/api/queries', () => ({
  useReceipt: () => idle(),
  useSubscription: (id?: string) => (id ? mockRead : idle()),
  useBill: () => idle(),
}));

const mockSetLogo = jest.fn();
jest.mock('@/api/mutations', () => ({
  useSetRowLogo: () => ({ mutateAsync: mockSetLogo, isPending: false }),
}));

const CALM: LogoMatch = {
  matched: true,
  name: 'Calm',
  domain: 'calm.com',
  confidence: 0.95,
  margin: 0.2,
  candidates: [
    { domain: 'calm.com', name: 'Calm', confidence: 0.95 },
    { domain: 'calmair.com', name: 'Calm Air', confidence: 0.7 },
  ],
};
const mockReport = jest.fn();
jest.mock('@/api/logos', () => ({
  useLogoMatch: (query: string) => ({
    data: query.trim().length < 2 ? undefined : CALM,
    isLoading: false,
    isFetching: false,
  }),
  reportWrongLogo: (input: object) => mockReport(input),
}));

const SUBSCRIPTION = {
  id: 's1',
  name: 'Calm',
  category_id: 'fitness',
  brand_id: 'b-calmair',
  logo_domain: null,
  logo_hidden: false,
  brands: { domain: 'calmair.com' },
};

const RAW_KEY = /^[a-z]+\.[a-zA-Z]+\./;

type Screen = Awaited<ReturnType<typeof render>>;
function expectAllWorded(screen: Screen) {
  const lines = [
    ...screen.getAllByText(/./).map((node) => String(node.props.children)),
    ...screen.queryAllByLabelText(/./).map((node) => String(node.props.accessibilityLabel)),
  ];
  for (const line of lines) {
    expect(line).not.toMatch(RAW_KEY);
    expect(line).not.toMatch(/\{\w+\}/);
  }
}

beforeEach(() => {
  jest.clearAllMocks();
  resetLocaleForTests();
  mockParams = { kind: 'subscription', id: 's1', name: 'Calm' };
  mockRead = { data: SUBSCRIPTION, isError: false, isFetched: true, refetch: jest.fn() };
  mockSetLogo.mockResolvedValue(undefined);
  mockReport.mockResolvedValue(true);
});

describe('in Spanish', () => {
  beforeEach(() => setLanguage('es'));

  it('offers every choice, with the name in the sentence', async () => {
    const screen = await render(<ChangeLogoScreen />);

    expect(screen.getByText('Cambiar logo')).toBeTruthy();
    expect(screen.getByText('Parece que es Calm')).toBeTruthy();
    for (const label of [
      'Sí, es ese',
      'No es este',
      'Usar el sitio web',
      'Sin logo, usar letras',
      'Reportar este logo',
      'Guardar logo',
    ]) {
      expect(screen.getByLabelText(label)).toBeTruthy();
    }
    expect(screen.getByLabelText('Reportar este logo').props.accessibilityHint).toBe(
      'Avisa a Skip que este logo está mal, para corregirlo para todos',
    );
    expectAllWorded(screen);
  });

  it('opens the website finder in Spanish', async () => {
    const screen = await render(<ChangeLogoScreen />);

    await fireEvent.press(screen.getByLabelText('Usar el sitio web'));

    expect(screen.getByText('Sitio web')).toBeTruthy();
    expect(screen.getByPlaceholderText('example.com')).toBeTruthy();
    expect(screen.getByLabelText('Buscar el logo de este sitio web')).toBeTruthy();
    expect(screen.getByText('Buscar')).toBeTruthy();
  });

  it('thanks the person for a report in Spanish', async () => {
    const screen = await render(<ChangeLogoScreen />);

    await fireEvent.press(screen.getByLabelText('Reportar este logo'));

    await waitFor(() => expect(screen.getByText('Gracias. Revisaremos este logo.')).toBeTruthy());
  });

  it('saves the same values whatever the language', async () => {
    const screen = await render(<ChangeLogoScreen />);

    await fireEvent.press(screen.getByLabelText('Sin logo, usar letras'));
    await fireEvent.press(screen.getByLabelText('Guardar logo'));

    await waitFor(() => expect(mockSetLogo).toHaveBeenCalledTimes(1));
    expect(mockSetLogo).toHaveBeenCalledWith({
      kind: 'subscription',
      id: 's1',
      logo_domain: null,
      logo_hidden: true,
    });
  });
});

describe('in French', () => {
  beforeEach(() => setLanguage('fr'));

  it('offers every choice, with the name in the sentence', async () => {
    const screen = await render(<ChangeLogoScreen />);

    expect(screen.getByText('Changer le logo')).toBeTruthy();
    expect(screen.getByText('On dirait Calm')).toBeTruthy();
    for (const label of [
      'Oui, c’est ça',
      'Pas celui-ci',
      'Utiliser plutôt le site Web',
      'Pas de logo, utiliser les lettres',
      'Signaler ce logo',
      'Enregistrer le logo',
    ]) {
      expect(screen.getByLabelText(label)).toBeTruthy();
    }
    expectAllWorded(screen);
  });

  it('says the one failure line when the report does not go', async () => {
    mockReport.mockResolvedValueOnce(false);
    const screen = await render(<ChangeLogoScreen />);

    await fireEvent.press(screen.getByLabelText('Signaler ce logo'));

    await waitFor(() =>
      expect(screen.getByText('Une erreur est survenue. Réessaie.')).toBeTruthy(),
    );
  });

  it('offers the way back when the row cannot be read', async () => {
    mockRead = { data: undefined, isError: true, isFetched: true, refetch: jest.fn() };
    const screen = await render(<ChangeLogoScreen />);

    expect(screen.getByText('Une erreur est survenue. Réessaie.')).toBeTruthy();
    expect(screen.getByText('Réessayer')).toBeTruthy();
    expect(screen.getAllByText('Retour').length).toBeGreaterThan(0);
  });
});
