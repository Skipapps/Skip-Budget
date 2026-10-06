import { act, fireEvent, render } from '@testing-library/react-native';
import { useState } from 'react';
import { View } from 'react-native';

import type { LogoMatch } from '@/api/logos';
import { BrandField, type BrandSelection } from '@/components/brands/brand-field';
import { FAILURE_MESSAGE } from '@/lib/failure';

/**
 * The add-store check inside the store field. A store the catalog does not know shows the logo
 * the service thinks it is, and the person answers: yes, another one, the website, or letters.
 * Nothing is chosen until they answer, and an unsure or failed lookup shows only a quiet link.
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
  mockAnswers = {
    'planet fitness': settled(PLANET),
    'planetfitness.com': settled(PLANET),
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
