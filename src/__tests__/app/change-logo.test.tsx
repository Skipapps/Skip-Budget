import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';

import type { LogoMatch } from '@/api/logos';
import ChangeLogoScreen from '@/app/change-logo';
import { success, warn } from '@/lib/haptics';
import { FAILURE_MESSAGE } from '@/lib/failure';

/**
 * Change logo: one receipt, subscription or bill, the logo it shows now, the add-store check's
 * choices, and Report. A choice is saved on that row alone, with Save; a report changes nothing
 * on the row and is thanked in place.
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
jest.mock('@/components/ui/skeleton', () => {
  const { Text } = jest.requireActual('react-native');
  return { SkeletonList: () => <Text>loading</Text> };
});

// Marks and logos are stubs named after what they would draw.
jest.mock('@/components/brands/brand-logo', () => {
  const { View } = jest.requireActual('react-native');
  return {
    BrandLogo: ({ domain }: { domain?: string | null }) => (
      <View testID={`logo:${domain ?? 'none'}`} />
    ),
  };
});
jest.mock('@/components/brands/brand-mark', () => {
  const { View } = jest.requireActual('react-native');
  const { matchBrand } = jest.requireActual('@/api/brands');
  return {
    // The same rule as the real mark: its own website, else a catalog name match, unless hidden.
    BrandMark: ({
      name,
      domain,
      hidden,
    }: {
      name: string;
      domain?: string | null;
      hidden?: boolean;
    }) => {
      const shown = hidden ? null : (domain ?? matchBrand(name, mockDirectory)?.domain ?? null);
      return <View testID={`mark:${shown ?? 'letters'}`} />;
    },
  };
});
jest.mock('@/components/bills/bill-mark', () => {
  const { View } = jest.requireActual('react-native');
  return {
    BillMark: ({ domain }: { domain?: string | null }) => (
      <View testID={`bill-mark:${domain ?? 'icon'}`} />
    ),
  };
});

let mockParams: Record<string, string | undefined> = {};
jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: jest.fn(), replace: jest.fn(), canGoBack: () => true },
  useLocalSearchParams: () => mockParams,
}));

jest.mock('@/lib/supabase', () => ({ supabase: {} }));
const mockDirectory = [
  { id: 'b-tg', name: 'Target', domain: 'target.com', category_id: 'shopping', logo_path: null },
];
jest.mock('@/api/brands', () => ({
  ...jest.requireActual('@/api/brands'),
  useBrandDirectory: () => ({ data: mockDirectory }),
}));

type Read = { data: unknown; isError: boolean; isFetched: boolean; refetch: jest.Mock };
const idle = (): Read => ({
  data: undefined,
  isError: false,
  isFetched: false,
  refetch: jest.fn(),
});
let mockRead: Read;
jest.mock('@/api/queries', () => ({
  useReceipt: (id?: string) => (id && mockParams.kind === 'receipt' ? mockRead : idle()),
  useSubscription: (id?: string) => (id && mockParams.kind === 'subscription' ? mockRead : idle()),
  useBill: (id?: string) => (id && mockParams.kind === 'bill' ? mockRead : idle()),
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
    { domain: 'calmradio.com', name: 'Calm Radio', confidence: 0.4 },
  ],
};
const NOT_SURE: LogoMatch = { ...CALM, matched: false, name: null, domain: null };

let mockAnswers: Record<string, LogoMatch | null>;
const mockLogoMatch = jest.fn((query: string, _hints: object) => {
  const needle = query.trim().toLowerCase();
  if (needle.length < 2) return { data: undefined, isLoading: false, isFetching: false };
  return { data: mockAnswers[needle] ?? NOT_SURE, isLoading: false, isFetching: false };
});
const mockReport = jest.fn();
jest.mock('@/api/logos', () => ({
  useLogoMatch: (query: string, hints: object) => mockLogoMatch(query, hints),
  reportWrongLogo: (input: object) => mockReport(input),
}));

/** A subscription the catalog filed under the wrong brand: Calm the app, drawn as Calm Air. */
const SUBSCRIPTION = {
  id: 's1',
  name: 'Calm',
  category_id: 'fitness',
  brand_id: 'b-calmair',
  logo_domain: null,
  logo_hidden: false,
  brands: { domain: 'calmair.com' },
};

const opening = (kind: string, row: unknown, id = 's1') => {
  mockParams = { kind, id, name: 'from the link' };
  mockRead = { data: row, isError: false, isFetched: true, refetch: jest.fn() };
};

type Screen = Awaited<ReturnType<typeof render>>;
const press = (screen: Screen, label: string) => fireEvent.press(screen.getByLabelText(label));
const saveButton = (screen: Screen) => screen.getByLabelText('Save logo');

beforeEach(() => {
  jest.clearAllMocks();
  mockAnswers = { calm: CALM, 'calm.com': CALM };
  mockSetLogo.mockResolvedValue(undefined);
  mockReport.mockResolvedValue(true);
  opening('subscription', SUBSCRIPTION);
});

describe('what the page shows', () => {
  it('shows the logo the row has now, then the same choices as the add-store check', async () => {
    const screen = await render(<ChangeLogoScreen />);

    expect(screen.getByText('Change logo')).toBeTruthy();
    expect(screen.getByTestId('mark:calmair.com')).toBeTruthy();
    expect(screen.getByText('calmair.com')).toBeTruthy();
    expect(screen.getByText('Looks like Calm')).toBeTruthy();
    for (const label of [
      'Yes, that’s it',
      'Not this one',
      'Use the website instead',
      'No logo, use letters',
      'Report this logo',
    ]) {
      expect(screen.getByLabelText(label)).toBeTruthy();
    }
    // Looked up by the row's own name and category, not the link's.
    expect(mockLogoMatch).toHaveBeenCalledWith('Calm', { category: 'fitness' });
    expect(saveButton(screen)).toBeDisabled();
  });

  it('offers no card when the service is unsure, but keeps the website and letters', async () => {
    mockAnswers = {};
    const screen = await render(<ChangeLogoScreen />);

    expect(screen.queryByText(/Looks like/)).toBeNull();
    expect(screen.queryByLabelText('Yes, that’s it')).toBeNull();
    expect(screen.getByLabelText('Use the website instead')).toBeTruthy();
    expect(screen.getByLabelText('No logo, use letters')).toBeTruthy();
  });

  it('shows a row that chose letters with letters ticked, and nothing to report', async () => {
    opening('subscription', { ...SUBSCRIPTION, logo_hidden: true });
    const screen = await render(<ChangeLogoScreen />);

    expect(screen.getByTestId('mark:letters')).toBeTruthy();
    expect(screen.getByText('No logo')).toBeTruthy();
    expect(screen.getByLabelText('No logo, use letters')).toBeChecked();
    expect(screen.queryByLabelText('Report this logo')).toBeNull();
  });

  it('reads a receipt with no logo of its own as the brand its name matches, as lists draw it', async () => {
    opening(
      'receipt',
      {
        id: 'r1',
        merchant: 'TARGET T-1234',
        category_id: 'shopping',
        brand_id: null,
        brands: null,
      },
      'r1',
    );
    const screen = await render(<ChangeLogoScreen />);

    expect(screen.getByTestId('mark:target.com')).toBeTruthy();
    await press(screen, 'Report this logo');
    expect(mockReport).toHaveBeenCalledWith({ domain: 'target.com', query: 'TARGET T-1234' });
  });

  it('offers a bill its icon, not letters', async () => {
    opening(
      'bill',
      {
        id: 'b1',
        name: 'Power',
        category_id: 'energy',
        icon_id: null,
        brand_id: null,
        brands: null,
      },
      'b1',
    );
    const screen = await render(<ChangeLogoScreen />);

    expect(screen.getByTestId('bill-mark:icon')).toBeTruthy();
    expect(screen.getByLabelText('No logo, use the icon')).toBeTruthy();
    expect(screen.queryByLabelText('No logo, use letters')).toBeNull();
    // A bill with no logo has nothing to report.
    expect(screen.queryByLabelText('Report this logo')).toBeNull();
  });
});

describe('saving a choice on this row', () => {
  it('“Yes, that’s it” then Save keeps the logo the service found, and goes back', async () => {
    const screen = await render(<ChangeLogoScreen />);

    await press(screen, 'Yes, that’s it');
    expect(screen.getByTestId('mark:calm.com')).toBeTruthy();
    expect(screen.getByLabelText('Yes, that’s it')).toBeChecked();
    await press(screen, 'Save logo');

    await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));
    expect(mockSetLogo).toHaveBeenCalledTimes(1);
    expect(mockSetLogo).toHaveBeenCalledWith({
      kind: 'subscription',
      id: 's1',
      logo_domain: 'calm.com',
      logo_hidden: false,
    });
    expect(success).toHaveBeenCalled();
  });

  it('“Not this one” lists the others; picking one saves its website', async () => {
    const screen = await render(<ChangeLogoScreen />);

    await press(screen, 'Not this one');
    expect(screen.queryByLabelText('Calm, calm.com')).toBeNull();
    await press(screen, 'Calm Radio, calmradio.com');
    expect(screen.getByLabelText('Calm Radio, calmradio.com')).toBeChecked();
    await press(screen, 'Save logo');

    await waitFor(() => expect(mockSetLogo).toHaveBeenCalledTimes(1));
    expect(mockSetLogo).toHaveBeenCalledWith({
      kind: 'subscription',
      id: 's1',
      logo_domain: 'calmradio.com',
      logo_hidden: false,
    });
  });

  it('“Use the website instead” saves the website the person typed', async () => {
    const screen = await render(<ChangeLogoScreen />);

    await press(screen, 'Use the website instead');
    await fireEvent.changeText(screen.getByPlaceholderText('example.com'), 'calm.com');
    await press(screen, 'Find the logo for this website');
    expect(mockLogoMatch).toHaveBeenCalledWith('calm.com', { category: 'fitness' });
    await press(screen, 'Calm, calm.com');
    await press(screen, 'Save logo');

    await waitFor(() => expect(mockSetLogo).toHaveBeenCalledTimes(1));
    expect(mockSetLogo.mock.calls[0][0]).toMatchObject({
      logo_domain: 'calm.com',
      logo_hidden: false,
    });
  });

  it('“No logo, use letters” saves letters and no website', async () => {
    const screen = await render(<ChangeLogoScreen />);

    await press(screen, 'No logo, use letters');
    expect(screen.getByTestId('mark:letters')).toBeTruthy();
    await press(screen, 'Save logo');

    await waitFor(() => expect(mockSetLogo).toHaveBeenCalledTimes(1));
    expect(mockSetLogo).toHaveBeenCalledWith({
      kind: 'subscription',
      id: 's1',
      logo_domain: null,
      logo_hidden: true,
    });
  });

  it('saves a bill under its own kind, with the icon as its "no logo"', async () => {
    opening(
      'bill',
      {
        id: 'b1',
        name: 'AEP',
        category_id: 'energy',
        icon_id: null,
        brand_id: 'b-aep',
        brands: { domain: 'aep.com' },
      },
      'b1',
    );
    const screen = await render(<ChangeLogoScreen />);

    expect(screen.getByTestId('bill-mark:aep.com')).toBeTruthy();
    await press(screen, 'No logo, use the icon');
    expect(screen.getByTestId('bill-mark:icon')).toBeTruthy();
    await press(screen, 'Save logo');

    await waitFor(() => expect(mockSetLogo).toHaveBeenCalledTimes(1));
    expect(mockSetLogo).toHaveBeenCalledWith({
      kind: 'bill',
      id: 'b1',
      logo_domain: null,
      logo_hidden: true,
    });
  });

  it('keeps Save off for a choice that is what the row has already', async () => {
    opening('subscription', { ...SUBSCRIPTION, logo_domain: 'calm.com' });
    const screen = await render(<ChangeLogoScreen />);

    expect(screen.getByLabelText('Yes, that’s it')).toBeChecked();
    await press(screen, 'Yes, that’s it');
    expect(saveButton(screen)).toBeDisabled();
    await press(screen, 'Save logo');
    expect(mockSetLogo).not.toHaveBeenCalled();
  });

  it('says the one failure line when the save fails, and stays', async () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    mockSetLogo.mockRejectedValue(new Error('offline'));
    const screen = await render(<ChangeLogoScreen />);

    await press(screen, 'No logo, use letters');
    await press(screen, 'Save logo');

    await waitFor(() => expect(screen.getByText(FAILURE_MESSAGE)).toBeTruthy());
    expect(router.back).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalled();
    log.mockRestore();
  });
});

describe('reporting the logo', () => {
  it('reports the logo on screen, thanks the person in place, and leaves the row alone', async () => {
    const screen = await render(<ChangeLogoScreen />);

    await press(screen, 'Report this logo');

    await waitFor(() => expect(screen.getByText('Thanks. We’ll check this logo.')).toBeTruthy());
    expect(mockReport).toHaveBeenCalledTimes(1);
    expect(mockReport).toHaveBeenCalledWith({ domain: 'calmair.com', query: 'Calm' });
    expect(screen.queryByLabelText('Report this logo')).toBeNull();
    expect(mockSetLogo).not.toHaveBeenCalled();
    expect(router.back).not.toHaveBeenCalled();
  });

  it('says the one failure line when the report does not go, and lets the person try again', async () => {
    mockReport.mockResolvedValueOnce(false);
    const screen = await render(<ChangeLogoScreen />);

    await press(screen, 'Report this logo');

    await waitFor(() => expect(screen.getByText(FAILURE_MESSAGE)).toBeTruthy());
    expect(warn).toHaveBeenCalled();
    await press(screen, 'Report this logo');
    await waitFor(() => expect(screen.getByText('Thanks. We’ll check this logo.')).toBeTruthy());
    expect(mockReport).toHaveBeenCalledTimes(2);
  });
});

describe('when there is no row to change', () => {
  it('shows skeletons while the row loads', async () => {
    mockRead = { data: undefined, isError: false, isFetched: false, refetch: jest.fn() };
    const screen = await render(<ChangeLogoScreen />);

    expect(screen.getByText('loading')).toBeTruthy();
    expect(screen.queryByLabelText('Save logo')).toBeNull();
  });

  it('says the failure line with Try again when the row cannot be read', async () => {
    mockRead = { data: undefined, isError: true, isFetched: true, refetch: jest.fn() };
    const screen = await render(<ChangeLogoScreen />);

    expect(screen.getByText(FAILURE_MESSAGE)).toBeTruthy();
    await press(screen, 'Try again');
    expect(mockRead.refetch).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['the row is gone', () => opening('subscription', null)],
    ['the link names no kind', () => (mockParams = { id: 's1' })],
  ])('says the failure line and offers the way back when %s', async (_, arrange) => {
    arrange();
    const screen = await render(<ChangeLogoScreen />);

    expect(screen.getByText(FAILURE_MESSAGE)).toBeTruthy();
    // By its words: the header's back chevron carries the same label.
    await fireEvent.press(screen.getByText('Go back'));
    expect(router.back).toHaveBeenCalledTimes(1);
    expect(screen.queryByLabelText('Save logo')).toBeNull();
  });
});
