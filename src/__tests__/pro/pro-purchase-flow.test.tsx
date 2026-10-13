import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { router } from 'expo-router';
import { useState, useSyncExternalStore, type ComponentType, type Context } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import ProScreen from '@/app/pro';
import ProFeatureScreen from '@/app/pro-feature';
import ProOfferScreen from '@/app/pro-offer';
import { useProGate } from '@/components/pro/pro-gate';
import { publishProStatus, resetProStatusForTests } from '@/lib/pro-status';

/**
 * The whole way from a locked door to the feature: explainer, Pro page (or the offer in its place),
 * Apple's answer, and on. Buying, restoring and buying the offer all end inside the feature the
 * person was opening, never on the explainer again; the Pro page opened from Settings behaves as it
 * always has.
 */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);
jest.mock('@sentry/react-native', () => ({ captureException: jest.fn() }));
jest.mock('@/providers/theme-provider', () => ({
  useColors: () => ({
    ink: '#000000',
    muted: '#777777',
    body: '#333333',
    line: '#DDDDDD',
    accentInk: '#905479',
    onControl: '#FFFFFF',
  }),
}));

type Entry = { key: number; pathname: string; params: Record<string, string> };

function entryOf(href: unknown, key: number): Entry {
  if (typeof href === 'string') {
    const [pathname, query = ''] = href.split('?');
    return { key, pathname, params: Object.fromEntries(new URLSearchParams(query)) };
  }
  const given = href as { pathname: string; params?: Record<string, unknown> };
  return {
    key,
    pathname: given.pathname,
    params: Object.fromEntries(
      Object.entries(given.params ?? {}).map(([name, value]) => [name, String(value)]),
    ),
  };
}

/** A native stack: every page stays mounted under the one on top, and only the top is focused. */
const mockNav = {
  stack: [] as Entry[],
  next: 1,
  listeners: new Set<() => void>(),
  set(stack: Entry[]) {
    this.stack = stack;
    this.listeners.forEach((listener) => listener());
  },
  push(href: unknown) {
    this.set([...this.stack, entryOf(href, this.next++)]);
  },
  back() {
    this.set(this.stack.slice(0, -1));
  },
  replace(href: unknown) {
    this.set([...this.stack.slice(0, -1), entryOf(href, this.next++)]);
  },
  reset(pages: unknown[]) {
    this.next = 1;
    this.stack = pages.map((page) => entryOf(page, this.next++));
    this.listeners.clear();
  },
  subscribe: (listener: () => void) => {
    mockNav.listeners.add(listener);
    return () => {
      mockNav.listeners.delete(listener);
    };
  },
};

jest.mock('expo-router', () => {
  const { createContext, useContext, useEffect } = jest.requireActual('react');
  const PageContext = createContext({ pathname: '/', params: {}, focused: true });
  return {
    __PageContext: PageContext,
    router: {
      push: jest.fn((href: unknown) => mockNav.push(href)),
      back: jest.fn(() => mockNav.back()),
      replace: jest.fn((href: unknown) => mockNav.replace(href)),
      canGoBack: () => mockNav.stack.length > 1,
    },
    useLocalSearchParams: () => useContext(PageContext).params,
    useCurrentRouteInfo: () => {
      const { pathname, params } = useContext(PageContext);
      const query = new URLSearchParams(params).toString();
      return { pathnameWithParams: query ? `${pathname}?${query}` : pathname };
    },
    // As expo-router's: replaces the page it is drawn in, once that page is on top.
    Redirect: ({ href }: { href: unknown }) => {
      const { focused } = useContext(PageContext);
      useEffect(() => {
        if (focused) mockNav.replace(href);
      });
      return null;
    },
    // As expo-router's: runs while the page is on top, again when the callback changes.
    useFocusEffect: (effect: () => void | (() => void)) => {
      const { focused } = useContext(PageContext);
      useEffect(() => (focused ? effect() : undefined), [effect, focused]);
    },
    Stack: { Screen: () => null },
  };
});

const PageContext = (
  jest.requireMock('expo-router') as {
    __PageContext: Context<{ pathname: string; params: Record<string, string>; focused: boolean }>;
  }
).__PageContext;

/** What a form keeps while it is open: here, one field. */
function FormBody({ id }: { id: string }) {
  const [name, setName] = useState('');
  // The database refuses the write as free, and the app hears so only now (a lapse, or the
  // server not yet agreeing after a purchase): the form pushes the explainer over itself.
  const save = async () => {
    await Promise.resolve();
    publishProStatus({ pro: false, ready: true });
    await Promise.resolve();
    router.push({ pathname: '/pro-feature', params: { id } });
  };
  return (
    <View>
      <TextInput accessibilityLabel="Name" value={name} onChangeText={setName} />
      <Pressable accessibilityRole="button" accessibilityLabel="Save" onPress={save} />
    </View>
  );
}

/** A Pro page behind the real gate, as habit-new and voice-review are. */
const gatedForm = (id: string) =>
  function GatedForm() {
    const gate = useProGate(id);
    if (gate) return gate;
    return <FormBody id={id} />;
  };

const PAGES: Record<string, ComponentType> = {
  '/pro-feature': ProFeatureScreen,
  '/pro': ProScreen,
  '/pro-offer': ProOfferScreen,
  '/habit-new': gatedForm('habits'),
  '/voice-review': gatedForm('voice'),
};

function Host() {
  const stack = useSyncExternalStore(mockNav.subscribe, () => mockNav.stack);
  return (
    <>
      {stack.map((entry, index) => {
        const Page = PAGES[entry.pathname];
        const focused = index === stack.length - 1;
        return (
          <View key={entry.key} testID={focused ? 'top' : `under-${entry.key}`}>
            <PageContext.Provider
              value={{ pathname: entry.pathname, params: entry.params, focused }}
            >
              {Page ? <Page /> : <Text>{`page ${entry.pathname}`}</Text>}
            </PageContext.Provider>
          </View>
        );
      })}
    </>
  );
}

// ---------------------------------------------------------------------------------------------
// The store and the one-time offer.

const yearlyPack = {
  product: { priceString: '$19.99', pricePerMonthString: '$1.67', identifier: 'yearly' },
};
const monthlyPack = {
  product: { priceString: '$1.99', pricePerMonthString: '$1.99', identifier: 'monthly' },
};
const offerPack = { product: { priceString: '$9.99', pricePerMonthString: '$0.83', price: 9.99 } };

/** When Apple's sheet closes, the SDK tells the app before (or after) the purchase call returns. */
let mockSdkFirst = true;
const mockPurchase = jest.fn(async () => {
  if (mockSdkFirst) publishProStatus({ pro: true, ready: true });
  return 'done' as const;
});
let mockRestored = true;
const mockRestore = jest.fn(async () => {
  if (mockRestored) publishProStatus({ pro: true, ready: true });
  return mockRestored;
});

jest.mock('@/api/pro', () => {
  const { t } = jest.requireActual('@/i18n');
  const prices = {
    isFetched: true,
    isFetching: false,
    error: null,
    refetch: jest.fn(),
  };
  return {
    usePro: () => jest.requireActual('@/lib/pro-status').useProStatus(),
    purchasesAvailable: () => true,
    trialPeriodLabel: ({ count }: { count: number }) => t('pro.period.day', { count }),
    usePurchasePro: () => ({ purchase: mockPurchase, restore: mockRestore }),
    useProPrices: () => ({
      ...prices,
      data: {
        yearly: yearlyPack,
        monthly: monthlyPack,
        trials: { monthly: null, yearly: null },
        debug: '',
      },
    }),
    useOfferPrices: () => ({
      ...prices,
      data: { offer: offerPack, regular: { product: { priceString: '$19.99', price: 19.99 } } },
    }),
  };
});

let mockOfferArmed = false;
jest.mock('@/api/pro-offer', () => ({
  useExitOffer: () => ({ armed: mockOfferArmed, claim: jest.fn(async () => true) }),
}));

// ---------------------------------------------------------------------------------------------

const paths = () => mockNav.stack.map((entry) => entry.pathname);
/** The page on top: the ones under it are still mounted, chevrons and all. */
const top = () => within(screen.getByTestId('top'));
const explainer = (id: string, next?: string) => ({
  pathname: '/pro-feature',
  params: next ? { id, next } : { id },
});

/** Opens the explainer over `under`, free, and goes on to the Pro page from its button. */
async function toProPage(under: unknown[], id: string, next?: string) {
  publishProStatus({ pro: false, ready: true });
  mockNav.reset([...under, explainer(id, next)]);
  await render(<Host />);
  await fireEvent.press(screen.getByLabelText('Get Skip Pro — $1.99/mo'));
  expect(paths().at(-1)).toBe('/pro');
  expect(mockNav.stack.at(-1)?.params).toEqual({ from: 'feature' });
}

const buyOnProPage = () =>
  act(async () => {
    fireEvent.press(screen.getByLabelText('Get Pro for $19.99/year'));
  });

beforeEach(() => {
  jest.clearAllMocks();
  resetProStatusForTests();
  mockSdkFirst = true;
  mockRestored = true;
  mockOfferArmed = false;
});
afterAll(() => resetProStatusForTests());

describe('buying on the Pro page', () => {
  it('lands in Voice, with the explainer gone from the stack', async () => {
    await toProPage(['/home'], 'voice', '/voice');
    await buyOnProPage();
    await waitFor(() => expect(paths()).toEqual(['/home', '/voice']));
    expect(screen.getByText('page /voice')).toBeTruthy();
  });

  it('lands there too when Apple’s answer reaches the app only after the page has stepped back', async () => {
    mockSdkFirst = false;
    await toProPage(['/home'], 'habits', '/habits');
    await buyOnProPage();
    // Back on the explainer, still free for a moment: it waits rather than guess.
    await waitFor(() => expect(paths()).toEqual(['/home', '/pro-feature']));

    await act(async () => publishProStatus({ pro: true, ready: true }));
    expect(paths()).toEqual(['/home', '/habits']);
  });

  it('returns to the page that asked mid-task when there is nothing to open', async () => {
    await toProPage(['/home', '/habit-new'], 'habits');
    await buyOnProPage();
    await waitFor(() => expect(paths()).toEqual(['/home', '/habit-new']));
  });

  it('leaves the explainer alone while the Pro page is on top, even once Pro', async () => {
    await toProPage(['/home'], 'voice', '/voice');
    // Pro arrives some other way (another phone's restore), with this page still open.
    await act(async () => publishProStatus({ pro: true, ready: true }));
    expect(paths()).toEqual(['/home', '/pro-feature', '/pro']);
    expect(screen.getByText('You have Skip Pro')).toBeTruthy();

    await fireEvent.press(top().getByLabelText('Go back'));
    expect(paths()).toEqual(['/home', '/voice']);
  });
});

describe('restoring on the Pro page', () => {
  it('from an explainer: back to it, and on into the feature', async () => {
    await toProPage(['/home'], 'insights', '/insights');
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Restore purchase'));
    });
    await waitFor(() => expect(paths()).toEqual(['/home', '/insights']));
    expect(mockRestore).toHaveBeenCalledTimes(1);
  });

  it('from an explainer, with nothing to restore: stays and says so', async () => {
    mockRestored = false;
    await toProPage(['/home'], 'insights', '/insights');
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Restore purchase'));
    });
    expect(await screen.findByText('No past purchase to restore.')).toBeTruthy();
    expect(paths()).toEqual(['/home', '/pro-feature', '/pro']);
  });

  it('from Settings: stays on the Pro page, which now says Pro, as it always has', async () => {
    publishProStatus({ pro: false, ready: true });
    mockNav.reset(['/settings', '/pro']);
    await render(<Host />);
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Restore purchase'));
    });
    expect(await screen.findByText('You have Skip Pro')).toBeTruthy();
    expect(paths()).toEqual(['/settings', '/pro']);
  });
});

describe('buying from Settings', () => {
  it('steps back to Settings, as it always has', async () => {
    publishProStatus({ pro: false, ready: true });
    mockNav.reset(['/settings', '/pro']);
    await render(<Host />);
    await buyOnProPage();
    await waitFor(() => expect(paths()).toEqual(['/settings']));
  });
});

describe('the one-time offer in the Pro page’s place', () => {
  async function toOffer() {
    mockOfferArmed = true;
    await toProPage(['/home'], 'voice', '/voice');
    await act(async () => {
      fireEvent.press(top().getByLabelText('Go back'));
    });
    await waitFor(() => expect(paths()).toEqual(['/home', '/pro-feature', '/pro-offer']));
  }

  it('buying it lands in the feature', async () => {
    await toOffer();
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Get Pro for $9.99/year'));
    });
    await waitFor(() => expect(paths()).toEqual(['/home', '/voice']));
  });

  it('restoring on it lands in the feature', async () => {
    await toOffer();
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Restore purchase'));
    });
    await waitFor(() => expect(paths()).toEqual(['/home', '/voice']));
  });

  it('closing it returns to the explainer, still free', async () => {
    await toOffer();
    await act(async () => {
      fireEvent.press(screen.getByLabelText('No thanks'));
    });
    expect(paths()).toEqual(['/home', '/pro-feature']);
    expect(screen.getByText('Just say it')).toBeTruthy();
  });
});

describe.each([
  ['habits', '/habit-new'],
  ['voice', '/voice-review'],
])('a %s page opened with Pro whose save is refused as free', (id, path) => {
  async function refused() {
    publishProStatus({ pro: true, ready: true });
    mockNav.reset(['/home', path]);
    await render(<Host />);
    await fireEvent.changeText(top().getByLabelText('Name'), 'Morning coffee');
    await act(async () => {
      fireEvent.press(top().getByLabelText('Save'));
    });
    // The page stays under the explainer, never swapped for it, with what was typed.
    expect(paths()).toEqual(['/home', path, '/pro-feature']);
    expect(screen.getByDisplayValue('Morning coffee')).toBeTruthy();
  }

  it('keeps what was typed, and buying Pro returns to it', async () => {
    await refused();
    await fireEvent.press(top().getByLabelText('Get Skip Pro — $1.99/mo'));
    await buyOnProPage();
    await waitFor(() => expect(paths()).toEqual(['/home', path]));
    expect(top().getByDisplayValue('Morning coffee')).toBeTruthy();
  });

  it('keeps what was typed when the person leaves the explainer without buying', async () => {
    await refused();
    await act(async () => {
      fireEvent.press(top().getByLabelText('Not now'));
    });
    expect(paths()).toEqual(['/home', path]);
    expect(top().getByDisplayValue('Morning coffee')).toBeTruthy();
  });

  it('still sends free to the explainer when free is the first answer it hears', async () => {
    publishProStatus({ pro: false, ready: true });
    mockNav.reset(['/home', path]);
    await render(<Host />);
    expect(paths()).toEqual(['/home', '/pro-feature']);
    expect(mockNav.stack.at(-1)?.params).toEqual({ id, next: path });
  });
});
