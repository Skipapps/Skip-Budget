import { act, fireEvent, render } from '@testing-library/react-native';
import { useState } from 'react';
import { View } from 'react-native';

import type { KnownStore } from '@/api/known-stores';
import type { LogoMatch } from '@/api/logos';
import { BrandField, type BrandSelection } from '@/components/brands/brand-field';
import { FAILURE_MESSAGE } from '@/lib/failure';
import { publishProStatus, resetProStatusForTests } from '@/lib/pro-status';

/**
 * The add-store check inside the store field. A store the catalog does not know shows the logo
 * the service thinks it is, and the person answers: yes, another one, the website, or letters.
 * Nothing is chosen until they answer, and an unsure or failed lookup shows only a quiet link.
 *
 * Two exceptions, so nobody is asked what we already know: a store the service finds by its exact
 * name or website (our own logo list) is simply given its logo, and a store this person added and
 * answered before is offered first, with the answer they gave.
 */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('@/lib/haptics', () => ({ tap: jest.fn(), selection: jest.fn() }));
jest.mock('@/providers/theme-provider', () => ({
  useColors: () => ({ ink: '#000000', muted: '#777777', accentInk: '#905479' }),
}));

// Every logo on screen is a stub named after the website it would load, or "none" for letters.
jest.mock('@/components/brands/brand-logo', () => {
  const { View: Stub } = jest.requireActual('react-native');
  return {
    BrandLogo: ({ domain }: { domain?: string | null }) => (
      <Stub testID={`logo:${domain ?? 'none'}`} />
    ),
  };
});

jest.mock('@/lib/supabase', () => ({ supabase: {} }));
const mockCatalog = [
  { id: 'b-wm', name: 'Walmart', domain: 'walmart.com', category_id: 'groceries', logo_path: null },
];
jest.mock('@/api/brands', () => ({
  ...jest.requireActual('@/api/brands'),
  useBrandSearch: (query: string) => ({
    data: query.toLowerCase().startsWith('wal') ? mockCatalog : [],
    isFetching: false,
  }),
}));

// The stores this person added before, and the answers written down for new ones. The real
// matching and spelling rules stay; only the phone's storage is replaced.
let mockKnown: KnownStore[] = [];
const mockRemember = jest.fn(async (_store: KnownStore) => {});
jest.mock('@/api/known-stores', () => ({
  ...jest.requireActual('@/api/known-stores'),
  useKnownStores: () => mockKnown,
  useRememberStore: () => mockRemember,
}));

const match = (over: Partial<LogoMatch>): LogoMatch => ({
  matched: true,
  name: null,
  domain: null,
  confidence: 0.9,
  margin: 0.3,
  candidates: [],
  ...over,
});

const PLANET = match({
  name: 'Planet Fitness',
  domain: 'planetfitness.com',
  candidates: [
    { domain: 'planetfitness.com', name: 'Planet Fitness', confidence: 0.98 },
    { domain: 'planet.com', name: 'Planet Labs', confidence: 0.6 },
    { domain: 'planethollywood.com', name: 'Planet Hollywood', confidence: 0.5 },
  ],
});

/** A store in our own logo list, found by its exact name with nothing else close. */
const VERCEL = match({
  kind: 'alias',
  name: 'Vercel',
  domain: 'vercel.com',
  confidence: 0.99,
  candidates: [{ domain: 'vercel.com', name: 'Vercel', confidence: 0.99 }],
});

type Lookup = { data: LogoMatch | null | undefined; isLoading: boolean; isFetching: boolean };
const settled = (data: LogoMatch | null): Lookup => ({ data, isLoading: false, isFetching: false });

let mockAnswers: Record<string, Lookup>;
const mockLogoMatch = jest.fn((query: string, _hints: object): Lookup => {
  if (query.trim().length < 2) return { data: undefined, isLoading: false, isFetching: false };
  return mockAnswers[query.toLowerCase()] ?? settled(match({ matched: false }));
});
jest.mock('@/api/logos', () => ({
  useLogoMatch: (query: string, hints: object) => mockLogoMatch(query, hints),
}));

const onValue = jest.fn();

function Harness(props: Partial<Parameters<typeof BrandField>[0]>) {
  const [value, setValue] = useState<BrandSelection | null>(props.value ?? null);
  return (
    <View>
      <BrandField
        label="Store"
        {...props}
        value={value}
        onChange={(next) => {
          setValue(next);
          onValue(next);
        }}
      />
    </View>
  );
}

type Screen = Awaited<ReturnType<typeof render>>;

/** Types a store and takes the "Add" row, as a person adding one the catalog lacks would. */
async function addStore(screen: Screen, name: string) {
  const input = screen.getByPlaceholderText('Search for a store');
  await fireEvent(input, 'focus');
  await fireEvent.changeText(input, name);
  await act(async () => {
    jest.advanceTimersByTime(300);
  });
  await fireEvent.press(screen.getByLabelText(`Add ${name} as a new store`));
}

const lastValue = () => onValue.mock.calls[onValue.mock.calls.length - 1][0] as BrandSelection;

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  mockKnown = [];
  mockAnswers = {
    'planet fitness': settled(PLANET),
    'planetfitness.com': settled(PLANET),
    vercel: settled(VERCEL),
  };
});

afterEach(() => {
  jest.useRealTimers();
});

describe('a store the catalog does not know', () => {
  it('shows what the service found, and chooses nothing until the person answers', async () => {
    const screen = await render(<Harness />);
    await addStore(screen, 'Planet Fitness');

    expect(screen.getByText('Looks like Planet Fitness')).toBeTruthy();
    expect(screen.getByText('planetfitness.com')).toBeTruthy();
    expect(screen.getByTestId('logo:planetfitness.com')).toBeTruthy();
    for (const label of [
      'Yes, that’s it',
      'Not this one',
      'Use the website instead',
      'No logo, use letters',
    ]) {
      expect(screen.getByLabelText(label)).toBeTruthy();
    }
    // The field itself still shows letters: the suggestion is not taken until it is confirmed.
    expect(lastValue()).toMatchObject({
      brandId: null,
      name: 'Planet Fitness',
      logoDomain: null,
      logoHidden: false,
    });
    // The name's own category guess goes with it, to tell same-named brands apart.
    expect(mockLogoMatch).toHaveBeenCalledWith('Planet Fitness', { category: 'fitness' });
  });

  it('“Yes, that’s it” keeps the logo it showed', async () => {
    const screen = await render(<Harness />);
    await addStore(screen, 'Planet Fitness');

    await fireEvent.press(screen.getByLabelText('Yes, that’s it'));

    expect(lastValue()).toMatchObject({ logoDomain: 'planetfitness.com', logoHidden: false });
    expect(screen.queryByText('Looks like Planet Fitness')).toBeNull();
    // The field now wears the logo, and the choice can be reopened.
    expect(screen.getAllByTestId('logo:planetfitness.com')).toHaveLength(1);
    await fireEvent.press(screen.getByLabelText('Change logo'));
    expect(screen.getByText('Looks like Planet Fitness')).toBeTruthy();
  });

  it('“Not this one” lists the other brands it could be, and picking one keeps its logo', async () => {
    const screen = await render(<Harness />);
    await addStore(screen, 'Planet Fitness');

    await fireEvent.press(screen.getByLabelText('Not this one'));

    expect(screen.getByText('Which one is it?')).toBeTruthy();
    // The brand just turned down is not offered again.
    expect(screen.queryByLabelText('Planet Fitness, planetfitness.com')).toBeNull();
    expect(screen.getByLabelText('Planet Hollywood, planethollywood.com')).toBeTruthy();

    await fireEvent.press(screen.getByLabelText('Planet Labs, planet.com'));

    expect(lastValue()).toMatchObject({ logoDomain: 'planet.com', logoHidden: false });
    expect(screen.getByTestId('logo:planet.com')).toBeTruthy();
  });

  it('“Not this one” with nothing else says so, and still offers the website and letters', async () => {
    mockAnswers['planet fitness'] = settled({ ...PLANET, candidates: [] });
    const screen = await render(<Harness />);
    await addStore(screen, 'Planet Fitness');

    await fireEvent.press(screen.getByLabelText('Not this one'));

    expect(screen.getByText('Nothing else came up.')).toBeTruthy();
    expect(screen.getByLabelText('Use the website instead')).toBeTruthy();
    expect(screen.getByLabelText('No logo, use letters')).toBeTruthy();
  });

  it('“Use the website instead” looks up exactly the site typed, on Find', async () => {
    const screen = await render(<Harness />);
    await addStore(screen, 'Planet Fitness');

    await fireEvent.press(screen.getByLabelText('Use the website instead'));
    const site = screen.getByPlaceholderText('example.com');
    await fireEvent.changeText(site, 'planetfitness.com');
    // Not looked up while typing.
    expect(mockLogoMatch).not.toHaveBeenCalledWith('planetfitness.com', expect.anything());

    await fireEvent.press(screen.getByLabelText('Find the logo for this website'));

    expect(mockLogoMatch).toHaveBeenCalledWith('planetfitness.com', { category: 'fitness' });
    await fireEvent.press(screen.getByLabelText('Planet Fitness, planetfitness.com'));
    expect(lastValue()).toMatchObject({ logoDomain: 'planetfitness.com', logoHidden: false });
  });

  it('says so when a website has no logo, and says the failure line when the lookup fails', async () => {
    mockAnswers['nologo.example'] = settled(match({ matched: false }));
    mockAnswers['offline.example'] = settled(null);
    const screen = await render(<Harness />);
    await addStore(screen, 'Planet Fitness');
    await fireEvent.press(screen.getByLabelText('Use the website instead'));
    const site = screen.getByPlaceholderText('example.com');

    await fireEvent.changeText(site, 'nologo.example');
    await fireEvent(site, 'submitEditing');
    expect(screen.getByText('No logo found for that website.')).toBeTruthy();

    await fireEvent.changeText(site, 'offline.example');
    await fireEvent(site, 'submitEditing');
    expect(screen.getByText(FAILURE_MESSAGE)).toBeTruthy();
    expect(lastValue()).toMatchObject({ logoDomain: null, logoHidden: false });
  });

  it('“No logo, use letters” turns the logo off', async () => {
    const screen = await render(<Harness />);
    await addStore(screen, 'Planet Fitness');

    await fireEvent.press(screen.getByLabelText('No logo, use letters'));

    expect(lastValue()).toMatchObject({ logoDomain: null, logoHidden: true });
    expect(screen.queryByText('Looks like Planet Fitness')).toBeNull();
    expect(screen.getByTestId('logo:none')).toBeTruthy();
  });

  it.each([
    ['unsure', settled(match({ matched: false, candidates: PLANET.candidates }))],
    ['unreachable', settled(null)],
  ])(
    'shows no card when the service is %s, only a quiet way to add the website',
    async (_, answer) => {
      mockAnswers['corner deli'] = answer;
      const screen = await render(<Harness />);
      await addStore(screen, 'Corner Deli');

      expect(screen.queryByText(/Looks like/)).toBeNull();
      expect(screen.queryByLabelText('Yes, that’s it')).toBeNull();
      expect(screen.getByTestId('logo:none')).toBeTruthy();

      await fireEvent.press(screen.getByLabelText('Add a website'));
      expect(screen.getByPlaceholderText('example.com')).toBeTruthy();
      expect(lastValue()).toMatchObject({ logoDomain: null, logoHidden: false });
    },
  );

  it('says it is looking while the answer is on its way', async () => {
    mockAnswers['planet fitness'] = { data: undefined, isLoading: true, isFetching: true };
    const screen = await render(<Harness />);
    await addStore(screen, 'Planet Fitness');

    expect(screen.getByText('Looking for a logo…')).toBeTruthy();
  });
});

describe('when the check does not run', () => {
  it('a catalog brand carries its own logo and clears any earlier choice', async () => {
    const screen = await render(<Harness />);
    const input = screen.getByPlaceholderText('Search for a store');
    await fireEvent(input, 'focus');
    await fireEvent.changeText(input, 'Walmart');
    await act(async () => {
      jest.advanceTimersByTime(300);
    });

    await fireEvent.press(screen.getByLabelText('Walmart'));

    expect(lastValue()).toMatchObject({
      brandId: 'b-wm',
      domain: 'walmart.com',
      logoDomain: null,
      logoHidden: false,
    });
    expect(screen.queryByText(/Looks like/)).toBeNull();
    expect(mockLogoMatch).not.toHaveBeenCalled();
  });

  it('is off where the choice could not be kept', async () => {
    const screen = await render(<Harness suggestLogos={false} />);
    await addStore(screen, 'Planet Fitness');

    expect(screen.queryByText(/Looks like/)).toBeNull();
    expect(screen.queryByLabelText('Add a website')).toBeNull();
    expect(mockLogoMatch).not.toHaveBeenCalled();
  });

  it('does not run on a store that arrived filled in, which offers Change logo instead', async () => {
    const onChangeLogo = jest.fn();
    const screen = await render(
      <Harness
        value={{
          brandId: null,
          name: 'Corner Deli',
          domain: 'cornerdeli.com',
          categoryId: 'other',
        }}
        onChangeLogo={onChangeLogo}
      />,
    );

    expect(screen.getByTestId('logo:cornerdeli.com')).toBeTruthy();
    expect(mockLogoMatch).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByLabelText('Change logo'));
    expect(onChangeLogo).toHaveBeenCalledTimes(1);
  });
});

describe('a bill’s company', () => {
  it('sends the bill’s own category, and offers the icon rather than letters', async () => {
    const screen = await render(
      <Harness label="Company" placeholder="Search for a store" category="energy" noLogo="icon" />,
    );
    await addStore(screen, 'Planet Fitness');

    expect(mockLogoMatch).toHaveBeenCalledWith('Planet Fitness', { category: 'energy' });
    expect(screen.getByLabelText('No logo, use the icon')).toBeTruthy();
    expect(screen.queryByLabelText('No logo, use letters')).toBeNull();
  });

  it('leaves the catch-all category out, since it tells the service nothing', async () => {
    const screen = await render(<Harness category="other" />);
    await addStore(screen, 'Planet Fitness');

    expect(mockLogoMatch).toHaveBeenCalledWith('Planet Fitness', {});
  });
});

describe('what is sent to the logo service', () => {
  it('sends a typed website as its bare host', async () => {
    const screen = await render(<Harness />);
    await addStore(screen, 'Planet Fitness');
    await fireEvent.press(screen.getByLabelText('Use the website instead'));

    await fireEvent.changeText(
      screen.getByPlaceholderText('example.com'),
      'https://www.PlanetFitness.com/gyms?x=1',
    );
    await fireEvent.press(screen.getByLabelText('Find the logo for this website'));

    expect(mockLogoMatch).toHaveBeenCalledWith('planetfitness.com', { category: 'fitness' });
    expect(screen.getByLabelText('Planet Fitness, planetfitness.com')).toBeTruthy();
  });

  it('sends nothing for what cannot be a website, and says no logo was found', async () => {
    const screen = await render(<Harness />);
    await addStore(screen, 'Planet Fitness');
    await fireEvent.press(screen.getByLabelText('Use the website instead'));
    mockLogoMatch.mockClear();

    await fireEvent.changeText(screen.getByPlaceholderText('example.com'), 'planet fitness');
    await fireEvent.press(screen.getByLabelText('Find the logo for this website'));

    expect(screen.getByText('No logo found for that website.')).toBeTruthy();
    // The only lookups left are the store's own name and the finder's empty one.
    const sent = mockLogoMatch.mock.calls
      .map(([query]) => query)
      .filter((query) => query && query !== 'Planet Fitness');
    expect(sent).toEqual([]);
  });

  it.each([
    ['mobile', { category: 'telecom' }],
    ['internet', { category: 'telecom' }],
    ['loans', { category: 'banking' }],
    ['housing', {}],
    ['water', {}],
  ])('sends a %s bill’s company with %p', async (category, hints) => {
    const screen = await render(<Harness category={category} noLogo="icon" />);
    await addStore(screen, 'Town Co');

    expect(mockLogoMatch).toHaveBeenCalledWith('Town Co', hints);
  });
});

/** The names of the buttons on screen, top to bottom. */
const buttonNames = (screen: Screen) =>
  screen.getAllByRole('button').map((button) => button.props.accessibilityLabel as string);

/** Types into the store box without taking any row, as someone looking for a store they added. */
async function searchFor(screen: Screen, text: string) {
  const input = screen.getByPlaceholderText('Search for a store');
  await fireEvent(input, 'focus');
  await fireEvent.changeText(input, text);
  await act(async () => {
    jest.advanceTimersByTime(300);
  });
}

describe('a store our own logo list knows', () => {
  it('is given its logo without a card or a question, and offers Change logo', async () => {
    const screen = await render(<Harness />);
    await addStore(screen, 'Vercel');

    expect(screen.queryByText(/Looks like/)).toBeNull();
    for (const label of ['Yes, that’s it', 'Not this one', 'Use the website instead']) {
      expect(screen.queryByLabelText(label)).toBeNull();
    }
    expect(screen.queryByText('Looking for a logo…')).toBeNull();
    expect(lastValue()).toMatchObject({
      brandId: null,
      name: 'Vercel',
      logoDomain: 'vercel.com',
      logoHidden: false,
    });
    expect(screen.getByTestId('logo:vercel.com')).toBeTruthy();
    expect(screen.getByLabelText('Change logo')).toBeTruthy();
  });

  it('is asked of the service with the store’s own name and category', async () => {
    const screen = await render(<Harness />);
    await addStore(screen, 'Vercel');

    expect(mockLogoMatch).toHaveBeenCalledWith('Vercel', {});
  });

  it('applies the logo once, whatever the parent re-renders with', async () => {
    const screen = await render(<Harness />);
    await addStore(screen, 'Vercel');

    await screen.rerender(<Harness />);
    await screen.rerender(<Harness />);
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });

    const applied = onValue.mock.calls.filter(([value]) => value.logoDomain === 'vercel.com');
    expect(applied).toHaveLength(1);
  });

  it('waits for the answer, saying it is looking, and applies it when it lands', async () => {
    mockAnswers.vercel = { data: undefined, isLoading: true, isFetching: true };
    const screen = await render(<Harness />);
    await addStore(screen, 'Vercel');
    expect(screen.getByText('Looking for a logo…')).toBeTruthy();
    expect(lastValue()).toMatchObject({ logoDomain: null });

    mockAnswers.vercel = settled(VERCEL);
    await screen.rerender(<Harness />);

    expect(screen.queryByText('Looking for a logo…')).toBeNull();
    expect(lastValue()).toMatchObject({ logoDomain: 'vercel.com', logoHidden: false });
    expect(screen.getByLabelText('Change logo')).toBeTruthy();
  });

  it('shows the card on Change logo, even for a sure match, and never applies it over the person', async () => {
    const screen = await render(<Harness />);
    await addStore(screen, 'Vercel');
    onValue.mockClear();

    await fireEvent.press(screen.getByLabelText('Change logo'));

    expect(screen.getByText('Looks like Vercel')).toBeTruthy();
    expect(screen.getByLabelText('Yes, that’s it')).toBeTruthy();
    expect(screen.getByLabelText('No logo, use letters')).toBeTruthy();
    // Nothing is written until they answer.
    expect(onValue).not.toHaveBeenCalled();
    await screen.rerender(<Harness />);
    expect(onValue).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByLabelText('No logo, use letters'));

    expect(lastValue()).toMatchObject({ logoDomain: null, logoHidden: true });
    expect(screen.getByTestId('logo:none')).toBeTruthy();
    expect(screen.getByLabelText('Change logo')).toBeTruthy();
    expect(screen.queryByTestId('logo:vercel.com')).toBeNull();
  });

  it('lets the person who changed it keep another logo from the card', async () => {
    const screen = await render(<Harness />);
    await addStore(screen, 'Vercel');

    await fireEvent.press(screen.getByLabelText('Change logo'));
    await fireEvent.press(screen.getByLabelText('Yes, that’s it'));

    expect(lastValue()).toMatchObject({ logoDomain: 'vercel.com', logoHidden: false });
    expect(screen.queryByText('Looks like Vercel')).toBeNull();
    expect(screen.getByLabelText('Change logo')).toBeTruthy();
  });

  it.each<[string, Partial<LogoMatch>]>([
    ['a close spelling', { kind: 'fuzzy', confidence: 0.99 }],
    ['a name it only half trusts', { kind: 'alias', confidence: 0.9 }],
    ['an answer that never said how it was found', { kind: undefined, confidence: 0.99 }],
    ['an answer that did not match', { matched: false }],
    [
      'two plausible brands',
      {
        candidates: [
          { domain: 'vercel.com', name: 'Vercel', confidence: 0.99 },
          { domain: 'versel.com', name: 'Versel', confidence: 0.85 },
        ],
      },
    ],
  ])('still asks for %s', async (_, over) => {
    mockAnswers.vercel = settled({ ...VERCEL, ...over });
    const screen = await render(<Harness />);
    await addStore(screen, 'Vercel');

    if (over.matched === false) {
      expect(screen.queryByText(/Looks like/)).toBeNull();
      expect(screen.getByLabelText('Add a website')).toBeTruthy();
    } else {
      expect(screen.getByText('Looks like Vercel')).toBeTruthy();
      expect(screen.getByLabelText('Yes, that’s it')).toBeTruthy();
    }
    // Nothing chosen until they answer.
    expect(lastValue()).toMatchObject({ logoDomain: null, logoHidden: false });
    expect(screen.getByTestId('logo:none')).toBeTruthy();
  });

  it('gives a store found by its website the logo too', async () => {
    mockAnswers.vercel = settled({ ...VERCEL, kind: 'domain', confidence: 1 });
    const screen = await render(<Harness />);
    await addStore(screen, 'Vercel');

    expect(lastValue()).toMatchObject({ logoDomain: 'vercel.com' });
    expect(screen.queryByText(/Looks like/)).toBeNull();
  });

  it('does not look anything up where the choice could not be kept', async () => {
    const screen = await render(<Harness suggestLogos={false} />);
    await addStore(screen, 'Vercel');

    expect(mockLogoMatch).not.toHaveBeenCalled();
    expect(lastValue()).toMatchObject({ logoDomain: null });
    expect(mockRemember).not.toHaveBeenCalled();
  });
});

describe('what is remembered for next time', () => {
  it('remembers a logo the person confirmed, with the store’s category', async () => {
    const screen = await render(<Harness />);
    await addStore(screen, 'Planet Fitness');
    expect(mockRemember).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByLabelText('Yes, that’s it'));

    expect(mockRemember).toHaveBeenCalledTimes(1);
    expect(mockRemember).toHaveBeenCalledWith({
      name: 'Planet Fitness',
      categoryId: 'fitness',
      logoDomain: 'planetfitness.com',
      logoHidden: false,
    });
  });

  it('remembers letters as the answer', async () => {
    const screen = await render(<Harness />);
    await addStore(screen, 'Planet Fitness');

    await fireEvent.press(screen.getByLabelText('No logo, use letters'));

    expect(mockRemember).toHaveBeenCalledTimes(1);
    expect(mockRemember).toHaveBeenCalledWith({
      name: 'Planet Fitness',
      categoryId: 'fitness',
      logoDomain: null,
      logoHidden: true,
    });
  });

  it('remembers the other brand the person picked', async () => {
    const screen = await render(<Harness />);
    await addStore(screen, 'Planet Fitness');
    await fireEvent.press(screen.getByLabelText('Not this one'));
    expect(mockRemember).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByLabelText('Planet Labs, planet.com'));

    expect(mockRemember).toHaveBeenCalledTimes(1);
    expect(mockRemember).toHaveBeenCalledWith({
      name: 'Planet Fitness',
      categoryId: 'fitness',
      logoDomain: 'planet.com',
      logoHidden: false,
    });
  });

  it('remembers the website the person gave', async () => {
    const screen = await render(<Harness />);
    await addStore(screen, 'Planet Fitness');
    await fireEvent.press(screen.getByLabelText('Use the website instead'));
    await fireEvent.changeText(screen.getByPlaceholderText('example.com'), 'planetfitness.com');
    await fireEvent.press(screen.getByLabelText('Find the logo for this website'));
    expect(mockRemember).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByLabelText('Planet Fitness, planetfitness.com'));

    expect(mockRemember).toHaveBeenCalledTimes(1);
    expect(mockRemember).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Planet Fitness', logoDomain: 'planetfitness.com' }),
    );
  });

  it('remembers the logo given without a question, once', async () => {
    const screen = await render(<Harness />);
    await addStore(screen, 'Vercel');
    await screen.rerender(<Harness />);

    expect(mockRemember).toHaveBeenCalledTimes(1);
    expect(mockRemember).toHaveBeenCalledWith({
      name: 'Vercel',
      categoryId: 'other',
      logoDomain: 'vercel.com',
      logoHidden: false,
    });
  });

  it('remembers the new answer when the person changes it', async () => {
    const screen = await render(<Harness />);
    await addStore(screen, 'Vercel');
    mockRemember.mockClear();

    await fireEvent.press(screen.getByLabelText('Change logo'));
    await fireEvent.press(screen.getByLabelText('No logo, use letters'));

    expect(mockRemember).toHaveBeenCalledTimes(1);
    expect(mockRemember).toHaveBeenCalledWith({
      name: 'Vercel',
      categoryId: 'other',
      logoDomain: null,
      logoHidden: true,
    });
  });

  it('remembers nothing until there is an answer', async () => {
    const screen = await render(<Harness />);
    await addStore(screen, 'Corner Deli');
    expect(mockRemember).not.toHaveBeenCalled();

    // The service was unsure and the person has not given a website: no answer, nothing written.
    await fireEvent.press(screen.getByLabelText('Add a website'));
    expect(mockRemember).not.toHaveBeenCalled();
  });

  it('remembers nothing for a store the catalog already has', async () => {
    const screen = await render(<Harness />);
    await searchFor(screen, 'Walmart');

    await fireEvent.press(screen.getByLabelText('Walmart'));

    expect(mockRemember).not.toHaveBeenCalled();
  });

  it('remembers nothing for a store that arrived filled in, or when it is cleared', async () => {
    const screen = await render(
      <Harness
        value={{
          brandId: null,
          name: 'Corner Deli',
          domain: 'cornerdeli.com',
          categoryId: 'dining',
        }}
      />,
    );

    await fireEvent.press(screen.getByLabelText('Change store, currently Corner Deli'));

    expect(mockRemember).not.toHaveBeenCalled();
  });

  it('uses the bill’s own category for a company', async () => {
    const screen = await render(<Harness category="energy" noLogo="icon" />);
    await addStore(screen, 'Planet Fitness');

    await fireEvent.press(screen.getByLabelText('Yes, that’s it'));

    expect(mockRemember).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Planet Fitness', logoDomain: 'planetfitness.com' }),
    );
  });
});

describe('stores this person added before', () => {
  const VERCEL_KNOWN: KnownStore = {
    name: 'Vercel',
    categoryId: 'software',
    logoDomain: 'vercel.com',
    logoHidden: false,
  };
  const LETTERS_KNOWN: KnownStore = {
    name: 'Verde Cafe',
    categoryId: 'dining',
    logoDomain: null,
    logoHidden: true,
  };
  const WALMART_FUEL: KnownStore = {
    name: 'Walmart Fuel',
    categoryId: 'fuel',
    logoDomain: 'walmartfuel.com',
    logoHidden: false,
  };

  it('are listed while searching, with their logo, and nothing is shown for a short search', async () => {
    mockKnown = [VERCEL_KNOWN, LETTERS_KNOWN];
    const screen = await render(<Harness />);

    await searchFor(screen, 'v');
    expect(screen.queryByLabelText('Vercel')).toBeNull();

    await searchFor(screen, 'ver');
    expect(screen.getByLabelText('Vercel')).toBeTruthy();
    expect(screen.getByLabelText('Verde Cafe')).toBeTruthy();
    expect(screen.getByTestId('logo:vercel.com')).toBeTruthy();
    // Letters, where the answer was letters.
    expect(screen.getByTestId('logo:none')).toBeTruthy();
  });

  it('come before the catalog’s rows and before the add row', async () => {
    mockKnown = [WALMART_FUEL];
    const screen = await render(<Harness />);

    await searchFor(screen, 'wal');

    expect(buttonNames(screen)).toEqual(['Walmart Fuel', 'Walmart', 'Add wal as a new store']);
  });

  it('are listed three at most, those starting with the search first', async () => {
    mockKnown = [
      { ...VERCEL_KNOWN, name: 'The Shop A' },
      { ...VERCEL_KNOWN, name: 'Shop B' },
      { ...VERCEL_KNOWN, name: 'Shop C' },
      { ...VERCEL_KNOWN, name: 'Shop D' },
      { ...VERCEL_KNOWN, name: 'Shop E' },
    ];
    const screen = await render(<Harness />);

    await searchFor(screen, 'shop');

    expect(buttonNames(screen).slice(0, 3)).toEqual(['Shop B', 'Shop C', 'Shop D']);
    expect(screen.queryByLabelText('The Shop A')).toBeNull();
    expect(screen.queryByLabelText('Shop E')).toBeNull();
  });

  it('picked, give the store back with its logo and ask nothing', async () => {
    mockKnown = [VERCEL_KNOWN];
    const screen = await render(<Harness />);
    await searchFor(screen, 'ver');

    await fireEvent.press(screen.getByLabelText('Vercel'));

    expect(lastValue()).toEqual({
      brandId: null,
      name: 'Vercel',
      domain: null,
      categoryId: 'software',
      logoDomain: 'vercel.com',
      logoHidden: false,
    });
    expect(screen.getByLabelText('Change store, currently Vercel')).toBeTruthy();
    expect(screen.getByTestId('logo:vercel.com')).toBeTruthy();
    expect(screen.queryByText(/Looks like/)).toBeNull();
    expect(screen.queryByLabelText('Yes, that’s it')).toBeNull();
    expect(screen.queryByText('Looking for a logo…')).toBeNull();
    // It opens straight on Change logo, and the service is not asked about it.
    expect(screen.getByLabelText('Change logo')).toBeTruthy();
    expect(mockLogoMatch).not.toHaveBeenCalledWith('Vercel', expect.anything());
    // Choosing it is not a new answer: nothing is written.
    expect(mockRemember).not.toHaveBeenCalled();
    expect(onValue).toHaveBeenCalledTimes(1);
  });

  it('picked with the answer of letters, keep letters', async () => {
    mockKnown = [LETTERS_KNOWN];
    const screen = await render(<Harness />);
    await searchFor(screen, 'verde');

    await fireEvent.press(screen.getByLabelText('Verde Cafe'));

    expect(lastValue()).toMatchObject({
      name: 'Verde Cafe',
      categoryId: 'dining',
      logoDomain: null,
      logoHidden: true,
    });
    expect(screen.getByTestId('logo:none')).toBeTruthy();
    expect(screen.getByLabelText('Change logo')).toBeTruthy();
    expect(screen.queryByText(/Looks like/)).toBeNull();
  });

  it('picked, can still have their logo changed, which asks the service then', async () => {
    mockKnown = [{ ...VERCEL_KNOWN, name: 'Planet Fitness', logoDomain: 'old.example' }];
    const screen = await render(<Harness />);
    await searchFor(screen, 'planet');
    await fireEvent.press(screen.getByLabelText('Planet Fitness'));
    expect(mockLogoMatch).not.toHaveBeenCalledWith('Planet Fitness', expect.anything());

    await fireEvent.press(screen.getByLabelText('Change logo'));

    expect(screen.getByText('Looks like Planet Fitness')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Yes, that’s it'));
    expect(lastValue()).toMatchObject({ logoDomain: 'planetfitness.com' });
    expect(mockRemember).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Planet Fitness', logoDomain: 'planetfitness.com' }),
    );
  });

  it('are not shown twice when the catalog lists the same name', async () => {
    // Spelled differently from the catalog's, but the same store.
    mockKnown = [
      { ...WALMART_FUEL, name: '  WALMART  ', logoDomain: 'other.example' },
      WALMART_FUEL,
    ];
    const screen = await render(<Harness />);

    await searchFor(screen, 'wal');

    expect(screen.getAllByLabelText('Walmart')).toHaveLength(1);
    expect(screen.queryByLabelText('  WALMART  ')).toBeNull();
    // The one row that stays is the catalog's, and picking it files the brand.
    expect(buttonNames(screen)).toEqual(['Walmart Fuel', 'Walmart', 'Add wal as a new store']);
    await fireEvent.press(screen.getByLabelText('Walmart'));
    expect(lastValue()).toMatchObject({ brandId: 'b-wm', domain: 'walmart.com' });
  });

  it('take the place of the add row for exactly their name', async () => {
    mockKnown = [VERCEL_KNOWN];
    const screen = await render(<Harness />);

    await searchFor(screen, 'ver');
    expect(screen.getByLabelText('Add ver as a new store')).toBeTruthy();

    await searchFor(screen, 'Vercel');
    expect(screen.getByLabelText('Vercel')).toBeTruthy();
    expect(screen.queryByLabelText('Add Vercel as a new store')).toBeNull();

    await searchFor(screen, '  vercel ');
    expect(screen.queryByLabelText('Add vercel as a new store')).toBeNull();
  });

  it('leave the add row when the name is only part of theirs', async () => {
    mockKnown = [VERCEL_KNOWN];
    const screen = await render(<Harness />);

    await searchFor(screen, 'Vercel Pro');

    expect(screen.queryByLabelText('Vercel')).toBeNull();
    expect(screen.getByLabelText('Add Vercel Pro as a new store')).toBeTruthy();
  });

  it('are not offered where the choice could not be kept', async () => {
    mockKnown = [VERCEL_KNOWN];
    const screen = await render(<Harness suggestLogos={false} />);

    await searchFor(screen, 'vercel');

    expect(screen.queryByLabelText('Vercel')).toBeNull();
    expect(screen.getByLabelText('Add vercel as a new store')).toBeTruthy();
  });

  it('are gone from the list once a store is chosen', async () => {
    mockKnown = [VERCEL_KNOWN];
    const screen = await render(<Harness />);
    await searchFor(screen, 'ver');
    await fireEvent.press(screen.getByLabelText('Vercel'));

    await fireEvent.press(screen.getByLabelText('Change store, currently Vercel'));

    expect(screen.getByPlaceholderText('Search for a store')).toBeTruthy();
    expect(screen.queryByLabelText('Vercel')).toBeNull();
  });

  it('use the labels a company or a service gives the row', async () => {
    mockKnown = [VERCEL_KNOWN];
    const screen = await render(
      <Harness
        label="Company"
        changeLabel={(name) => `Change company, currently ${name}`}
        addLabel={(name) => `Add ${name} as a new company`}
      />,
    );

    await searchFor(screen, 'verc');
    expect(screen.getByLabelText('Add verc as a new company')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Vercel'));

    expect(screen.getByLabelText('Change company, currently Vercel')).toBeTruthy();
  });
});

describe('on the free plan, where logos are Pro', () => {
  beforeEach(async () => {
    await act(async () => publishProStatus({ pro: false, ready: true }));
  });
  afterEach(() => resetProStatusForTests());

  it('asks nothing, shows no Change logo, and costs the service no lookup', async () => {
    const screen = await render(<Harness />);
    await addStore(screen, 'Planet Fitness');

    expect(screen.queryByText('Looks like Planet Fitness')).toBeNull();
    expect(screen.queryByLabelText('Change logo')).toBeNull();
    expect(screen.queryByLabelText('Add a website')).toBeNull();
    expect(mockLogoMatch.mock.calls.every(([query]) => query === '')).toBe(true);
    expect(lastValue()).toMatchObject({ name: 'Planet Fitness', logoDomain: null });
  });

  it('still remembers the store, with no logo chosen, to list it first next time', async () => {
    const screen = await render(<Harness />);
    await addStore(screen, 'Planet Fitness');

    expect(mockRemember).toHaveBeenCalledWith({
      name: 'Planet Fitness',
      categoryId: 'fitness',
      logoDomain: null,
      logoHidden: false,
    });
  });

  it('offers no Change logo on a saved store', async () => {
    const screen = await render(
      <Harness
        value={{ brandId: null, name: 'Planet Fitness', domain: null, categoryId: 'fitness' }}
        onChangeLogo={jest.fn()}
      />,
    );
    expect(screen.queryByLabelText('Change logo')).toBeNull();
  });

  it('does not apply even a sure match', async () => {
    const screen = await render(<Harness />);
    await addStore(screen, 'Vercel');

    // On Pro the same store would be given its logo at once; on free it keeps its initials.

    expect(lastValue()).toMatchObject({ name: 'Vercel', logoDomain: null, logoHidden: false });
    expect(screen.queryByLabelText('Change logo')).toBeNull();
  });
});
