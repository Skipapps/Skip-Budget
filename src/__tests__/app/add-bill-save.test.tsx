import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';

import AddBillScreen from '@/app/add-bill';
import { warn } from '@/lib/haptics';
import { FAILURE_MESSAGE } from '@/lib/failure';

/**
 * Golden: exactly what the bill form's Save writes.
 *
 * Written against the form before its values code moved into
 * `src/api/entry-values.ts`, and kept unchanged through that move. It pins the
 * object handed to create/update, the four hint words and the step each one
 * sends the person to, the icon rule (only an Other bill keeps an icon of its
 * own), 'period', and `starts_on` through floorAfterCharges.
 *
 * The leaf inputs are stubs that record their props, so a test can type into
 * them; the chips are the real ones and are pressed by their labels. The
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

// Ten categories with the app's labels; the real module draws lucide glyphs.
jest.mock('@/data/bills-mock', () => ({
  BILL_CATEGORIES: [
    { id: 'housing', label: 'Housing' },
    { id: 'energy', label: 'Electricity & Gas' },
    { id: 'water', label: 'Water & Waste' },
    { id: 'internet', label: 'Internet' },
    { id: 'mobile', label: 'Mobile Phone' },
    { id: 'insurance', label: 'Insurance' },
    { id: 'loans', label: 'Loans & Credit' },
    { id: 'transport', label: 'Transportation' },
    { id: 'family', label: 'Family & Healthcare' },
    { id: 'other', label: 'Other bill' },
  ],
  BILL_ICON_CHOICES: [],
  RECURRENCES: [
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'quarterly', label: 'Every 3 months' },
    { value: 'yearly', label: 'Yearly' },
  ],
  getBillIcon: () => () => null,
}));

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
jest.mock('@/components/bills/category-picker', () => {
  const { Text } = require('react-native');
  return {
    CategoryPicker: (props: any) => {
      mockProps.category = props;
      return <Text>Category picker</Text>;
    },
  };
});
jest.mock('@/components/bills/icon-picker', () => ({
  IconPicker: (props: any) => {
    mockProps.icon = props;
    return null;
  },
}));
jest.mock('@/components/ui/source-tiles', () => ({
  SourceTiles: (props: any) => {
    mockProps.sources = props;
    return null;
  },
}));
jest.mock('@/components/ui/text-field', () => {
  const { Text } = require('react-native');
  return {
    TextField: (props: any) => {
      mockProps[`field:${props.label}`] = props;
      return <Text>{`${props.label} text field`}</Text>;
    },
  };
});
jest.mock('@/components/flow/inline-calendar', () => ({
  InlineCalendar: (props: any) => {
    mockProps.calendar = props;
    return null;
  },
}));
jest.mock('@/components/ui/select-field', () => ({
  SelectField: (props: any) => {
    mockProps[`select:${props.label}`] = props;
    return null;
  },
}));
jest.mock('@/components/ui/date-picker', () => ({
  DatePicker: (props: any) => {
    mockProps.datePicker = props;
    return null;
  },
}));
jest.mock('@/components/ui/reminder-field', () => ({ ReminderField: () => null }));
jest.mock('@/components/ui/calculator-pad', () => ({ CalculatorPad: () => null }));
jest.mock('@/components/calculators/schedule-card', () => ({ ScheduleCard: () => null }));

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

const mockCreate = jest.fn();
const mockUpdate = jest.fn();
jest.mock('@/api/mutations', () => ({
  useCreateBill: () => ({ mutateAsync: mockCreate, isPending: false }),
  useUpdateBill: () => ({ mutateAsync: mockUpdate, isPending: false }),
  useDeleteBill: () => ({ mutateAsync: jest.fn(), isPending: false }),
}));

let mockBill: { data: unknown; isError: boolean; isFetched: boolean };
jest.mock('@/api/queries', () => ({
  useBill: () => ({ ...mockBill, refetch: jest.fn() }),
  useLoanForBill: () => ({ data: null }),
  usePaymentSources: () => ({
    sources: [
      { id: 'card-1', label: 'VISA ••4421', color: '#111111', kind: 'card' },
      { id: 'acct-1', label: 'Checking ••0099', color: '#222222', kind: 'account' },
    ],
  }),
}));

const POWER = {
  id: 'bill-1',
  name: 'Power',
  amount: 84.2,
  category_id: 'energy',
  icon_id: null,
  recurrence: 'monthly',
  next_due_on: '2026-09-01',
  starts_on: '2026-01-01',
  ends_on: null,
  card_id: 'card-1',
  bank_account_id: null,
  note: null,
  brand_id: null,
  brands: null,
};

const COMCAST = {
  brandId: 'b-cc',
  name: 'Comcast',
  domain: 'comcast.com',
  // A spend category: a bill must never take it as its own.
  categoryId: 'utilities',
};

type Screen = Awaited<ReturnType<typeof render>>;

const press = (screen: Screen, label: string) => fireEvent.press(screen.getByText(label));

const set = (key: string, value: unknown) =>
  act(() => {
    const props = mockProps[key];
    (props.onChange ?? props.onChangeText ?? props.onSelect ?? props.onConfirm)(value);
  });

const editing = (bill: Record<string, unknown>) => {
  mockParams = { id: String(bill.id) };
  mockBill = { data: bill, isError: false, isFetched: true };
};

beforeEach(() => {
  jest.clearAllMocks();
  for (const key of Object.keys(mockProps)) delete mockProps[key];
  mockParams = {};
  mockBill = { data: null, isError: false, isFetched: false };
  mockPast.lastChargedOn = null;
  mockPast.ready = true;
  mockPast.choose.mockResolvedValue('upcoming');
  mockCreate.mockResolvedValue({ id: 'bill-new' });
  mockUpdate.mockResolvedValue(undefined);
});

describe('Add bill — what a new bill saves', () => {
  it('goes category, amount, details, date and writes the category label as the name', async () => {
    const screen = await render(<AddBillScreen />);

    await set('category', { id: 'housing', label: 'Housing' });
    await set('amount', '1100');
    await press(screen, 'Continue');
    expect(mockProps['field:Name'].value).toBe('Housing');
    await set('sources', 'acct-1');
    await press(screen, 'Continue');
    await set('calendar', new Date(2026, 10, 1));
    await press(screen, 'Save bill');

    await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));
    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockCreate).toHaveBeenCalledWith({
      name: 'Housing',
      amount: 1100,
      brand_id: null,
      category_id: 'housing',
      icon_id: null,
      recurrence: 'monthly',
      next_due_on: '2026-11-01',
      starts_on: '2026-11-01',
      ends_on: null,
      card_id: null,
      bank_account_id: 'acct-1',
      note: null,
    });
    expect(mockPast.choose).toHaveBeenCalledWith('Housing', false);
    expect(mockPast.apply).not.toHaveBeenCalled();
    expect(mockApplyReminder).toHaveBeenCalledWith('bill', 'bill-new', null, '09:00');
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(router.dismissTo).not.toHaveBeenCalled();
  });

  it("names the bill after its company and keeps the bill's own category", async () => {
    const screen = await render(<AddBillScreen />);

    await set('category', { id: 'internet', label: 'Internet' });
    await set('amount', '0.10');
    await press(screen, 'Continue');
    await set('brand:Company', COMCAST);
    await set('sources', 'card-1');
    await press(screen, 'Continue');
    await set('calendar', new Date(2026, 9, 15));
    await press(screen, 'Yearly');
    await press(screen, 'Save bill');

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate).toHaveBeenCalledWith({
      name: 'Comcast',
      amount: 0.1,
      brand_id: 'b-cc',
      category_id: 'internet',
      icon_id: null,
      recurrence: 'yearly',
      next_due_on: '2026-10-15',
      starts_on: '2026-10-15',
      ends_on: null,
      card_id: 'card-1',
      bank_account_id: null,
      note: null,
    });
  });

  it('keeps the icon an Other bill was given, and trims its name and note', async () => {
    const screen = await render(<AddBillScreen />);

    await set('category', { id: 'other', label: 'Other bill' });
    await set('amount', '15.99');
    await press(screen, 'Continue');
    expect(mockProps['field:Name'].value).toBe('');
    await set('field:Name', '  Gym  ');
    await set('icon', 'dumbbell');
    await set('field:Note', '  Off-peak  ');
    await press(screen, 'Continue');
    await set('calendar', new Date(2026, 9, 3));
    await press(screen, 'Weekly');
    await press(screen, 'Save bill');

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate).toHaveBeenCalledWith({
      name: 'Gym',
      amount: 15.99,
      brand_id: null,
      category_id: 'other',
      icon_id: 'dumbbell',
      recurrence: 'weekly',
      next_due_on: '2026-10-03',
      starts_on: '2026-10-03',
      ends_on: null,
      card_id: null,
      bank_account_id: null,
      note: 'Off-peak',
    });
  });

  it("saves the picker's own 'other' icon for an Other bill nobody changed", async () => {
    const screen = await render(<AddBillScreen />);

    await set('category', { id: 'other', label: 'Other bill' });
    await set('amount', '1030.5');
    await press(screen, 'Continue');
    await set('field:Name', 'Storage unit');
    await press(screen, 'Continue');
    await set('calendar', new Date(2026, 9, 20));
    await press(screen, 'Every 3 months');
    await press(screen, 'Save bill');

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate.mock.calls[0][0]).toMatchObject({
      name: 'Storage unit',
      amount: 1030.5,
      icon_id: 'other',
      recurrence: 'quarterly',
      starts_on: '2026-10-20',
    });
  });

  it("writes a specific period as 'period', starting on its own first day", async () => {
    const screen = await render(<AddBillScreen />);

    await set('category', { id: 'insurance', label: 'Insurance' });
    await set('amount', '0.10');
    await press(screen, 'Continue');
    await press(screen, 'Continue');
    await set('calendar', new Date(2026, 9, 5));
    await press(screen, 'Specific period');
    await act(() => mockProps['select:To'].onPress());
    await set('datePicker', new Date(2027, 2, 31));
    await press(screen, 'Save bill');

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate).toHaveBeenCalledWith({
      name: 'Insurance',
      amount: 0.1,
      brand_id: null,
      category_id: 'insurance',
      icon_id: null,
      recurrence: 'period',
      next_due_on: '2026-10-05',
      starts_on: '2026-10-05',
      ends_on: '2027-03-31',
      card_id: null,
      bank_account_id: null,
      note: null,
    });
  });
});

describe('Add bill — what an edit saves', () => {
  it('drops a stored icon from a bill that is not Other', async () => {
    editing({ ...POWER, category_id: 'housing', name: 'Rent', icon_id: 'other' });
    const screen = await render(<AddBillScreen />);

    await press(screen, 'Continue');
    await press(screen, 'Continue');
    await press(screen, 'Save changes');

    await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));
    expect(mockCreate).not.toHaveBeenCalled();
    expect(mockUpdate).toHaveBeenCalledWith({
      id: 'bill-1',
      values: {
        name: 'Rent',
        amount: 84.2,
        brand_id: null,
        category_id: 'housing',
        icon_id: null,
        recurrence: 'monthly',
        next_due_on: '2026-09-01',
        // The start follows the due date shown, with nothing charged to floor it.
        starts_on: '2026-09-01',
        ends_on: null,
        card_id: 'card-1',
        bank_account_id: null,
        note: null,
      },
    });
    expect(mockApplyReminder).toHaveBeenCalledWith('bill', 'bill-1', null, '09:00');
  });

  it('floors the start after the last charge when the due date moves inside a charged month', async () => {
    mockPast.lastChargedOn = '2026-09-01';
    editing(POWER);
    const screen = await render(<AddBillScreen />);

    await press(screen, 'Continue');
    await press(screen, 'Continue');
    await set('calendar', new Date(2026, 8, 15));
    await press(screen, 'Save changes');

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    expect(mockUpdate.mock.calls[0][0].values).toMatchObject({
      next_due_on: '2026-09-15',
      starts_on: '2026-10-01',
    });
  });

  it('keeps a start that is already past the floor', async () => {
    mockPast.lastChargedOn = '2026-09-01';
    editing(POWER);
    const screen = await render(<AddBillScreen />);

    await press(screen, 'Continue');
    await press(screen, 'Continue');
    await set('calendar', new Date(2026, 9, 20));
    await press(screen, 'Save changes');

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    expect(mockUpdate.mock.calls[0][0].values).toMatchObject({
      next_due_on: '2026-10-20',
      starts_on: '2026-10-20',
    });
  });

  it('never floors a set period, which keeps its own first day', async () => {
    mockPast.lastChargedOn = '2026-09-01';
    editing({
      ...POWER,
      recurrence: 'period',
      starts_on: '2026-06-01',
      next_due_on: '2026-10-01',
      ends_on: '2026-12-31',
    });
    const screen = await render(<AddBillScreen />);

    await press(screen, 'Continue');
    await press(screen, 'Continue');
    await press(screen, 'Save changes');

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    expect(mockUpdate.mock.calls[0][0].values).toMatchObject({
      recurrence: 'period',
      next_due_on: '2026-06-01',
      starts_on: '2026-06-01',
      ends_on: '2026-12-31',
    });
  });

  it('drops the end date when a period bill becomes monthly', async () => {
    editing({
      ...POWER,
      recurrence: 'period',
      starts_on: '2026-06-01',
      next_due_on: '2026-10-01',
      ends_on: '2026-12-31',
    });
    const screen = await render(<AddBillScreen />);

    await press(screen, 'Continue');
    await press(screen, 'Continue');
    await press(screen, 'Monthly');
    await press(screen, 'Save changes');

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    expect(mockUpdate.mock.calls[0][0].values).toMatchObject({
      recurrence: 'monthly',
      next_due_on: '2026-06-01',
      starts_on: '2026-06-01',
      ends_on: null,
    });
  });

  it('keeps an end date a repeating bill already had', async () => {
    editing({ ...POWER, ends_on: '2027-01-31' });
    const screen = await render(<AddBillScreen />);

    await press(screen, 'Continue');
    await press(screen, 'Continue');
    await press(screen, 'Save changes');

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    expect(mockUpdate.mock.calls[0][0].values).toMatchObject({
      recurrence: 'monthly',
      ends_on: '2027-01-31',
    });
  });

  it('asks about past charges with what changed, and rewrites them with the new figures', async () => {
    mockPast.choose.mockResolvedValue('all');
    editing(POWER);
    const screen = await render(<AddBillScreen />);

    await set('amount', '1030.5');
    await press(screen, 'Continue');
    await set('sources', 'acct-1');
    await press(screen, 'Continue');
    await press(screen, 'Save changes');

    await waitFor(() => expect(router.back).toHaveBeenCalledTimes(1));
    expect(mockPast.choose).toHaveBeenCalledWith('Power', true);
    expect(mockPast.apply).toHaveBeenCalledWith({
      label: 'Power',
      amount: 1030.5,
      card_id: null,
      bank_account_id: 'acct-1',
    });
  });

  it('says nothing changed when nothing did', async () => {
    editing(POWER);
    const screen = await render(<AddBillScreen />);

    await press(screen, 'Continue');
    await press(screen, 'Continue');
    await press(screen, 'Save changes');

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    expect(mockPast.choose).toHaveBeenCalledWith('Power', false);
  });
});

describe('Add bill — the checks inside Save', () => {
  it('asks for a name, then the amount, then the date, each on its own step', async () => {
    const screen = await render(<AddBillScreen />);

    await set('category', { id: 'other', label: 'Other bill' });
    await press(screen, 'Continue');
    await press(screen, 'Continue');
    await press(screen, 'Save bill');

    expect(screen.getByText('Give the bill a name.')).toBeTruthy();
    expect(screen.getByText('Name text field')).toBeTruthy();
    expect(screen.queryByText('How much is the bill?')).toBeNull();
    expect(warn).toHaveBeenCalled();

    await set('field:Name', 'Gym');
    await press(screen, 'Continue');
    await press(screen, 'Save bill');
    expect(screen.getByText('Enter how much it costs.')).toBeTruthy();
    expect(screen.getByText('How much is the bill?')).toBeTruthy();

    await set('amount', '0');
    await press(screen, 'Continue');
    await press(screen, 'Continue');
    await press(screen, 'Save bill');
    expect(screen.getByText('Enter how much it costs.')).toBeTruthy();
    expect(screen.getByText('How much is the bill?')).toBeTruthy();

    await set('amount', '25');
    await press(screen, 'Continue');
    await press(screen, 'Continue');
    await press(screen, 'Save bill');
    expect(screen.getByText('Pick the first due date.')).toBeTruthy();
    expect(screen.getByText('When is it due?')).toBeTruthy();

    await press(screen, 'Specific period');
    await press(screen, 'Save bill');
    expect(screen.getByText('Pick the date it starts.')).toBeTruthy();
    expect(screen.getByText('When does it start?')).toBeTruthy();

    expect(mockCreate).not.toHaveBeenCalled();
    expect(mockPast.choose).not.toHaveBeenCalled();
  });

  it('refuses a period that ends before it starts', async () => {
    editing({
      ...POWER,
      recurrence: 'period',
      starts_on: '2026-10-10',
      next_due_on: '2026-10-10',
      ends_on: '2026-10-01',
    });
    const screen = await render(<AddBillScreen />);

    await press(screen, 'Continue');
    await press(screen, 'Continue');
    await press(screen, 'Save changes');

    expect(screen.getByText('The end date cannot be before the start date.')).toBeTruthy();
    expect(screen.getByText('When does it start?')).toBeTruthy();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('says the one failure line and writes nothing while past charges cannot be read', async () => {
    mockPast.ready = false;
    editing(POWER);
    const screen = await render(<AddBillScreen />);

    await press(screen, 'Continue');
    await press(screen, 'Continue');
    await press(screen, 'Save changes');

    await waitFor(() => expect(screen.getByText(FAILURE_MESSAGE)).toBeTruthy());
    expect(mockPast.retry).toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(router.back).not.toHaveBeenCalled();
  });
});
