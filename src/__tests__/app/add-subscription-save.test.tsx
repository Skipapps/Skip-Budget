import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';

import AddSubscriptionScreen from '@/app/add-subscription';
import { warn } from '@/lib/haptics';

/**
 * Golden: exactly what the subscription form's Save writes.
 *
 * Written against the form before its values code moved into
 * `src/api/entry-values.ts`, and kept unchanged through that move. It pins the
 * object handed to create/update, the two hint words and their steps, and
 * `started_on` through countFromAfterPick and floorAfterCharges.
 *
 * The leaf inputs are stubs that record their props; the chips are real. The
 * primary button stub accepts a press even while disabled, which is the only
 * way to reach the checks inside Save.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
const mockProps: Record<string, any> = {};

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));
jest.mock('react-native-keyboard-controller', () =>
  jest.requireActual('react-native-keyboard-controller/jest'),
);
jest.mock('@/components/ui/skeleton', () => ({ Skeleton: () => null }));
jest.mock('@/lib/haptics', () => ({ success: jest.fn(), warn: jest.fn(), selection: jest.fn() }));

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
      mockProps[`brand:${props.label}`] = props;
      return <Text>{`${props.label} field`}</Text>;
    },
  };
});
jest.mock('@/components/ui/source-tiles', () => ({
  SourceTiles: (props: any) => {
    mockProps.sources = props;
    return null;
  },
}));
jest.mock('@/components/ui/text-field', () => ({
  TextField: (props: any) => {
    mockProps[`field:${props.label}`] = props;
    return null;
  },
}));
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
jest.mock('@/providers/dialog-provider', () => ({ useConfirm: () => async () => true }));

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

const mockPast = {
  lastChargedOn: null as string | null,
  ready: true,
  saving: false,
  choose: jest.fn(async () => 'upcoming' as 'upcoming' | 'all' | null),
  apply: jest.fn(async () => {}),
  retry: jest.fn(),
};
jest.mock('@/api/past-charges', () => ({ usePastCharges: () => mockPast }));

const mockApplyReminder = jest.fn(async () => {});
jest.mock('@/api/reminders', () => ({
  choiceToLead: (choice: string) => (choice === 'off' ? null : 3),
  useApplyReminder: () => mockApplyReminder,
  useReminderChoice: () => ({ choice: 'off', remindAt: '09:00' }),
}));

jest.mock('@/api/brands', () => ({ useSpendCategories: () => ({ data: [] }) }));

const mockCreate = jest.fn();
const mockUpdate = jest.fn();
jest.mock('@/api/mutations', () => ({
  useCreateSubscription: () => ({ mutateAsync: mockCreate, isPending: false }),
  useUpdateSubscription: () => ({ mutateAsync: mockUpdate, isPending: false }),
  useDeleteSubscription: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));

let mockSubscription: { data: unknown; isError: boolean; isFetched: boolean };
jest.mock('@/api/queries', () => ({
  useSubscription: () => ({ ...mockSubscription, refetch: jest.fn() }),
  usePaymentSources: () => ({
    sources: [
      { id: 'card-1', label: 'VISA ••4421', color: '#111111', kind: 'card' },
      { id: 'acct-1', label: 'Checking ••0099', color: '#222222', kind: 'account' },
    ],
  }),
}));

const NETFLIX = {
  brandId: 'b-nf',
  name: 'Netflix',
  domain: 'netflix.com',
  categoryId: 'entertainment',
};

const SPOTIFY = {
  id: 'sub-1',
  started_on: '2026-08-10',
  created_at: '2026-08-12T10:00:00+00:00',
  brand_id: 'b-sp',
  name: 'Spotify',
  amount: 11.99,
  cycle: 'monthly',
  next_renewal_on: '2026-10-10',
  category_id: 'entertainment',
  card_id: null,
  bank_account_id: 'acct-1',
  note: 'Family plan',
  active: true,
  brands: { domain: 'spotify.com' },
};

type Screen = Awaited<ReturnType<typeof render>>;

const press = (screen: Screen, label: string) => fireEvent.press(screen.getByText(label));

const set = (key: string, value: unknown) =>
  act(() => {
    const props = mockProps[key];
    (props.onChange ?? props.onChangeText)(value);
  });

const editing = (row: Record<string, unknown>) => {
  mockParams = { id: String(row.id) };
  mockSubscription = { data: row, isError: false, isFetched: true };
};

/** Through both steps untouched, to the date step. */
const toDateStep = async (screen: Screen) => {
  await press(screen, 'Continue');
  await press(screen, 'Continue');
};

beforeEach(() => {
  jest.clearAllMocks();
  for (const key of Object.keys(mockProps)) delete mockProps[key];
  mockParams = {};
  mockSubscription = { data: null, isError: false, isFetched: false };
  mockPast.lastChargedOn = null;
  mockPast.ready = true;
  mockPast.choose.mockResolvedValue('upcoming');
  mockCreate.mockResolvedValue({ id: 'sub-new' });
  mockUpdate.mockResolvedValue(undefined);
});

describe('Add subscription — what a new subscription saves', () => {
  it('saves without a renewal date, counting from nothing', async () => {
    const screen = await render(<AddSubscriptionScreen />);

    await set('amount', '15.99');
    await press(screen, 'Continue');
    await set('brand:Service', NETFLIX);
    await set('sources', 'card-1');
    await press(screen, 'Continue');
    await press(screen, 'Save subscription');

    await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));
    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockCreate).toHaveBeenCalledWith({
      brand_id: 'b-nf',
      name: 'Netflix',
      amount: 15.99,
      cycle: 'monthly',
      next_renewal_on: null,
      started_on: null,
      category_id: 'entertainment',
      card_id: 'card-1',
      bank_account_id: null,
      note: null,
      active: true,
    });
    expect(mockPast.choose).toHaveBeenCalledWith('Netflix', false);
    expect(mockPast.apply).not.toHaveBeenCalled();
    expect(mockApplyReminder).toHaveBeenCalledWith('subscription', 'sub-new', null, '09:00');
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(router.dismissTo).not.toHaveBeenCalled();
  });

  it('counts from the renewal picked, on the cycle picked, with Other for no category', async () => {
    const screen = await render(<AddSubscriptionScreen />);

    await set('amount', '1100');
    await press(screen, 'Continue');
    await set('brand:Service', {
      brandId: null,
      name: 'Gym membership',
      domain: null,
      categoryId: '',
    });
    await set('sources', 'acct-1');
    await set('field:Note', '  Annual plan ');
    await press(screen, 'Continue');
    await set('calendar', new Date(2026, 9, 12));
    await press(screen, 'Yearly');
    await press(screen, 'Save subscription');

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate).toHaveBeenCalledWith({
      brand_id: null,
      name: 'Gym membership',
      amount: 1100,
      cycle: 'yearly',
      next_renewal_on: '2026-10-12',
      started_on: '2026-10-12',
      category_id: 'other',
      card_id: null,
      bank_account_id: 'acct-1',
      note: 'Annual plan',
      active: true,
    });
  });

  it.each([
    ['0.10', 0.1],
    ['1030.5', 1030.5],
  ])('saves a typed %s as exactly %p dollars', async (typed, saved) => {
    const screen = await render(<AddSubscriptionScreen />);
    await set('amount', typed);
    await press(screen, 'Continue');
    await set('brand:Service', NETFLIX);
    await press(screen, 'Continue');
    await press(screen, 'Save subscription');
    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate.mock.calls[0][0].amount).toBe(saved);
  });
});

describe('Add subscription — what an edit saves', () => {
  it('writes the row back as it was', async () => {
    editing(SPOTIFY);
    const screen = await render(<AddSubscriptionScreen />);

    await toDateStep(screen);
    await press(screen, 'Save changes');

    await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));
    expect(mockCreate).not.toHaveBeenCalled();
    expect(mockUpdate).toHaveBeenCalledWith({
      id: 'sub-1',
      values: {
        brand_id: 'b-sp',
        name: 'Spotify',
        amount: 11.99,
        cycle: 'monthly',
        next_renewal_on: '2026-10-10',
        started_on: '2026-08-10',
        category_id: 'entertainment',
        card_id: null,
        bank_account_id: 'acct-1',
        note: 'Family plan',
        active: true,
      },
    });
    expect(mockPast.choose).toHaveBeenCalledWith('Spotify', false);
    expect(mockApplyReminder).toHaveBeenCalledWith('subscription', 'sub-1', null, '09:00');
  });

  it('moves the start earlier when an earlier renewal is picked', async () => {
    editing(SPOTIFY);
    const screen = await render(<AddSubscriptionScreen />);

    await toDateStep(screen);
    await set('calendar', new Date(2026, 6, 10));
    await press(screen, 'Save changes');

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    expect(mockUpdate.mock.calls[0][0].values).toMatchObject({
      next_renewal_on: '2026-07-10',
      started_on: '2026-07-10',
    });
  });

  it('never moves the start later when a later renewal is picked', async () => {
    editing(SPOTIFY);
    const screen = await render(<AddSubscriptionScreen />);

    await toDateStep(screen);
    await set('calendar', new Date(2026, 10, 10));
    await press(screen, 'Save changes');

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    expect(mockUpdate.mock.calls[0][0].values).toMatchObject({
      next_renewal_on: '2026-11-10',
      started_on: '2026-08-10',
    });
  });

  it('counts from the day the row was made when it has no start of its own', async () => {
    editing({ ...SPOTIFY, started_on: null });
    const screen = await render(<AddSubscriptionScreen />);

    await toDateStep(screen);
    await press(screen, 'Save changes');

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    expect(mockUpdate.mock.calls[0][0].values).toMatchObject({
      next_renewal_on: '2026-10-10',
      started_on: '2026-08-12',
    });
  });

  it('floors the start after the last renewal already recorded', async () => {
    mockPast.lastChargedOn = '2026-09-10';
    editing(SPOTIFY);
    const screen = await render(<AddSubscriptionScreen />);

    await toDateStep(screen);
    await press(screen, 'Save changes');

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    expect(mockUpdate.mock.calls[0][0].values).toMatchObject({
      cycle: 'monthly',
      next_renewal_on: '2026-10-10',
      started_on: '2026-10-01',
    });
  });

  it('keeps the start it counts from when the renewal date is cleared', async () => {
    editing({ ...SPOTIFY, next_renewal_on: null });
    const screen = await render(<AddSubscriptionScreen />);

    await toDateStep(screen);
    await press(screen, 'Save changes');

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    expect(mockUpdate.mock.calls[0][0].values).toMatchObject({
      next_renewal_on: null,
      started_on: '2026-08-10',
    });
  });

  it('cancels, moves the card and drops the note', async () => {
    editing(SPOTIFY);
    const screen = await render(<AddSubscriptionScreen />);

    await press(screen, 'Continue');
    await press(screen, 'Cancelled');
    await set('sources', 'card-1');
    await set('field:Note', ' ');
    await press(screen, 'Continue');
    await press(screen, 'Save changes');

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    expect(mockUpdate.mock.calls[0][0].values).toMatchObject({
      active: false,
      card_id: 'card-1',
      bank_account_id: null,
      note: null,
    });
  });

  it('rewrites past renewals with the new figures when asked to', async () => {
    mockPast.choose.mockResolvedValue('all');
    editing(SPOTIFY);
    const screen = await render(<AddSubscriptionScreen />);

    await set('amount', '15.99');
    await toDateStep(screen);
    await press(screen, 'Save changes');

    await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));
    expect(mockPast.choose).toHaveBeenCalledWith('Spotify', true);
    expect(mockPast.apply).toHaveBeenCalledWith({
      label: 'Spotify',
      amount: 15.99,
      card_id: null,
      bank_account_id: 'acct-1',
    });
  });
});

describe('Add subscription — the checks inside Save', () => {
  it('asks for the service first, on the service step, then the amount on the amount step', async () => {
    const screen = await render(<AddSubscriptionScreen />);

    await toDateStep(screen);
    await press(screen, 'Save subscription');

    expect(screen.getByText('Pick a service first.')).toBeTruthy();
    expect(screen.getByText('Service field')).toBeTruthy();
    expect(screen.queryByText('How much does it cost?')).toBeNull();
    expect(warn).toHaveBeenCalled();

    await set('brand:Service', NETFLIX);
    await press(screen, 'Continue');
    await press(screen, 'Save subscription');
    expect(screen.getByText('Enter what it costs.')).toBeTruthy();
    expect(screen.getByText('How much does it cost?')).toBeTruthy();

    await set('amount', '0');
    await toDateStep(screen);
    await press(screen, 'Save subscription');
    expect(screen.getByText('Enter what it costs.')).toBeTruthy();

    expect(mockCreate).not.toHaveBeenCalled();
    expect(mockPast.choose).not.toHaveBeenCalled();
  });
});
