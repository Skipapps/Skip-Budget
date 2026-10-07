import { act, fireEvent, render } from '@testing-library/react-native';
import { View } from 'react-native';

import { BrandField } from '@/components/brands/brand-field';
import { BrandLogo } from '@/components/brands/brand-logo';
import { ChoiceRow, LogoOption, LookingLine, MatchHeader } from '@/components/brands/logo-choices';
import { resetLocaleForTests } from '@/i18n/store';

/** Store names, websites and the logo choices at large text sizes: every line wraps, none is cut. */

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('@/lib/haptics', () => ({ tap: jest.fn(), selection: jest.fn() }));
jest.mock('@/providers/theme-provider', () => ({
  useColors: () => ({ ink: '#000000', muted: '#777777', accentInk: '#905479' }),
}));
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('expo-image', () => {
  const { View: Stub } = jest.requireActual('react-native');
  return { Image: (props: object) => <Stub testID="logo" {...props} /> };
});
jest.mock('@/lib/supabase', () => ({ supabase: {} }));
jest.mock('@/api/brands', () => ({
  ...jest.requireActual('@/api/brands'),
  useBrandSearch: () => ({
    data: [
      {
        id: 'b1',
        name: 'Planet Fitness Black Card Membership',
        domain: null,
        category_id: 'health',
      },
    ],
    isFetching: false,
  }),
}));
jest.mock('@/api/logos', () => ({
  ...jest.requireActual('@/api/logos'),
  useLogoMatch: () => ({ data: undefined, isLoading: false, isFetching: false }),
}));

beforeEach(() => resetLocaleForTests());

const wraps = (node: { props: Record<string, unknown> }, ceiling: number) => {
  expect(node.props.numberOfLines).toBeUndefined();
  expect(node.props.adjustsFontSizeToFit).toBeUndefined();
  expect(node.props.maxFontSizeMultiplier).toBe(ceiling);
};

describe('logo choices at large text sizes', () => {
  it('wraps a brand name and lets a long website break rather than be cut', async () => {
    const screen = await render(
      <View>
        <LogoOption
          name="Planet Fitness Black Card"
          domain="planetfitness-black-card-membership.com"
          onPress={() => {}}
        />
        <MatchHeader name="Planet Fitness" domain="planetfitness-black-card-membership.com" />
        <ChoiceRow label="No logo, use letters" onPress={() => {}} />
      </View>,
    );

    wraps(screen.getByText('Planet Fitness Black Card'), 1.4);
    for (const domain of screen.getAllByText('planetfitness-black-card-membership.com')) {
      wraps(domain, 1.4);
    }
    wraps(screen.getByText('No logo, use letters'), 1.4);
  });

  it('wraps the waiting line beside its spinner', async () => {
    const screen = await render(<LookingLine label="Looking for this store’s logo…" />);
    const line = screen.getByText('Looking for this store’s logo…');
    wraps(line, 1.6);
    expect(String(line.props.className)).toContain('flex-1');
  });
});

describe('BrandField at large text sizes', () => {
  it('wraps the chosen store’s name', async () => {
    const screen = await render(
      <BrandField
        label="Store"
        value={{
          brandId: null,
          name: 'Planet Fitness Black Card Membership',
          domain: null,
          categoryId: 'health',
        }}
        onChange={() => {}}
        suggestLogos={false}
      />,
    );
    wraps(screen.getByText('Planet Fitness Black Card Membership'), 1.4);
  });

  it('wraps every search result and the row that adds a new store', async () => {
    jest.useFakeTimers();
    const screen = await render(<BrandField label="Store" value={null} onChange={() => {}} />);
    const input = screen.getByPlaceholderText('Search for a store');
    expect(input.props.maxFontSizeMultiplier).toBe(1.4);
    await fireEvent(input, 'focus');
    await fireEvent.changeText(input, 'Planet Fitness Black');
    await act(async () => {
      jest.advanceTimersByTime(300);
    });
    jest.useRealTimers();

    wraps(screen.getByText('Planet Fitness Black Card Membership'), 1.4);
    wraps(screen.getByText('Add “Planet Fitness Black”'), 1.4);
  });
});

describe('BrandLogo letters', () => {
  it('keep the circle’s size, as the logo image they stand in for would', async () => {
    const screen = await render(<BrandLogo name="Trader Joe's" domain={null} size={40} />);
    const letters = screen.getByText('TJ');
    expect(letters.props.allowFontScaling).toBe(false);
    expect(letters.props.maxFontSizeMultiplier).toBeUndefined();
  });
});
