import { fireEvent, render } from '@testing-library/react-native';

import AccountOfferScreen from '@/app/account-offer';
import AvatarScreen from '@/app/avatar';
import HelloScreen from '@/app/hello';
import SetupScreen from '@/app/setup';
import SetupBillsScreen from '@/app/setup-bills';
import SetupSubscriptionsScreen from '@/app/setup-subscriptions';
import TourScreen from '@/app/tour';
import WelcomeScreen from '@/app/welcome';
import WhatSkipCanDoScreen from '@/app/what-skip-can-do';
import type { SetupStep } from '@/api/onboarding';
import { resetLocaleForTests, setLanguage } from '@/i18n/store';

/** The welcome pitch, the walk-in and the first questions, read in Spanish and in French. */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));

jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);

jest.mock('expo-router', () => {
  const { Text } = jest.requireActual('react-native');
  return {
    router: {
      push: jest.fn(),
      replace: jest.fn(),
      back: jest.fn(),
      canGoBack: () => true,
      canDismiss: () => false,
      dismissAll: jest.fn(),
    },
    Redirect: ({ href }: { href: string }) => <Text>{`redirect:${href}`}</Text>,
  };
});

jest.mock('@/lib/nav', () => ({ resetTo: jest.fn() }));

// Artwork imports SVGs, which Jest has no transformer for.
jest.mock('@/theme/artwork', () => ({
  useArtwork: () => new Proxy({}, { get: () => () => null }),
}));

jest.mock('@/providers/theme-provider', () => ({
  useColors: () => ({
    ink: '#000000',
    muted: '#777777',
    body: '#333333',
    line: '#DDDDDD',
    surface: '#FFFFFF',
    onControl: '#FFFFFF',
    accentInk: '#905479',
  }),
  useMoneyColor: () => () => '#000000',
}));

jest.mock('@/providers/session-provider', () => ({
  useSession: () => ({ session: null, ready: true }),
}));

jest.mock('@/components/ui/profile-avatar', () => ({ ProfileAvatar: () => null }));
// The pictures live outside src, where Jest's alias does not reach.
jest.mock('@/theme/avatars', () => ({
  AVATARS: Array.from({ length: 15 }, (_, index) => ({
    id: `avatar-${index + 1}`,
    label: `Avatar ${index + 1}`,
    source: { uri: `avatar-${index + 1}.png` },
  })),
}));
jest.mock('@/components/ui/skeleton', () => ({
  Skeleton: () => null,
  SkeletonList: () => null,
}));
jest.mock('@/components/bills/bill-row', () => ({ BillRow: () => null }));
jest.mock('@/components/subscriptions/subscription-row', () => ({
  SubscriptionRow: () => null,
}));

// The real SDK starts a cleanup interval on import that keeps Jest from exiting.
jest.mock('@sentry/react-native', () => ({ captureException: jest.fn() }));

let mockProfile: { data?: unknown; isLoading: boolean; isError: boolean };
let mockList: { data?: unknown[]; isPending: boolean; isError: boolean };

jest.mock('@/api/queries', () => ({
  useProfile: () => ({ ...mockProfile, refetch: jest.fn() }),
  useBills: () => ({ ...mockList, refetch: jest.fn() }),
  useSubscriptions: () => ({ ...mockList, refetch: jest.fn() }),
  usePaymentSources: () => ({ sources: [] }),
}));
jest.mock('@/api/mutations', () => ({ useUpdateProfile: () => ({ mutate: jest.fn() }) }));

const mockSteps: SetupStep[] = [
  { id: 'salary', title: 'Pay', detail: 'd', done: true, href: '/salary' },
  { id: 'wallet', title: 'Wallet', detail: 'd', done: false, href: '/add-card' },
  { id: 'bill', title: 'Bills', detail: 'd', done: false, href: '/add-bill' },
  { id: 'subscription', title: 'Subs', detail: 'd', done: false, href: '/add-subscription' },
  {
    id: 'receipt',
    title: 'Receipt',
    detail: 'd',
    done: false,
    href: '/add-receipt',
    optional: true,
  },
];

jest.mock('@/api/onboarding', () => ({
  useGettingStarted: () => ({
    steps: mockSteps,
    doneCount: 0,
    requiredDone: false,
    settled: true,
    dismissed: false,
    visible: true,
    dismiss: jest.fn(),
  }),
}));

type Screen = Awaited<ReturnType<typeof render>>;
type Json = ReturnType<Screen['toJSON']>;

/** Every string drawn or read out, so a raw key or an unfilled {param} cannot hide anywhere. */
function wordsOn(screen: Screen): string[] {
  const found: string[] = [];
  const walk = (node: Json | string | Json[]) => {
    if (node === null) return;
    if (typeof node === 'string') return void found.push(node);
    if (Array.isArray(node)) return node.forEach(walk);
    for (const prop of ['accessibilityLabel', 'accessibilityHint', 'placeholder']) {
      const value = node.props[prop];
      if (typeof value === 'string') found.push(value);
    }
    node.children?.forEach(walk);
  };
  walk(screen.toJSON());
  return found;
}

function expectNoRawText(screen: Screen) {
  const words = wordsOn(screen);
  expect(words.length).toBeGreaterThan(0);
  expect(words.filter((word) => /^[a-z]+\.[a-zA-Z]+\./.test(word))).toEqual([]);
  expect(words.filter((word) => /\{\w+\}/.test(word))).toEqual([]);
}

beforeEach(() => {
  jest.clearAllMocks();
  resetLocaleForTests();
  mockProfile = { data: { display_name: '', avatar_id: null }, isLoading: false, isError: false };
  mockList = { data: [], isPending: false, isError: false };
});
afterAll(() => resetLocaleForTests());

describe('onboarding in Spanish', () => {
  beforeEach(() => setLanguage('es'));

  it('welcomes, with each bold phrase inside its own sentence', async () => {
    const screen = await render(<WelcomeScreen />);
    expect(screen.getByText('Tu dinero, tu privacidad.')).toBeTruthy();
    expect(
      screen.getByText(
        'Lleva el control de tus gastos, facturas, suscripciones y saldos de tarjetas, todo en un solo lugar.',
      ),
    ).toBeTruthy();
    expect(screen.getByText('todo en un solo lugar')).toBeTruthy();
    expect(
      screen.getByText(
        'Nunca te pedimos los datos de tu banco. Tú decides qué sabe Skip, y nada más.',
      ),
    ).toBeTruthy();
    expect(screen.getByText('Comenzar')).toBeTruthy();
    expect(screen.getByText('Ya tengo una cuenta')).toBeTruthy();
    expectNoRawText(screen);
  });

  it('lists what Skip can do, short', async () => {
    const screen = await render(<WhatSkipCanDoScreen />);
    expect(screen.getByText('Lo que Skip puede hacer')).toBeTruthy();
    expect(screen.getByText('Préstamos, al centavo')).toBeTruthy();
    expect(
      screen.getByText(
        'Intereses diarios, para que el saldo a liquidar coincida con tu estado de cuenta.',
      ),
    ).toBeTruthy();
    expect(screen.getByText('Continuar')).toBeTruthy();
    expectNoRawText(screen);
  });

  it('tours the five stops, read out whole', async () => {
    const screen = await render(<TourScreen />);
    expect(screen.getByText(/^Cinco cosas, cada una a un toque\./)).toBeTruthy();
    expect(screen.getByText('Ahorros que se explican solos')).toBeTruthy();
    expect(
      screen.getByLabelText(
        'Escanea recibos con un toque. Apunta la cámara a un recibo y se lee en tu teléfono: tienda, fecha y total, listos para revisar y guardar. La foto nunca sale del dispositivo.',
      ),
    ).toBeTruthy();
    expectNoRawText(screen);
  });

  it('offers the bank account, with Skip as the verb', async () => {
    const screen = await render(<AccountOfferScreen />);
    expect(screen.getByText('Agrega tu cuenta bancaria')).toBeTruthy();
    expect(screen.getByText('Agregar cuenta bancaria')).toBeTruthy();
    expect(screen.getByText('Omitir')).toBeTruthy();
    expectNoRawText(screen);
  });

  it('names the faces by number', async () => {
    const screen = await render(<AvatarScreen />);
    expect(screen.getByText('Foto de perfil')).toBeTruthy();
    expect(screen.getByLabelText('Sin foto de perfil')).toBeTruthy();
    expect(screen.getByLabelText('Avatar 1')).toBeTruthy();
    expectNoRawText(screen);
  });

  it('asks for a name', async () => {
    const screen = await render(<HelloScreen />);
    expect(screen.getByText('¿Cómo quieres que te llamemos?')).toBeTruthy();
    expect(screen.getByText('Tu nombre')).toBeTruthy();
    expect(screen.getByLabelText('Elige una foto de perfil')).toBeTruthy();
    expect(screen.getByText('Omitir por ahora')).toBeTruthy();
    expectNoRawText(screen);
  });

  it('says the one failure line when the profile will not load', async () => {
    mockProfile = { isLoading: false, isError: true };
    const screen = await render(<HelloScreen />);
    expect(screen.getByText('Algo salió mal. Inténtalo de nuevo.')).toBeTruthy();
    expect(screen.getByText('Intentar de nuevo')).toBeTruthy();
    expectNoRawText(screen);
  });

  it('walks in, counting the steps out loud', async () => {
    const screen = await render(<SetupScreen />);
    expect(screen.getByText('Configuremos Skip')).toBeTruthy();
    expect(screen.getByText('Continuar')).toBeTruthy();
    expect(screen.getByText('Configurar después')).toBeTruthy();
    expect(screen.getByText('Opcional')).toBeTruthy();
    expect(screen.getByLabelText('Paso 1, Pay. Listo.')).toBeTruthy();
    expectNoRawText(screen);
  });

  it('collects bills, before the first and after', async () => {
    const empty = await render(<SetupBillsScreen />);
    expect(empty.getByText('Agrega tus facturas')).toBeTruthy();
    expect(empty.getByText('Tus facturas aparecen aquí a medida que las agregas.')).toBeTruthy();
    expect(empty.getByText('Agregar una factura')).toBeTruthy();
    expect(empty.getByText('Omitir por ahora')).toBeTruthy();
    expectNoRawText(empty);

    mockList = {
      data: [{ id: 'b1', name: 'Renta', amount: 1500 }],
      isPending: false,
      isError: false,
    };
    const some = await render(<SetupBillsScreen />);
    expect(some.getByText('Agregar otra factura')).toBeTruthy();
    expect(some.getByText('Listo')).toBeTruthy();
  });

  it('collects subscriptions, and says the failure line when they will not load', async () => {
    const empty = await render(<SetupSubscriptionsScreen />);
    expect(empty.getByText('Agrega tus suscripciones')).toBeTruthy();
    expect(empty.getByText('Agregar una suscripción')).toBeTruthy();

    mockList = { isPending: false, isError: true };
    const failed = await render(<SetupSubscriptionsScreen />);
    expect(failed.getByText('Algo salió mal. Inténtalo de nuevo.')).toBeTruthy();
    expect(failed.getByText('Intentar de nuevo')).toBeTruthy();
    expectNoRawText(failed);
  });
});

describe('onboarding in French', () => {
  beforeEach(() => setLanguage('fr'));

  it('welcomes, with each bold phrase inside its own sentence', async () => {
    const screen = await render(<WelcomeScreen />);
    expect(screen.getByText('Ton argent, ta vie privée.')).toBeTruthy();
    expect(
      screen.getByText(
        'Suis tes dépenses, factures, abonnements et soldes de cartes — tout au même endroit.',
      ),
    ).toBeTruthy();
    expect(screen.getByText('Commencer')).toBeTruthy();
    expectNoRawText(screen);
  });

  it('lists what Skip can do, short', async () => {
    const screen = await render(<WhatSkipCanDoScreen />);
    expect(screen.getByText('Ce que Skip peut faire')).toBeTruthy();
    expect(screen.getByText('Les prêts, au cent près')).toBeTruthy();
    expect(screen.getByText('Continuer')).toBeTruthy();
    expectNoRawText(screen);
  });

  it('tours the five stops', async () => {
    const screen = await render(<TourScreen />);
    expect(screen.getByText(/^Cinq choses, chacune à une touche de distance\./)).toBeTruthy();
    expect(screen.getByText('Une épargne qui s’explique d’elle-même')).toBeTruthy();
    expectNoRawText(screen);
  });

  it('offers the bank account, with Skip as the verb', async () => {
    const screen = await render(<AccountOfferScreen />);
    expect(screen.getByText('Ajoute ton compte bancaire')).toBeTruthy();
    expect(screen.getByText('Passer')).toBeTruthy();
    expectNoRawText(screen);
  });

  it('names the faces by number', async () => {
    const screen = await render(<AvatarScreen />);
    expect(screen.getByText('Photo de profil')).toBeTruthy();
    expect(screen.getByText('Aucune photo', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.getByLabelText('Avatar 15')).toBeTruthy();
    expectNoRawText(screen);
  });

  it('asks for a name', async () => {
    const screen = await render(<HelloScreen />);
    expect(screen.getByText('Comment veux-tu qu’on t’appelle\u00a0?')).toBeTruthy();
    expect(screen.getByText('Ton nom')).toBeTruthy();
    expect(screen.getByText('Continuer')).toBeTruthy();
    expectNoRawText(screen);
  });

  it('walks in', async () => {
    const screen = await render(<SetupScreen />);
    expect(screen.getByText('Configurons Skip')).toBeTruthy();
    expect(screen.getByText('Configurer plus tard')).toBeTruthy();
    expect(screen.getByText('Facultatif')).toBeTruthy();
    expect(screen.getByLabelText('Étape 1, Pay. Terminée.')).toBeTruthy();

    await fireEvent.press(screen.getByText('Continuer'));
    expectNoRawText(screen);
  });

  it('collects bills and subscriptions', async () => {
    const bills = await render(<SetupBillsScreen />);
    expect(bills.getByText('Ajoute tes factures')).toBeTruthy();
    expect(bills.getByText('Ajouter une facture')).toBeTruthy();
    expect(bills.getByText('Passer pour l’instant')).toBeTruthy();
    expectNoRawText(bills);

    mockList = {
      data: [{ id: 's1', name: 'Netflix', amount: 15 }],
      isPending: false,
      isError: false,
    };
    const subscriptions = await render(<SetupSubscriptionsScreen />);
    expect(subscriptions.getByText('Ajouter un autre abonnement')).toBeTruthy();
    expect(subscriptions.getByText('Terminé')).toBeTruthy();
  });
});
