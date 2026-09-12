import { fireEvent, render } from '@testing-library/react-native';

import { QuickActions } from '@/components/dashboard/quick-actions';

// jest.mock calls are hoisted above these imports by babel-plugin-jest-hoist,
// so the ordering here is for readability, not execution.
jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));

jest.mock('@/providers/theme-provider', () => ({
  useColors: () => ({ accentInk: '#0000FF' }),
}));

// Mirrors home.tsx's own wiring: `<QuickActions onPress={(href) => router.push(href)} />`.
const EXPECTED: { label: string; hint: string; href: string }[] = [
  { label: 'Receipt', hint: 'Add a receipt', href: '/add-receipt' },
  { label: 'Bill', hint: 'Add a bill', href: '/add-bill' },
  { label: 'Subscription', hint: 'Add a subscription', href: '/add-subscription' },
  { label: 'Salary', hint: 'Your salary and where it lands', href: '/salary' },
];

describe('QuickActions', () => {
  it('renders exactly the four logging shortcuts', async () => {
    const { getAllByRole } = await render(<QuickActions onPress={() => {}} />);
    expect(getAllByRole('button')).toHaveLength(4);
  });

  it.each(EXPECTED)('routes "$label" to $href', async ({ label, hint, href }) => {
    const onPress = jest.fn();
    const { getByText, getByLabelText } = await render(<QuickActions onPress={onPress} />);

    expect(getByText(label)).toBeTruthy();
    await fireEvent.press(getByLabelText(hint));

    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onPress).toHaveBeenCalledWith(href);
  });
});
